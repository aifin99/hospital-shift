(function () {
  'use strict';
  // 画面はデータも名前も持たない入れ物。データは config.js の apiUrl（GAS の /exec）から読む。
  var API_URL = String((window.SHIFT_CONFIG && window.SHIFT_CONFIG.apiUrl) || '');
  var KEY_STORE = 'shift_edit_key';
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  var DAY_CHARS = ['日', '月', '火', '水', '木', '金', '土', '祝'];
  var POLL_MS = 5000;
  var POLL_LIMIT_MS = (window.SHIFT_CONFIG && window.SHIFT_CONFIG.pollLimitMs) || 10 * 60 * 1000;
  var LOCK_SVG = '<svg class="lock" viewBox="0 0 16 16" aria-label="固定" role="img"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/></svg>';

  var state = {
    ym: null,
    month: null,       // getMonth の結果
    key: loadKey(),
    view: 'calendar',
    openDate: null,    // 日のシートで開いている日
    picking: null,     // 'duty' / 'standby'（選び直しの一覧を開いている枠）
    reqNo: 0,
    polling: null,
    pdfUrl: null,
    doctors: [],
    editingDoc: null,
    openRow: null      // 集計表で理由を開いている行
  };

  // ---- 小さな道具 ----
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function setMsg(node, text, kind) {
    node.textContent = text || '';
    node.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function loadKey() { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } }
  function saveKey(k) {
    state.key = k || '';
    try { if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) { /* 保存できない端末 */ }
  }
  function editing() { return !!(state.month && state.month.editing); }
  function addMonth(ym, n) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + ('0' + (m + 1)).slice(-2);
  }
  function todayJst() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function shortDate(date) { return Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10)); }
  function dayTitle(day) { return Number(day.date.slice(5, 7)) + '月' + Number(day.date.slice(8, 10)) + '日（' + WEEK[day.dow] + '）'; }
  function first3(s) { return Array.from(String(s || '')).slice(0, 3).join(''); }

  /**
   * GAS の API を呼ぶ。本文 { api, args, key } の JSON を text/plain で送る（preflight を出さない）。鍵は URL に付けない。
   * 鍵が違う（auth:false）と返ってきたら、鍵を捨てて見るだけの画面に戻す。
   */
  function call(api, args, onOk, onErr) {
    if (!API_URL) { onErr('API の URL が設定されていません（config.js）'); return; }
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ api: api, args: args || [], key: state.key || '' }),
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error('通信に失敗しました（' + res.status + '）');
      return res.json();
    }).then(function (data) {
      if (data && data.auth === false) {
        saveKey('');
        if (state.month) state.month.editing = false;
        applyMode();
        openLogin('合言葉を入れ直してください');
        onErr(data.reason || '合言葉を入れ直してください', data);
        return;
      }
      onOk(data);
    }, function (err) {
      onErr((err && err.message) || String(err), null, true);
    });
  }

  // ---- メニューと画面の切替 ----
  function setMenuOpen(open) {
    $('menu').hidden = !open;
    $('menu-btn').setAttribute('aria-expanded', String(open));
  }
  $('menu-btn').addEventListener('click', function (ev) { ev.stopPropagation(); setMenuOpen($('menu').hidden); });
  document.addEventListener('click', function (ev) {
    if (!$('menu').hidden && !$('menu').contains(ev.target)) setMenuOpen(false);
  });
  $('m-login').addEventListener('click', function () { setMenuOpen(false); openLogin(''); });
  $('m-calendar').addEventListener('click', function () { setMenuOpen(false); location.hash = '#calendar'; });
  $('m-master').addEventListener('click', function () { setMenuOpen(false); location.hash = '#master'; });
  $('m-logout').addEventListener('click', function () {
    setMenuOpen(false);
    var k = state.key;
    call('logout', [], function () {}, function () {});
    if (k) saveKey('');
    if (state.month) state.month.editing = false;
    location.hash = '#calendar';
    loadMonth(state.ym);
  });

  function applyMode() {
    var ed = editing();
    $('edit-badge').hidden = !ed;
    $('m-login').hidden = ed;
    $('m-calendar').hidden = !ed;
    $('m-master').hidden = !ed;
    $('m-logout').hidden = !ed;
    $('m-calendar').classList.toggle('active', state.view === 'calendar');
    $('m-master').classList.toggle('active', state.view === 'master');
    if (state.month && !ed && state.view === 'master') { state.view = 'calendar'; showView(); }
  }
  function route() {
    var v = location.hash === '#master' ? 'master' : 'calendar';
    if (v === 'master' && !state.key) v = 'calendar';
    state.view = v;
    showView();
    if (v === 'master') loadDoctors();
  }
  function showView() {
    $('view-calendar').hidden = state.view !== 'calendar';
    $('view-master').hidden = state.view !== 'master';
    applyMode();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ---- 合言葉 ----
  function openLogin(msg) {
    $('login-back').hidden = false;
    $('login-box').hidden = false;
    $('login-pass').value = '';
    setMsg($('login-msg'), msg || '', msg ? 'err' : '');
    setTimeout(function () { $('login-pass').focus(); }, 50);
  }
  function closeLogin() {
    $('login-back').hidden = true;
    $('login-box').hidden = true;
    $('login-pass').value = '';
  }
  $('login-cancel').addEventListener('click', closeLogin);
  $('login-back').addEventListener('click', closeLogin);
  $('login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pass = $('login-pass').value;
    if (!pass) { setMsg($('login-msg'), '合言葉を入れてください', 'err'); return; }
    $('login-ok').disabled = true;
    setMsg($('login-msg'), '確かめています…');
    call('login', [pass], function (res) {
      $('login-ok').disabled = false;
      if (!res.ok) { setMsg($('login-msg'), res.reason || '入れませんでした', 'err'); return; }
      saveKey(res.key);
      closeLogin();
      loadMonth(state.ym);
    }, function (msg) {
      $('login-ok').disabled = false;
      setMsg($('login-msg'), msg, 'err');
    });
  });

  // ---- 月 ----
  $('prev').addEventListener('click', function () { loadMonth(addMonth(state.ym, -1)); });
  $('next').addEventListener('click', function () { loadMonth(addMonth(state.ym, 1)); });

  function loadMonth(ym) {
    state.ym = ym;
    var no = ++state.reqNo;
    stopPolling();
    hidePdf();
    $('cal-label').textContent = labelOf(ym);
    setMsg($('cal-msg'), '読み込み中…');
    call('getMonth', [ym], function (res) {
      if (no !== state.reqNo) return;
      if (!res.ok) { setMsg($('cal-msg'), res.reason || '読み込めませんでした', 'err'); return; }
      if (res.keyRejected) saveKey('');
      setMsg($('cal-msg'), '');
      setMonth(res);
      if (res.editing && res.generation && res.generation.state === '作成中') startPolling(ym);
      if (res.editing && res.generation && res.generation.state === '失敗') {
        setMsg($('cal-msg'), '前回の作成は失敗しました。もう一度お試しください', 'err');
      }
    }, function (msg) {
      if (no !== state.reqNo) return;
      setMsg($('cal-msg'), msg, 'err');
    });
  }
  function labelOf(ym) {
    return '令和' + (Number(ym.slice(0, 4)) - 2018) + '年' + Number(ym.slice(5, 7)) + '月';
  }
  function setMonth(res) {
    state.month = res;
    $('cal-title').textContent = res.title || '産婦人科当直表';
    $('cal-label').textContent = res.label;
    applyMode();
    renderGrid();
    renderResult();
    renderChecks();
    renderSummary();
    if (state.openDate && state.openDate.slice(0, 7) === res.ym) renderDay(); else closeDay();
  }

  function dayOf(date) {
    var days = state.month ? state.month.days : [];
    for (var i = 0; i < days.length; i++) if (days[i].date === date) return days[i];
    return null;
  }

  function renderGrid() {
    var m = state.month;
    var body = $('grid-body');
    body.innerHTML = '';
    var first = m.days[0].dow;
    var n = m.days.length;
    var weeks = Math.ceil((first + n) / 7);
    var y = Number(m.ym.slice(0, 4)), mo = Number(m.ym.slice(5, 7));
    var today = m.today || todayJst();
    for (var w = 0; w < weeks; w++) {
      var tr = el('tr');
      for (var c = 0; c < 7; c++) {
        var idx = w * 7 + c - first;
        var td = el('td');
        if (idx < 0 || idx >= n) {
          var dt = new Date(y, mo - 1, idx + 1);
          td.className = 'out';
          var b = el('div', 'cell out');
          b.appendChild(el('span', 'd', (dt.getMonth() + 1) + '/' + dt.getDate()));
          td.appendChild(b);
        } else {
          var day = m.days[idx];
          var cls = [];
          if (day.holiday) cls.push('hol'); else if (day.dow === 0) cls.push('sun'); else if (day.dow === 6) cls.push('sat');
          if (day.date === today) cls.push('today');
          var bad = editing() && day.issues && (day.issues.duty.length || day.issues.standby.length);
          if (bad) cls.push('bad');
          td.className = cls.join(' ');
          var btn = el('button', 'cell');
          btn.type = 'button';
          btn.setAttribute('data-date', day.date);
          btn.setAttribute('aria-label', dayTitle(day) + ' 当直 ' + (day.duty || 'なし') + ' 待機 ' + (day.standby || 'なし'));
          btn.appendChild(el('span', 'd', String(Number(day.date.slice(8, 10)))));
          if (day.holiday) btn.appendChild(el('span', 'hol', '祝'));
          btn.appendChild(el('span', 'duty', day.dutySub ? '(代)' : first3(day.duty)));
          btn.appendChild(el('span', 'standby', first3(day.standby)));
          var marks = el('span', 'marks');
          if (day.memo) marks.appendChild(el('span', 'memo', '●'));
          if (editing() && (day.dutyFixed || day.standbyFixed)) {
            var lk = el('span');
            lk.innerHTML = LOCK_SVG;
            marks.appendChild(lk);
          }
          if (bad) marks.appendChild(el('span', 'x', '✕'));
          btn.appendChild(marks);
          btn.addEventListener('click', onCellClick);
          td.appendChild(btn);
        }
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }
  function onCellClick(ev) { openDay(ev.currentTarget.getAttribute('data-date')); }

  function renderResult() {
    var m = state.month;
    var line = $('result-line');
    var ai = $('ai-btn');
    if (!editing() || !m.result) { line.hidden = true; ai.hidden = true; return; }
    line.hidden = false;
    line.innerHTML = '';
    var r = m.result;
    var v = el('span', r.violations ? 'bad' : '', '必須ルール違反 ' + r.violations + '件');
    var w = el('span', r.warnings ? 'warn' : '', '注意 ' + r.warnings + '件');
    var sub = el('span', r.subCount > r.subMax ? 'bad' : '', '代務医 ' + r.subCount + '回（上限' + r.subMax + '）');
    var mi = el('span', r.missingDays ? 'bad' : '', '未入力 ' + (r.missingDays || 0) + '日');
    line.appendChild(v); line.appendChild(document.createTextNode('／'));
    line.appendChild(mi); line.appendChild(document.createTextNode('／'));
    line.appendChild(w); line.appendChild(document.createTextNode('／'));
    line.appendChild(sub);
    ai.hidden = false;
    var hasAny = m.days.some(function (d) { return d.dutyCode || d.standbyCode; });
    ai.textContent = hasAny ? 'シフトを作り直す' : 'シフトを作る'; // 設計書 v5 N10（動きは AI で素案を作る）
  }

  function renderChecks() {
    var m = state.month;
    var box = $('checks');
    if (!editing()) { box.hidden = true; return; }
    box.hidden = false;
    var body = $('checks-body');
    body.innerHTML = '';
    var missing = m.missing || [];
    if (!m.violations.length && !m.warnings.length && !missing.length) {
      body.appendChild(el('p', 'none', '必須ルール違反・未入力・注意はありません'));
    }
    if (missing.length) {
      body.appendChild(el('h3', null, '未入力（' + missing.length + '日）'));
      var mp = el('p', 'missing-days', missing.map(function (x) {
        return shortDate(x.date) + (x.slots.length === 2 ? '' : '（' + x.slots.join('・') + '）');
      }).join('、'));
      body.appendChild(mp);
    }
    if (m.violations.length) {
      body.appendChild(el('h3', null, '必須ルール違反（' + m.violations.length + '件）'));
      var ul = el('ul');
      m.violations.forEach(function (v) {
        var li = el('li');
        var b = el('button', 'item v', (v.date ? shortDate(v.date) + ' ' : '') + '✕ ' + v.text);
        b.type = 'button';
        if (v.date) b.addEventListener('click', function () { openDay(v.date); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    if (m.warnings.length) {
      body.appendChild(el('h3', null, '注意（' + m.warnings.length + '件）'));
      var ul2 = el('ul');
      m.warnings.forEach(function (w) {
        var li = el('li');
        li.appendChild(el('div', 'item w', '△ ' + w.text + '：' + w.names.join('・')));
        ul2.appendChild(li);
      });
      body.appendChild(ul2);
    }
    if (m.generation && m.generation.comment) {
      body.appendChild(el('h3', null, 'AI のコメント（' + m.generation.at + '）'));
      body.appendChild(el('div', 'comment', m.generation.comment));
    }
  }

  function renderSummary() {
    var m = state.month;
    var t = $('summary');
    t.innerHTML = '';
    var ed = editing();
    var cg = el('colgroup');
    cg.appendChild(el('col', 'c-name'));
    for (var i = 0; i < 6; i++) cg.appendChild(el('col'));
    if (ed) { var cm = el('col'); cm.style.width = '9%'; cg.appendChild(cm); }
    t.appendChild(cg);
    var thead = el('thead');
    var h1 = el('tr');
    var th = el('th', null, '担当医'); th.rowSpan = 2; h1.appendChild(th);
    var a = el('th', null, '当直'); a.colSpan = 3; h1.appendChild(a);
    var b = el('th', null, '待機'); b.colSpan = 3; h1.appendChild(b);
    if (ed) { var c = el('th', null, '条件'); c.rowSpan = 2; h1.appendChild(c); }
    var h2 = el('tr');
    ['土日祝', '平日', '計', '土日祝', '平日', '計'].forEach(function (s) { h2.appendChild(el('th', null, s)); });
    thead.appendChild(h1); thead.appendChild(h2);
    t.appendChild(thead);
    var tb = el('tbody');
    m.summary.rows.forEach(function (r, i) {
      var tr = el('tr');
      tr.appendChild(el('td', 'name', r.name + (ed && r.excluded ? '（対象外）' : '')));
      [r.duty.weekend, r.duty.weekday, r.duty.total, r.standby.weekend, r.standby.weekday, r.standby.total].forEach(function (n) {
        tr.appendChild(el('td', 'num', String(n)));
      });
      if (ed) {
        var cls = r.mark === '✕' ? 'mk-x' : r.mark === '△' ? 'mk-w' : r.mark === '○' ? 'mk-o' : '';
        tr.appendChild(el('td', cls, r.mark));
        if (r.reasons && r.reasons.length) {
          tr.className = 'row-btn';
          tr.setAttribute('role', 'button');
          tr.tabIndex = 0;
          tr.setAttribute('aria-expanded', String(state.openRow === r.code));
          var toggle = function () { state.openRow = state.openRow === r.code ? null : r.code; renderSummary(); };
          tr.addEventListener('click', toggle);
          tr.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
        }
      }
      tb.appendChild(tr);
      if (ed && state.openRow === r.code && r.reasons && r.reasons.length) {
        var rr = el('tr', 'reasons');
        var td = el('td'); td.colSpan = 8;
        r.reasons.forEach(function (s) { td.appendChild(el('div', null, s)); });
        rr.appendChild(td);
        tb.appendChild(rr);
      }
    });
    var tot = el('tr', 'total');
    tot.appendChild(el('td', 'name', '合計'));
    var days = m.summary.days;
    ['', '', m.summary.total.duty, '', '', m.summary.total.standby].forEach(function (n, i) {
      var td = el('td', 'num', String(n));
      if ((i === 2 || i === 5) && Number(n) !== days) td.className += ' mismatch';
      tot.appendChild(td);
    });
    if (ed) tot.appendChild(el('td'));
    tb.appendChild(tot);
    t.appendChild(tb);
  }

  // ---- 日を押したとき ----
  function openDay(date) {
    state.openDate = date;
    state.picking = null;
    $('day-back').hidden = false;
    $('day-sheet').hidden = false;
    renderDay();
  }
  function closeDay() {
    state.openDate = null;
    state.picking = null;
    $('day-back').hidden = true;
    $('day-sheet').hidden = true;
  }
  $('day-close').addEventListener('click', closeDay);
  $('day-back').addEventListener('click', closeDay);

  function renderDay() {
    var day = dayOf(state.openDate);
    if (!day) { closeDay(); return; }
    var title = $('day-title');
    title.textContent = dayTitle(day);
    if (day.holiday) title.appendChild(el('span', 'holname', day.holiday));
    var body = $('day-body');
    body.innerHTML = '';
    var msg = el('div', 'msg');
    msg.id = 'day-msg';
    body.appendChild(slotBox(day, 'duty'));
    body.appendChild(slotBox(day, 'standby'));
    body.appendChild(memoBox(day));
    body.appendChild(msg);
  }

  function slotBox(day, slot) {
    var ed = editing();
    var box = el('div', 'slot');
    box.appendChild(el('h3', null, slot === 'duty' ? '当直' : '待機'));
    var name = slot === 'duty' ? day.duty : day.standby;
    box.appendChild(el('div', 'now' + (name ? '' : ' empty'), name || '（なし）'));
    if (!ed) return box;
    var issues = (day.issues && day.issues[slot]) || [];
    if (issues.length) {
      var ul = el('ul', 'issues');
      issues.forEach(function (t) { ul.appendChild(el('li', null, '✕ ' + t)); });
      box.appendChild(ul);
    }
    var code = slot === 'duty' ? day.dutyCode : day.standbyCode;
    // 代務医の氏名（任意。入れたら固定）
    if (slot === 'duty' && day.dutySub) {
      var lab = el('label', null, '代務医の氏名（任意）');
      lab.style.display = 'block';
      lab.style.marginTop = '8px';
      var inp = el('input');
      inp.type = 'text';
      inp.maxLength = 20;
      inp.value = day.subName || '';
      inp.id = 'sub-name';
      lab.htmlFor = 'sub-name';
      var row0 = el('div', 'row');
      var sv = el('button', 'btn', '氏名を保存');
      sv.type = 'button';
      sv.addEventListener('click', function () { saveSlot(day.date, { subName: inp.value }); });
      row0.appendChild(sv);
      box.appendChild(lab);
      box.appendChild(inp);
      box.appendChild(row0);
    }
    var tg = el('label', 'toggle');
    var cb = el('input');
    cb.type = 'checkbox';
    cb.checked = slot === 'duty' ? !!day.dutyFixed : !!day.standbyFixed;
    cb.disabled = !code;
    cb.addEventListener('change', function () {
      var p = {}; p[slot === 'duty' ? 'dutyFixed' : 'standbyFixed'] = cb.checked;
      saveSlot(day.date, p);
    });
    tg.appendChild(cb);
    tg.appendChild(document.createTextNode('固定（作り直しても変えない）'));
    box.appendChild(tg);
    var row = el('div', 'row');
    var pickBtn = el('button', 'btn', state.picking === slot ? '一覧を閉じる' : '選び直す');
    pickBtn.type = 'button';
    pickBtn.addEventListener('click', function () { state.picking = state.picking === slot ? null : slot; renderDay(); });
    row.appendChild(pickBtn);
    box.appendChild(row);
    if (state.picking === slot) box.appendChild(pickList(day, slot, code));
    return box;
  }

  function pickList(day, slot, current) {
    var list = el('ul', 'pick');
    var cands = (state.month.candidates[day.date] || {})[slot] || [];
    cands.forEach(function (c) {
      var li = el('li');
      var b = el('button', c.code === current ? 'cur' : '');
      b.type = 'button';
      b.appendChild(el('span', 'nm', c.kind === '代務医' ? '代務医' : c.name));
      if (c.kind !== '代務医') b.appendChild(el('span', 'kd', c.kind));
      if (c.code === current) b.appendChild(el('span', 'kd', '（今）'));
      if (c.issues.length) b.appendChild(el('span', 'is', c.issues.map(function (t) { return '✕ ' + t; }).join('　')));
      b.addEventListener('click', function () {
        var p = {}; p[slot] = c.code;
        state.picking = null;
        saveSlot(day.date, p);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    var li2 = el('li');
    var clear = el('button', null, '空にする');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      var p = {}; p[slot] = '';
      state.picking = null;
      saveSlot(day.date, p);
    });
    li2.appendChild(clear);
    list.appendChild(li2);
    return list;
  }

  function memoBox(day) {
    var box = el('div', 'slot');
    box.appendChild(el('h3', null, 'メモ'));
    if (!editing()) {
      box.appendChild(el('div', day.memo ? '' : 'now empty', day.memo || '（なし）'));
      return box;
    }
    var inp = el('input');
    inp.type = 'text';
    inp.maxLength = 100;
    inp.value = day.memo || '';
    inp.setAttribute('aria-label', 'メモ');
    box.appendChild(inp);
    var row = el('div', 'row');
    var b = el('button', 'btn', 'メモを保存');
    b.type = 'button';
    b.addEventListener('click', function () { saveSlot(day.date, { memo: inp.value }); });
    row.appendChild(b);
    box.appendChild(row);
    return box;
  }

  function saveSlot(date, patch) {
    var msg = $('day-msg');
    if (msg) setMsg(msg, '保存しています…');
    call('saveSlot', [date, patch], function (res) {
      if (!res.ok) { if ($('day-msg')) setMsg($('day-msg'), res.reason || '保存できませんでした', 'err'); return; }
      setMonth(res);
      if ($('day-msg')) setMsg($('day-msg'), '保存しました', 'ok');
    }, function (m) {
      if ($('day-msg')) setMsg($('day-msg'), m, 'err');
    });
  }

  // ---- 「シフトを作る／作り直す」（AI で素案を作る） ----
  $('ai-btn').addEventListener('click', function () {
    var m = state.month;
    if (!m || !m.editing) return;
    var subMax = m.result ? m.result.subMax : 0;
    var text = '固定していない枠を作り直します。代務医は当直 月' + subMax + '回まで、シフト対象外 ' + (m.excludedCount || 0) + '人。よろしいですか';
    if (!window.confirm(text)) return;
    var ym = m.ym;
    showBusy('作成中…（数分かかることがあります。画面を閉じても続きます）');
    call('generate', [ym], function (res) {
      if (!res.ok) {
        if (res.generating) { startPolling(ym); return; }
        hideBusy();
        setMsg($('cal-msg'), res.reason || '作れませんでした', 'err');
        return;
      }
      hideBusy();
      if (state.ym === ym) {
        setMonth(res);
        var r = res.run || {};
        setMsg($('cal-msg'), '作りました（' + (r.seconds || 0) + '秒' + (r.retries ? '、やり直し' + r.retries + '回' : '') + '）', 'ok');
      }
    }, function (msg, data, network) {
      if (network) { startPolling(ym); return; } // 応答が返らなかった：サーバーは続けているので状態を問い合わせる
      hideBusy();
      setMsg($('cal-msg'), msg, 'err');
    });
  });

  function startPolling(ym) {
    stopPolling();
    showBusy('作成中…（数分かかることがあります。画面を閉じても続きます）');
    var startedAt = Date.now();
    state.polling = setInterval(function () {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        // 10分たっても終わらない：問い合わせをやめて失敗と出す（設計書 v5 N6）
        stopPolling();
        if (state.ym === ym) setMsg($('cal-msg'), '作成に失敗しました。もう一度お試しください', 'err');
        return;
      }
      call('status', [ym], function (res) {
        if (!res.ok) return;
        if (res.state === '作成中') return;
        stopPolling();
        hideBusy();
        if (state.ym === ym) {
          loadMonth(ym);
        }
      }, function () { /* 通信が戻るまで続ける */ });
    }, POLL_MS);
  }
  function stopPolling() {
    if (state.polling) { clearInterval(state.polling); state.polling = null; hideBusy(); }
  }
  function showBusy(text) { $('busy-text').textContent = text; $('busy').hidden = false; }
  function hideBusy() { $('busy').hidden = true; }

  // ---- PDF ----
  function hidePdf() {
    $('pdf-box').hidden = true;
    setMsg($('pdf-msg'), '');
    if (state.pdfUrl) { try { URL.revokeObjectURL(state.pdfUrl); } catch (e) { /* なし */ } state.pdfUrl = null; }
    state.pdfFile = null;
  }
  $('pdf-btn').addEventListener('click', function () {
    var ym = state.ym;
    hidePdf();
    $('pdf-btn').disabled = true;
    $('pdf-btn').textContent = 'PDFを作成中…';
    call('exportPdf', [ym], function (res) {
      $('pdf-btn').disabled = false;
      $('pdf-btn').textContent = 'PDFを作る';
      if (!res.ok) { setMsg($('pdf-msg'), res.reason || 'PDF を作れませんでした', 'err'); return; }
      if (state.ym !== ym) return;
      var bin = atob(res.base64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var blob = new Blob([bytes], { type: 'application/pdf' });
      state.pdfUrl = URL.createObjectURL(blob);
      $('pdf-open').href = state.pdfUrl;
      var file = null;
      try { file = new File([blob], res.fileName, { type: 'application/pdf' }); } catch (e) { file = null; }
      state.pdfFile = file;
      var canShare = !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
      $('pdf-share').hidden = !canShare;
      $('pdf-box').hidden = false;
      setMsg($('pdf-msg'), res.fileName + ' ができました', 'ok');
    }, function (msg) {
      $('pdf-btn').disabled = false;
      $('pdf-btn').textContent = 'PDFを作る';
      setMsg($('pdf-msg'), msg, 'err');
    });
  });
  $('pdf-share').addEventListener('click', function () {
    if (!state.pdfFile) return;
    navigator.share({ files: [state.pdfFile], title: state.pdfFile.name }).catch(function () { /* やめた */ });
  });

  // ---- 担当医マスタ ----
  function loadDoctors() {
    setMsg($('master-msg'), '読み込み中…');
    call('listDoctors', [state.ym], function (res) {
      if (!res.ok) { setMsg($('master-msg'), res.reason || '読み込めませんでした', 'err'); return; }
      setMsg($('master-msg'), '');
      state.doctors = res.doctors;
      renderDoctors();
    }, function (msg) { setMsg($('master-msg'), msg, 'err'); });
  }
  function maxText(v) { return v === null || v === undefined || v === '' ? '上限なし' : '上限 ' + v + '回'; }
  function renderDoctors() {
    var list = $('master-list');
    list.innerHTML = '';
    var subs = state.doctors.filter(function (d) { return d.kind === '代務医'; });
    var others = state.doctors.filter(function (d) { return d.kind !== '代務医'; });
    subs.concat(others).forEach(function (d) {
      var card = el('button', 'doc-card' + (d.kind === '代務医' ? ' sub' : '') + (d.active ? '' : ' inactive'));
      card.type = 'button';
      var top = el('div', 'top');
      top.appendChild(el('span', 'nm', d.name));
      top.appendChild(el('span', 'kd', d.kind));
      if (!d.active) top.appendChild(el('span', 'tag off', '無効'));
      if (d.excluded) top.appendChild(el('span', 'tag ex', '対象外'));
      if (d.priority) top.appendChild(el('span', 'tag pr', '優先'));
      if (d.kind === '下級医' && d.juniorPairOk) top.appendChild(el('span', 'tag', '下級医どうし可'));
      card.appendChild(top);
      if (d.kind === '代務医') {
        card.appendChild(el('div', 'big', '今月の代務医の当直 上限 ' + (d.dutyMax === null || d.dutyMax === '' ? 0 : d.dutyMax) + '回'));
      } else if (!d.excluded) {
        card.appendChild(el('div', 'cond', '当直：' + (d.dutyDays || 'なし') + (d.dutyPreHolidayOnly ? '（休日前日のみ）' : '') + '・' + maxText(d.dutyMax)));
        card.appendChild(el('div', 'cond', '待機：' + (d.standbyDays || 'なし') + (d.standbyDays ? '・' + maxText(d.standbyMax) : '')));
      }
      if (d.note) card.appendChild(el('div', 'note', d.note));
      if (d.noteBlocked) card.appendChild(el('div', 'blocked', '名前が入っているので AI には渡しません'));
      card.addEventListener('click', function () { openDoc(d); });
      list.appendChild(card);
    });
  }
  function dayChecks(boxId, value, prefix) {
    var box = $(boxId);
    box.innerHTML = '';
    DAY_CHARS.forEach(function (c) {
      var lab = el('label');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.value = c;
      cb.checked = String(value || '').indexOf(c) >= 0;
      cb.id = prefix + c;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(c));
      box.appendChild(lab);
    });
  }
  function readDays(boxId) {
    return Array.prototype.filter.call($(boxId).querySelectorAll('input'), function (i) { return i.checked; })
      .map(function (i) { return i.value; }).join('');
  }
  function openDoc(d) {
    state.editingDoc = d || null;
    var isNew = !d;
    d = d || { name: '', kind: '下級医', order: '', active: true, excluded: false, priority: false, dutyDays: DAY_CHARS.join(''),
      dutyPreHolidayOnly: false, juniorPairOk: false, dutyMax: null, standbyDays: DAY_CHARS.join(''), standbyMax: null, note: '' };
    $('doc-title').textContent = isNew ? '担当医を追加' : d.name;
    $('f-name').value = d.name;
    $('f-kind').value = d.kind;
    $('f-kind').disabled = d.kind === '代務医' && !isNew;
    $('f-order').value = d.order === null || d.order === undefined ? '' : d.order;
    $('f-active').checked = !!d.active;
    $('f-excluded').checked = !!d.excluded;
    $('f-priority').checked = !!d.priority;
    $('f-pair').checked = !!d.juniorPairOk;
    dayChecks('f-duty-days', d.dutyDays, 'fd-');
    $('f-prehol').checked = !!d.dutyPreHolidayOnly;
    $('f-duty-max').value = d.dutyMax === null || d.dutyMax === undefined ? '' : d.dutyMax;
    dayChecks('f-standby-days', d.standbyDays, 'fs-');
    $('f-standby-max').value = d.standbyMax === null || d.standbyMax === undefined ? '' : d.standbyMax;
    $('f-note').value = d.note || '';
    $('f-note-blocked').hidden = !d.noteBlocked;
    kindChanged();
    setMsg($('doc-msg'), '');
    $('doc-back').hidden = false;
    $('doc-sheet').hidden = false;
  }
  function kindChanged() {
    var sub = $('f-kind').value === '代務医';
    $('f-standby-box').hidden = sub;
    $('f-standby-max-box').hidden = sub;
    $('f-pair-box').hidden = $('f-kind').value !== '下級医';
    $('f-duty-max-hint').textContent = sub ? '代務医は空欄＝0回（毎月確認して変える）' : '空欄は制限なし';
  }
  $('f-kind').addEventListener('change', kindChanged);
  function closeDoc() { $('doc-back').hidden = true; $('doc-sheet').hidden = true; state.editingDoc = null; }
  $('doc-close').addEventListener('click', closeDoc);
  $('doc-back').addEventListener('click', closeDoc);
  $('doc-add').addEventListener('click', function () { openDoc(null); });
  $('doc-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = {
      code: state.editingDoc ? state.editingDoc.code : '',
      name: $('f-name').value.trim(),
      kind: $('f-kind').value,
      order: $('f-order').value,
      active: $('f-active').checked,
      excluded: $('f-excluded').checked,
      priority: $('f-priority').checked,
      juniorPairOk: $('f-kind').value === '下級医' && $('f-pair').checked,
      dutyDays: readDays('f-duty-days'),
      dutyPreHolidayOnly: $('f-prehol').checked,
      dutyMax: $('f-duty-max').value,
      standbyDays: $('f-kind').value === '代務医' ? '' : readDays('f-standby-days'),
      standbyMax: $('f-standby-max').value,
      note: $('f-note').value
    };
    $('doc-save').disabled = true;
    setMsg($('doc-msg'), '保存しています…');
    call('saveDoctor', [d, state.ym], function (res) {
      $('doc-save').disabled = false;
      if (!res.ok) { setMsg($('doc-msg'), res.reason || '保存できませんでした', 'err'); return; }
      state.doctors = res.doctors;
      renderDoctors();
      closeDoc();
      setMsg($('master-msg'), '保存しました', 'ok');
      loadMonthQuiet();
    }, function (msg) {
      $('doc-save').disabled = false;
      setMsg($('doc-msg'), msg, 'err');
    });
  });
  // マスタを変えたら、カレンダーの検査と集計を読み直しておく（画面は切り替えない）
  function loadMonthQuiet() {
    var ym = state.ym;
    call('getMonth', [ym], function (res) { if (res.ok && state.ym === ym) setMonth(res); }, function () {});
  }
  $('holiday-btn').addEventListener('click', function () {
    var year = Number(state.ym.slice(0, 4));
    if (!window.confirm(year + '年の日本の祝日を取り込み直します（病院休日の行は変えません）。よろしいですか')) return;
    setMsg($('holiday-msg'), '取り込んでいます…');
    call('refreshHolidays', [year], function (res) {
      if (!res.ok) { setMsg($('holiday-msg'), res.reason || 'できませんでした', 'err'); return; }
      setMsg($('holiday-msg'), year + '年の祝日を ' + res.count + '件 入れました', 'ok');
      loadMonthQuiet();
    }, function (msg) { setMsg($('holiday-msg'), msg, 'err'); });
  });

  // ---- 始め：初期表示は「今日の翌月」 ----
  state.ym = addMonth(todayJst().slice(0, 7), 1);
  route();
  loadMonth(state.ym);
})();
