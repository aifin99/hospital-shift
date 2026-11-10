(function () {
  'use strict';
  // 画面はデータも名前も持たない入れ物。データは config.js の apiUrl（GAS の /exec）から読む。
  var API_URL = String((window.SHIFT_CONFIG && window.SHIFT_CONFIG.apiUrl) || '');
  var KEY_STORE = 'shift_edit_key';
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  var DAY_CHARS = ['日', '月', '火', '水', '木', '金', '土', '祝'];
  var POLL_MS = 5000;
  var POLL_LIMIT_MS = (window.SHIFT_CONFIG && window.SHIFT_CONFIG.pollLimitMs) || 10 * 60 * 1000;

  // ==== 文言の一覧（画面に出る文字はここだけ。直すときはここを変える。{n} などは数字・名前が入る所） ====
  var TEXT = {
    appTitle: '産婦人科当直表',
    badgeEditing: '編集中',
    menu: 'メニュー',
    menuLogin: '編集する',
    menuCalendar: 'カレンダー',
    menuMaster: '担当医マスタ',
    menuConditions: '全体の条件',
    menuLogout: '編集を終える',
    prevMonth: '前の月',
    nextMonth: '次の月',
    monthLabel: '令和{y}年{m}月',
    weekDays: ['日', '月', '火', '水', '木', '金', '土'],
    legendDuty: '太字＝当直',
    legendSep: '／',
    legendStandby: '細字＝待機',
    holidayMark: '祝',
    subMark: '(代)',
    dayTitle: '{m}月{d}日（{w}）',
    cellAria: '{day} 当直 {duty} 待機 {standby}',
    none: 'なし',
    noneParen: '（なし）',
    close: '閉じる',
    save: '保存',
    cancel: 'やめる',
    saving: '保存しています…',
    saved: '保存しました',
    saveFailed: '保存できませんでした',
    loading: '読み込み中…',
    loadFailed: '読み込めませんでした',
    deleting: '削除しています…',
    deleted: '削除しました',
    deleteFailed: '削除できませんでした',
    failed: 'できませんでした',
    // 通信・合言葉
    noApi: 'API の URL が設定されていません（config.js）',
    netError: '通信に失敗しました（{status}）',
    reLogin: '合言葉を入れ直してください',
    passLabel: '合言葉',
    passEmpty: '合言葉を入れてください',
    passChecking: '確かめています…',
    loginFailed: '入れませんでした',
    loginOk: '入る',
    // 結果の一行・ボタン
    resultViolations: '必須ルール違反 {n}件',
    resultMissing: '未入力 {n}日',
    resultWarnings: '注意 {n}件',
    resultSub: '代務医 {n}回（上限{max}）',
    resultSep: '／',
    makeShift: 'シフトを作る',
    remakeShift: 'シフトを作り直す',
    busyMaking: '作成中…（数分かかることがあります。画面を閉じても続きます）',
    makeFailed: '作れませんでした',
    made: '作りました（{sec}秒{retry}）',
    madeRetry: '、やり直し{n}回',
    lastFailed: '前回の作成は失敗しました。もう一度お試しください',
    pollGaveUp: '作成に失敗しました。もう一度お試しください',
    // PDF
    pdfMake: 'PDFを作る',
    pdfMaking: 'PDFを作成中…',
    pdfOpen: 'PDFを開く',
    pdfShare: '共有・保存',
    pdfDownload: 'ダウンロード',
    pdfFailed: 'PDF を作れませんでした',
    pdfDone: '{name} ができました',
    // チェック結果
    checksTitle: 'チェック結果',
    checksNone: '必須ルール違反・未入力・注意はありません',
    checksMissing: '未入力（{n}日）',
    checksMissingSlots: '（{slots}）',
    checksViolations: '必須ルール違反（{n}件）',
    checksWarnings: '注意（{n}件）',
    checksWarningItem: '△ {text}：{names}',
    violationItem: '{date}✕ {text}',
    issueItem: '✕ {text}',
    issueSep: '　',
    markMemo: '●',
    markBad: '✕',
    commentTitle: '作成コメント（{at}）',
    listSep: '・',
    dateSep: '、',
    // 集計表
    summaryTitle: '集計表',
    sumDoctor: '担当医',
    sumDuty: '当直',
    sumStandby: '待機',
    sumCond: '条件',
    sumCols: ['土日祝', '平日', '計', '土日祝', '平日', '計'],
    sumExcluded: '（対象外）',
    sumTotal: '合計',
    // 日のシート
    slotDuty: '当直',
    slotStandby: '待機',
    subNameLabel: '代務医の氏名',
    phSubName: '任意',
    subNameSave: '氏名を保存',
    fixed: '固定',
    pickOpen: '選び直す',
    pickClose: '一覧を閉じる',
    pickSub: '代務医',
    pickNow: '（今）',
    pickClear: '空にする',
    memo: 'メモ',
    memoSave: 'メモを保存',
    // 担当医マスタ
    doctorAdd: '＋ 担当医を追加',
    doctorAddTitle: '担当医を追加',
    tagInactive: '無効',
    tagExcluded: '対象外',
    tagPriority: '優先',
    tagJuniorPair: '下級医どうし可',
    subLimitBig: '今月の代務医の当直 上限 {n}回',
    condDutyLine: '当直：{days}{prehol}・{max}',
    condStandbyLine: '待機：{days}{max}',
    preHolidayOnly: '（休日前日のみ）',
    maxNone: '上限なし',
    maxN: '上限 {n}回',
    noteBlocked: '名前が入っているので AI には渡しません',
    fName: '氏名',
    fKind: '区分',
    fOrder: '表示順',
    fActive: '有効',
    fExcluded: 'シフト対象外',
    fPriority: '優先',
    fJuniorPair: '下級医どうし可',
    fDutyDays: '当直に入れる日',
    fPreHoliday: '休日前日のみ',
    fDutyMax: '当直の上限（月）',
    fStandbyDays: '待機に入れる日',
    fStandbyMax: '待機の上限（月）',
    fNote: '備考',
    phNoLimit: '空欄＝上限なし',
    phSubZero: '空欄＝0回',
    holidayTitle: '祝日',
    holidayRefresh: '祝日を取り込み直す',
    holidayConfirm: '{y}年の日本の祝日を取り込み直します。よろしいですか',
    holidayDoing: '取り込んでいます…',
    holidayDone: '{y}年の祝日を {n}件 入れました',
    // 全体の条件
    condAddButton: '＋ 条件を追加',
    condAddTitle: '条件を追加',
    condEditTitle: '条件を直す',
    condEmpty: 'まだありません',
    condEditAria: '編集：{text}',
    condActive: '有効',
    condDelete: '削除',
    condDeleteConfirm: 'この条件を削除します。よろしいですか\n\n{text}',
    condTextEmpty: '内容を入れてください',
    cfText: '内容（200字まで）',
    phCondition: '例：同じ先生が同じ曜日に固まらないようにする',
    // 休み希望（v8）
    menuOffs: '休み希望',
    offOpen: '受付中',
    offClosed: '締切',
    offNamesAria: '名前を選ぶ',
    offMark: '休',
    offCount: '休み希望 {n}日',
    offAllItem: '{name}：{days}',
    offAllDay: '{d}日',
    offAllNone: 'まだありません',
    offSaveFailed: '保存できませんでした',
    offDayNames: '休み希望：{names}',
    offStatusFailed: '切り替えられませんでした',
    // 「シフトを作る」の確認（v8）
    makeConfirmFixed: '固定 {n}枠はそのまま。',
    makeConfirmSub: '代務医は月{max}回まで。',
    makeConfirmOpen: '休み希望は受付中です',
    makeCloseAndGo: '締切にして作る',
    makeGo: 'このまま作る',
    // シフトをクリア（v9）
    clearShift: 'シフトをクリア',
    clearConfirm: '{m}月の当直・待機を消します',
    clearKeep: '固定は残す',
    clearAll: 'すべて消す',
    clearGo: '消す',
    clearing: '消しています…',
    cleared: '消しました（{n}枠）',
    clearFailed: '消せませんでした',
    // 「？」を押したときだけ出す説明
    helpOpen: '説明を見る',
    helpConditions: '当直表全体への希望です。シフトを作るときの参考にします',
    helpNote: 'シフトを作るときの参考にします。必ず守らせたい条件は、上の項目で設定します'
  };
  /** 文言を取り出す。{name} を vars の値に置き換える */
  function t(key, vars) {
    var v = TEXT[key];
    if (v == null) return key;
    return String(v).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : ''; });
  }
  var LOCK_SVG = '<svg class="lock" viewBox="0 0 16 16" aria-label="' + TEXT.fixed + '" role="img"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/></svg>';

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
    openRow: null,     // 集計表で理由を開いている行
    offDoctor: loadOffDoctor(), // 休み希望の画面で選んだ医師コード（このスマホが覚える）
    offData: null,     // getOffs の結果
    offNo: 0
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
  function loadOffDoctor() { try { return localStorage.getItem('shift_off_doctor') || ''; } catch (e) { return ''; } }
  function saveOffDoctor(c) { try { if (c) localStorage.setItem('shift_off_doctor', c); else localStorage.removeItem('shift_off_doctor'); } catch (e) { /* 保存できない端末 */ } }
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
  function dayTitle(day) { return t('dayTitle', { m: Number(day.date.slice(5, 7)), d: Number(day.date.slice(8, 10)), w: TEXT.weekDays[day.dow] }); }
  function first3(s) { return Array.from(String(s || '')).slice(0, 3).join(''); }

  /**
   * GAS の API を呼ぶ。本文 { api, args, key } の JSON を text/plain で送る（preflight を出さない）。鍵は URL に付けない。
   * 鍵が違う（auth:false）と返ってきたら、鍵を捨てて見るだけの画面に戻す。
   */
  function call(api, args, onOk, onErr) {
    if (!API_URL) { onErr(t('noApi')); return; }
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ api: api, args: args || [], key: state.key || '' }),
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error(t('netError', { status: res.status }));
      return res.json();
    }).then(function (data) {
      if (data && data.auth === false) {
        saveKey('');
        if (state.month) state.month.editing = false;
        applyMode();
        openLogin(t('reLogin'));
        onErr(data.reason || t('reLogin'), data);
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
  $('m-offs').addEventListener('click', function () { setMenuOpen(false); location.hash = '#offs'; });
  $('m-master').addEventListener('click', function () { setMenuOpen(false); location.hash = '#master'; });
  $('m-conditions').addEventListener('click', function () { setMenuOpen(false); location.hash = '#conditions'; });
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
    $('m-master').hidden = !ed;
    $('m-conditions').hidden = !ed;
    $('m-logout').hidden = !ed;
    $('m-calendar').classList.toggle('active', state.view === 'calendar');
    $('m-offs').classList.toggle('active', state.view === 'offs');
    $('m-master').classList.toggle('active', state.view === 'master');
    $('m-conditions').classList.toggle('active', state.view === 'conditions');
    if (state.month && !ed && (state.view === 'master' || state.view === 'conditions')) { state.view = 'calendar'; showView(); }
  }
  function route() {
    var v = location.hash === '#master' ? 'master' : location.hash === '#conditions' ? 'conditions' : location.hash === '#offs' ? 'offs' : 'calendar';
    if ((v === 'master' || v === 'conditions') && !state.key) v = 'calendar';
    state.view = v;
    showView();
    if (v === 'master') loadDoctors();
    if (v === 'conditions') loadConditions();
    if (v === 'offs') loadOffs();
    if (v === 'calendar' && state.month && state.month.ym !== state.ym) loadMonth(state.ym);
  }
  function showView() {
    $('view-calendar').hidden = state.view !== 'calendar';
    $('view-master').hidden = state.view !== 'master';
    $('view-conditions').hidden = state.view !== 'conditions';
    $('view-offs').hidden = state.view !== 'offs';
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
    if (!pass) { setMsg($('login-msg'), t('passEmpty'), 'err'); return; }
    $('login-ok').disabled = true;
    setMsg($('login-msg'), t('passChecking'));
    call('login', [pass], function (res) {
      $('login-ok').disabled = false;
      if (!res.ok) { setMsg($('login-msg'), res.reason || t('loginFailed'), 'err'); return; }
      saveKey(res.key);
      closeLogin();
      loadMonth(state.ym);
      if (state.view === 'offs') loadOffs();
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
    setMsg($('cal-msg'), t('loading'));
    call('getMonth', [ym], function (res) {
      if (no !== state.reqNo) return;
      if (!res.ok) { setMsg($('cal-msg'), res.reason || t('loadFailed'), 'err'); return; }
      if (res.keyRejected) saveKey('');
      setMsg($('cal-msg'), '');
      setMonth(res);
      if (res.editing && res.generation && res.generation.state === '作成中') startPolling(ym);
      if (res.editing && res.generation && res.generation.state === '失敗') {
        setMsg($('cal-msg'), t('lastFailed'), 'err');
      }
    }, function (msg) {
      if (no !== state.reqNo) return;
      setMsg($('cal-msg'), msg, 'err');
    });
  }
  function labelOf(ym) {
    return t('monthLabel', { y: Number(ym.slice(0, 4)) - 2018, m: Number(ym.slice(5, 7)) });
  }
  function setMonth(res) {
    state.month = res;
    $('cal-title').textContent = res.title || t('appTitle');
    $('cal-label').textContent = res.label;
    applyMode();
    renderGrid();
    renderResult();
    renderChecks();
    renderSummary();
    renderCalOffStatus();
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
          btn.setAttribute('aria-label', t('cellAria', { day: dayTitle(day), duty: day.duty || t('none'), standby: day.standby || t('none') }));
          btn.appendChild(el('span', 'd', String(Number(day.date.slice(8, 10)))));
          if (day.holiday) btn.appendChild(el('span', 'hol', t('holidayMark')));
          var dutyEl = el('span', 'duty', day.dutySub ? t('subMark') : first3(day.duty));
          var sbEl = el('span', 'standby', first3(day.standby));
          if (editing() && day.dutyFixed && day.duty) dutyEl.className += ' fixed';
          if (editing() && day.standbyFixed && day.standby) sbEl.className += ' fixed';
          btn.appendChild(dutyEl);
          btn.appendChild(sbEl);
          if (editing() && day.offNames && day.offNames.length) btn.appendChild(el('span', 'off-mark', t('offMark')));
          var marks = el('span', 'marks');
          if (day.memo) marks.appendChild(el('span', 'memo', t('markMemo')));
          if (editing() && (day.dutyFixed || day.standbyFixed)) {
            var lk = el('span');
            lk.innerHTML = LOCK_SVG;
            marks.appendChild(lk);
          }
          if (bad) marks.appendChild(el('span', 'x', t('markBad')));
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
    if (!editing() || !m.result) { line.hidden = true; ai.hidden = true; $('clear-btn').hidden = true; return; }
    line.hidden = false;
    line.innerHTML = '';
    var r = m.result;
    var v = el('span', r.violations ? 'bad' : '', t('resultViolations', { n: r.violations }));
    var w = el('span', r.warnings ? 'warn' : '', t('resultWarnings', { n: r.warnings }));
    var sub = el('span', r.subCount > r.subMax ? 'bad' : '', t('resultSub', { n: r.subCount, max: r.subMax }));
    var mi = el('span', r.missingDays ? 'bad' : '', t('resultMissing', { n: r.missingDays || 0 }));
    line.appendChild(v); line.appendChild(document.createTextNode(t('resultSep')));
    line.appendChild(mi); line.appendChild(document.createTextNode(t('resultSep')));
    line.appendChild(w); line.appendChild(document.createTextNode(t('resultSep')));
    line.appendChild(sub);
    ai.hidden = false;
    var hasAny = m.days.some(function (d) { return d.dutyCode || d.standbyCode; });
    ai.textContent = hasAny ? t('remakeShift') : t('makeShift');
    $('clear-btn').hidden = !hasAny; // 設計書 v5 N10（動きは AI で素案を作る）
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
      body.appendChild(el('p', 'none', t('checksNone')));
    }
    if (missing.length) {
      body.appendChild(el('h3', null, t('checksMissing', { n: missing.length })));
      var mp = el('p', 'missing-days', missing.map(function (x) {
        return shortDate(x.date) + (x.slots.length === 2 ? '' : t('checksMissingSlots', { slots: x.slots.join(TEXT.listSep) }));
      }).join(TEXT.dateSep));
      body.appendChild(mp);
    }
    if (m.violations.length) {
      body.appendChild(el('h3', null, t('checksViolations', { n: m.violations.length })));
      var ul = el('ul');
      m.violations.forEach(function (v) {
        var li = el('li');
        var b = el('button', 'item v', t('violationItem', { date: v.date ? shortDate(v.date) + ' ' : '', text: v.text }));
        b.type = 'button';
        if (v.date) b.addEventListener('click', function () { openDay(v.date); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    if (m.warnings.length) {
      body.appendChild(el('h3', null, t('checksWarnings', { n: m.warnings.length })));
      var ul2 = el('ul');
      m.warnings.forEach(function (w) {
        var li = el('li');
        li.appendChild(el('div', 'item w', t('checksWarningItem', { text: w.text, names: w.names.join(TEXT.listSep) })));
        ul2.appendChild(li);
      });
      body.appendChild(ul2);
    }
    if (m.generation && m.generation.comment) {
      body.appendChild(el('h3', null, t('commentTitle', { at: m.generation.at })));
      body.appendChild(el('div', 'comment', m.generation.comment));
    }
  }

  function renderSummary() {
    var m = state.month;
    var tbl = $('summary');
    tbl.innerHTML = '';
    var ed = editing();
    var cg = el('colgroup');
    cg.appendChild(el('col', 'c-name'));
    for (var i = 0; i < 6; i++) cg.appendChild(el('col'));
    if (ed) { var cm = el('col'); cm.style.width = '9%'; cg.appendChild(cm); }
    tbl.appendChild(cg);
    var thead = el('thead');
    var h1 = el('tr');
    var th = el('th', null, t('sumDoctor')); th.rowSpan = 2; h1.appendChild(th);
    var a = el('th', null, t('sumDuty')); a.colSpan = 3; h1.appendChild(a);
    var b = el('th', null, t('sumStandby')); b.colSpan = 3; h1.appendChild(b);
    if (ed) { var c = el('th', null, t('sumCond')); c.rowSpan = 2; h1.appendChild(c); }
    var h2 = el('tr');
    TEXT.sumCols.forEach(function (s) { h2.appendChild(el('th', null, s)); });
    thead.appendChild(h1); thead.appendChild(h2);
    tbl.appendChild(thead);
    var tb = el('tbody');
    m.summary.rows.forEach(function (r, i) {
      var tr = el('tr');
      tr.appendChild(el('td', 'name', r.name + (ed && r.excluded ? t('sumExcluded') : '')));
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
    tot.appendChild(el('td', 'name', t('sumTotal')));
    var days = m.summary.days;
    ['', '', m.summary.total.duty, '', '', m.summary.total.standby].forEach(function (n, i) {
      var td = el('td', 'num', String(n));
      if ((i === 2 || i === 5) && Number(n) !== days) td.className += ' mismatch';
      tot.appendChild(td);
    });
    if (ed) tot.appendChild(el('td'));
    tb.appendChild(tot);
    tbl.appendChild(tb);
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
    if (editing() && day.offNames && day.offNames.length) body.appendChild(el('div', 'off-names-line', t('offDayNames', { names: day.offNames.join(TEXT.listSep) })));
    body.appendChild(slotBox(day, 'duty'));
    body.appendChild(slotBox(day, 'standby'));
    body.appendChild(memoBox(day));
    body.appendChild(msg);
  }

  function slotBox(day, slot) {
    var ed = editing();
    var box = el('div', 'slot');
    box.appendChild(el('h3', null, slot === 'duty' ? t('slotDuty') : t('slotStandby')));
    var name = slot === 'duty' ? day.duty : day.standby;
    box.appendChild(el('div', 'now' + (name ? '' : ' empty'), name || t('noneParen')));
    if (!ed) return box;
    var issues = (day.issues && day.issues[slot]) || [];
    if (issues.length) {
      var ul = el('ul', 'issues');
      issues.forEach(function (x) { ul.appendChild(el('li', null, t('issueItem', { text: x }))); });
      box.appendChild(ul);
    }
    var code = slot === 'duty' ? day.dutyCode : day.standbyCode;
    // 代務医の氏名（任意。入れたら固定）
    if (slot === 'duty' && day.dutySub) {
      var lab = el('label', null, t('subNameLabel'));
      lab.style.display = 'block';
      lab.style.marginTop = '8px';
      var inp = el('input');
      inp.type = 'text';
      inp.maxLength = 20;
      inp.value = day.subName || '';
      inp.id = 'sub-name';
      inp.placeholder = t('phSubName');
      lab.htmlFor = 'sub-name';
      var row0 = el('div', 'row');
      var sv = el('button', 'btn', t('subNameSave'));
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
    tg.appendChild(document.createTextNode(t('fixed')));
    box.appendChild(tg);
    var row = el('div', 'row');
    var pickBtn = el('button', 'btn', state.picking === slot ? t('pickClose') : t('pickOpen'));
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
      b.appendChild(el('span', 'nm', c.kind === '代務医' ? t('pickSub') : c.name));
      if (c.kind !== '代務医') b.appendChild(el('span', 'kd', c.kind));
      if (c.code === current) b.appendChild(el('span', 'kd', t('pickNow')));
      if (c.issues.length) b.appendChild(el('span', 'is', c.issues.map(function (x) { return t('issueItem', { text: x }); }).join(TEXT.issueSep)));
      b.addEventListener('click', function () {
        var p = {}; p[slot] = c.code;
        state.picking = null;
        saveSlot(day.date, p);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    var li2 = el('li');
    var clear = el('button', null, t('pickClear'));
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
    box.appendChild(el('h3', null, t('memo')));
    if (!editing()) {
      box.appendChild(el('div', day.memo ? '' : 'now empty', day.memo || t('noneParen')));
      return box;
    }
    var inp = el('input');
    inp.type = 'text';
    inp.maxLength = 100;
    inp.value = day.memo || '';
    inp.setAttribute('aria-label', t('memo'));
    box.appendChild(inp);
    var row = el('div', 'row');
    var b = el('button', 'btn', t('memoSave'));
    b.type = 'button';
    b.addEventListener('click', function () { saveSlot(day.date, { memo: inp.value }); });
    row.appendChild(b);
    box.appendChild(row);
    return box;
  }

  function saveSlot(date, patch) {
    var msg = $('day-msg');
    if (msg) setMsg(msg, t('saving'));
    call('saveSlot', [date, patch], function (res) {
      if (!res.ok) { if ($('day-msg')) setMsg($('day-msg'), res.reason || t('saveFailed'), 'err'); return; }
      setMonth(res);
      if ($('day-msg')) setMsg($('day-msg'), t('saved'), 'ok');
    }, function (m) {
      if ($('day-msg')) setMsg($('day-msg'), m, 'err');
    });
  }

  // ---- 「シフトを作る／作り直す」（AI で素案を作る） ----
  $('ai-btn').addEventListener('click', function () {
    var m = state.month;
    if (!m || !m.editing) return;
    var open = m.offStatus !== '締切';
    $('make-text').textContent = t('makeConfirmFixed', { n: m.fixedCount || 0 }) +
      t('makeConfirmSub', { max: m.result ? m.result.subMax : 0 }) + (open ? t('makeConfirmOpen') : '');
    $('make-close').hidden = !open;
    $('make-go').className = open ? 'btn' : 'btn primary';
    $('make-back').hidden = false;
    $('make-box').hidden = false;
  });
  function closeMake() { $('make-back').hidden = true; $('make-box').hidden = true; }
  $('make-cancel').addEventListener('click', closeMake);
  $('make-back').addEventListener('click', closeMake);
  $('make-go').addEventListener('click', function () { closeMake(); runMake(); });
  $('make-close').addEventListener('click', function () {
    closeMake();
    var ym = state.month.ym;
    showBusy(t('busyMaking'));
    call('setOffStatus', [ym, '締切'], function (res) {
      if (!res.ok) { hideBusy(); setMsg($('cal-msg'), res.reason || t('offStatusFailed'), 'err'); return; }
      runMake();
    }, function (msg) { hideBusy(); setMsg($('cal-msg'), msg, 'err'); });
  });
  function runMake() {
    var m = state.month;
    if (!m || !m.editing) return;
    var ym = m.ym;
    showBusy(t('busyMaking'));
    call('generate', [ym], function (res) {
      if (!res.ok) {
        if (res.generating) { startPolling(ym); return; }
        hideBusy();
        setMsg($('cal-msg'), res.reason || t('makeFailed'), 'err');
        return;
      }
      hideBusy();
      if (state.ym === ym) {
        setMonth(res);
        var r = res.run || {};
        setMsg($('cal-msg'), t('made', { sec: r.seconds || 0, retry: r.retries ? t('madeRetry', { n: r.retries }) : '' }), 'ok');
      }
    }, function (msg, data, network) {
      if (network) { startPolling(ym); return; } // 応答が返らなかった：サーバーは続けているので状態を問い合わせる
      hideBusy();
      setMsg($('cal-msg'), msg, 'err');
    });
  }

  // ---- シフトをクリア（v9） ----
  $('clear-btn').addEventListener('click', function () {
    var m = state.month;
    if (!m || !m.editing) return;
    var hasFixed = (m.fixedCount || 0) > 0;
    $('clear-text').textContent = t('clearConfirm', { m: Number(m.ym.slice(5, 7)) });
    $('clear-keep').hidden = !hasFixed;
    $('clear-all').hidden = !hasFixed;
    $('clear-go').hidden = hasFixed;
    $('clear-back').hidden = false;
    $('clear-box').hidden = false;
  });
  function closeClear() { $('clear-back').hidden = true; $('clear-box').hidden = true; }
  $('clear-cancel').addEventListener('click', closeClear);
  $('clear-back').addEventListener('click', closeClear);
  $('clear-keep').addEventListener('click', function () { closeClear(); runClear(true); });
  $('clear-all').addEventListener('click', function () { closeClear(); runClear(false); });
  $('clear-go').addEventListener('click', function () { closeClear(); runClear(false); });
  function runClear(keepFixed) {
    var ym = state.month.ym;
    setMsg($('cal-msg'), t('clearing'));
    call('clearMonth', [ym, keepFixed], function (res) {
      if (!res.ok) { setMsg($('cal-msg'), res.reason || t('clearFailed'), 'err'); return; }
      if (state.ym !== ym) return;
      setMonth(res);
      setMsg($('cal-msg'), t('cleared', { n: res.cleared || 0 }), 'ok');
    }, function (msg) { setMsg($('cal-msg'), msg, 'err'); });
  }

  function startPolling(ym) {
    stopPolling();
    showBusy(t('busyMaking'));
    var startedAt = Date.now();
    state.polling = setInterval(function () {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        // 10分たっても終わらない：問い合わせをやめて失敗と出す（設計書 v5 N6）
        stopPolling();
        if (state.ym === ym) setMsg($('cal-msg'), t('pollGaveUp'), 'err');
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
    $('pdf-btn').textContent = t('pdfMaking');
    call('exportPdf', [ym], function (res) {
      $('pdf-btn').disabled = false;
      $('pdf-btn').textContent = t('pdfMake');
      if (!res.ok) { setMsg($('pdf-msg'), res.reason || t('pdfFailed'), 'err'); return; }
      if (state.ym !== ym) return;
      var bin = atob(res.base64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var blob = new Blob([bytes], { type: 'application/pdf' });
      state.pdfUrl = URL.createObjectURL(blob);
      state.pdfName = res.fileName;
      $('pdf-dl').href = state.pdfUrl;
      $('pdf-dl').setAttribute('download', res.fileName);
      var file = null;
      try { file = new File([blob], res.fileName, { type: 'application/pdf' }); } catch (e) { file = null; }
      state.pdfFile = file;
      // ボタンは常に2つ：スマホ（共有が使える）なら「共有・保存」、PC などは「ダウンロード」
      var share = shareMode(file);
      $('pdf-share').hidden = !share;
      $('pdf-dl').hidden = share;
      $('pdf-box').hidden = false;
      setMsg($('pdf-msg'), t('pdfDone', { name: res.fileName }), 'ok');
    }, function (msg) {
      $('pdf-btn').disabled = false;
      $('pdf-btn').textContent = t('pdfMake');
      setMsg($('pdf-msg'), msg, 'err');
    });
  });
  /** 共有を出すのは、ファイルの共有が使えるスマホ・タブレットだけ（Windows の Chrome も共有を持っているが、PC はダウンロードにする） */
  function shareMode(file) {
    var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    return !!(mobile && file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
  }
  // 「PDFを開く」：押したその場で新しいタブに開く（新しいタブとのつながりを切る指定は付けない。設計書 v9 Y2）。
  // 新しいタブを開けない画面（アプリの中のブラウザなど）では、今のタブで開く
  $('pdf-open').addEventListener('click', function () {
    if (!state.pdfUrl) return;
    var w = null;
    try { w = window.open(state.pdfUrl, '_blank'); } catch (e) { w = null; }
    if (!w) location.href = state.pdfUrl;
  });
  $('pdf-share').addEventListener('click', function () {
    if (!state.pdfFile) return;
    navigator.share({ files: [state.pdfFile], title: state.pdfFile.name }).catch(function () { /* やめた */ });
  });

  // ---- 担当医マスタ ----
  function loadDoctors() {
    setMsg($('master-msg'), t('loading'));
    call('listDoctors', [state.ym], function (res) {
      if (!res.ok) { setMsg($('master-msg'), res.reason || t('loadFailed'), 'err'); return; }
      setMsg($('master-msg'), '');
      state.doctors = res.doctors;
      renderDoctors();
    }, function (msg) { setMsg($('master-msg'), msg, 'err'); });
  }
  function maxText(v) { return v === null || v === undefined || v === '' ? t('maxNone') : t('maxN', { n: v }); }
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
      if (!d.active) top.appendChild(el('span', 'tag off', t('tagInactive')));
      if (d.excluded) top.appendChild(el('span', 'tag ex', t('tagExcluded')));
      if (d.priority) top.appendChild(el('span', 'tag pr', t('tagPriority')));
      if (d.kind === '下級医' && d.juniorPairOk) top.appendChild(el('span', 'tag', t('tagJuniorPair')));
      card.appendChild(top);
      if (d.kind === '代務医') {
        card.appendChild(el('div', 'big', t('subLimitBig', { n: d.dutyMax === null || d.dutyMax === '' ? 0 : d.dutyMax })));
      } else if (!d.excluded) {
        card.appendChild(el('div', 'cond', t('condDutyLine', { days: d.dutyDays || t('none'), prehol: d.dutyPreHolidayOnly ? t('preHolidayOnly') : '', max: maxText(d.dutyMax) })));
        card.appendChild(el('div', 'cond', t('condStandbyLine', { days: d.standbyDays || t('none'), max: d.standbyDays ? TEXT.listSep + maxText(d.standbyMax) : '' })));
      }
      if (d.note) card.appendChild(el('div', 'note', d.note));
      if (d.noteBlocked) card.appendChild(el('div', 'blocked', t('noteBlocked')));
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
    $('doc-title').textContent = isNew ? t('doctorAddTitle') : d.name;
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
    $('f-duty-max').placeholder = sub ? t('phSubZero') : t('phNoLimit');
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
    setMsg($('doc-msg'), t('saving'));
    call('saveDoctor', [d, state.ym], function (res) {
      $('doc-save').disabled = false;
      if (!res.ok) { setMsg($('doc-msg'), res.reason || t('saveFailed'), 'err'); return; }
      state.doctors = res.doctors;
      renderDoctors();
      closeDoc();
      setMsg($('master-msg'), t('saved'), 'ok');
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
    if (!window.confirm(t('holidayConfirm', { y: year }))) return;
    setMsg($('holiday-msg'), t('holidayDoing'));
    call('refreshHolidays', [year], function (res) {
      if (!res.ok) { setMsg($('holiday-msg'), res.reason || t('failed'), 'err'); return; }
      setMsg($('holiday-msg'), t('holidayDone', { y: year, n: res.count }), 'ok');
      loadMonthQuiet();
    }, function (msg) { setMsg($('holiday-msg'), msg, 'err'); });
  });

  // ---- 全体の条件（#conditions。v6） ----
  function loadConditions() {
    setMsg($('cond-msg'), t('loading'));
    call('listConditions', [state.ym], function (res) {
      if (!res.ok) { setMsg($('cond-msg'), res.reason || t('loadFailed'), 'err'); return; }
      setMsg($('cond-msg'), '');
      renderConditions(res.conditions);
    }, function (msg) { setMsg($('cond-msg'), msg, 'err'); });
  }
  function renderConditions(list) {
    state.conditions = list;
    var box = $('cond-list');
    box.innerHTML = '';
    if (!list.length) box.appendChild(el('p', 'hint', t('condEmpty')));
    list.forEach(function (c) {
      var card = el('div', 'cond-card' + (c.active ? '' : ' inactive'));
      var text = el('button', 'cond-text', c.text);
      text.type = 'button';
      text.setAttribute('aria-label', t('condEditAria', { text: c.text }));
      text.addEventListener('click', function () { openCond(c); });
      card.appendChild(text);
      if (c.blocked) card.appendChild(el('div', 'blocked', c.blocked));
      var row = el('div', 'cond-row');
      var tg = el('label', 'toggle');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!c.active;
      cb.addEventListener('change', function () {
        saveCond({ id: c.id, text: c.text, order: c.order, active: cb.checked });
      });
      tg.appendChild(cb);
      tg.appendChild(document.createTextNode(t('condActive')));
      row.appendChild(tg);
      var del = el('button', 'btn danger small', t('condDelete'));
      del.type = 'button';
      del.addEventListener('click', function () {
        if (!window.confirm(t('condDeleteConfirm', { text: c.text }))) return;
        setMsg($('cond-msg'), t('deleting'));
        call('deleteCondition', [c.id, state.ym], function (res) {
          if (!res.ok) { setMsg($('cond-msg'), res.reason || t('deleteFailed'), 'err'); return; }
          renderConditions(res.conditions);
          setMsg($('cond-msg'), t('deleted'), 'ok');
        }, function (msg) { setMsg($('cond-msg'), msg, 'err'); });
      });
      row.appendChild(del);
      card.appendChild(row);
      box.appendChild(card);
    });
  }
  function saveCond(c, after) {
    setMsg($('cond-msg'), t('saving'));
    call('saveCondition', [c, state.ym], function (res) {
      if (!res.ok) {
        setMsg(after ? $('cf-msg') : $('cond-msg'), res.reason || t('saveFailed'), 'err');
        if (!after) loadConditions();
        return;
      }
      renderConditions(res.conditions);
      setMsg($('cond-msg'), t('saved'), 'ok');
      if (after) after();
    }, function (msg) { setMsg(after ? $('cf-msg') : $('cond-msg'), msg, 'err'); });
  }
  function openCond(c) {
    state.editingCond = c || null;
    $('cond-title').textContent = c ? t('condEditTitle') : t('condAddTitle');
    $('cf-text').value = c ? c.text : '';
    $('cf-order').value = c && c.order !== null && c.order !== undefined ? c.order : '';
    setMsg($('cf-msg'), '');
    $('cond-back').hidden = false;
    $('cond-sheet').hidden = false;
  }
  function closeCond() { $('cond-back').hidden = true; $('cond-sheet').hidden = true; state.editingCond = null; }
  $('cond-close').addEventListener('click', closeCond);
  $('cond-back').addEventListener('click', closeCond);
  $('cond-add').addEventListener('click', function () { openCond(null); });
  $('cond-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var c = state.editingCond;
    var text = $('cf-text').value.trim();
    if (!text) { setMsg($('cf-msg'), t('condTextEmpty'), 'err'); return; }
    saveCond({ id: c ? c.id : '', text: text, order: $('cf-order').value, active: c ? c.active : true }, closeCond);
  });

  // ---- 休み希望（#offs。v8。合言葉なしで使える） ----
  function statusLabel(st) { return st === '締切' ? t('offClosed') : t('offOpen'); }
  function paintStatus(btn, st, canToggle) {
    btn.textContent = statusLabel(st);
    btn.className = 'off-status ' + (st === '締切' ? 'closed' : 'open');
    btn.disabled = !canToggle;
  }
  function renderCalOffStatus() {
    var m = state.month;
    var ed = editing();
    $('cal-off-row').hidden = !ed;
    if (ed) paintStatus($('cal-off-status'), m.offStatus, true);
  }
  function toggleOffStatus(ym, current, done) {
    var next = current === '締切' ? '受付中' : '締切';
    call('setOffStatus', [ym, next], function (res) {
      if (!res.ok) { setMsg($('cal-msg'), res.reason || t('offStatusFailed'), 'err'); return; }
      done(res.status);
    }, function (msg) { setMsg($('cal-msg'), msg, 'err'); });
  }
  $('cal-off-status').addEventListener('click', function () {
    var m = state.month;
    if (!m || !m.editing) return;
    toggleOffStatus(m.ym, m.offStatus, function (st) { m.offStatus = st; renderCalOffStatus(); });
  });
  $('off-status').addEventListener('click', function () {
    var d = state.offData;
    if (!d || !d.editing) return;
    toggleOffStatus(d.ym, d.status, function () { loadOffs(); });
  });
  $('off-prev').addEventListener('click', function () { state.ym = addMonth(state.ym, -1); loadOffs(); });
  $('off-next').addEventListener('click', function () { state.ym = addMonth(state.ym, 1); loadOffs(); });

  function loadOffs() {
    var ym = state.ym;
    var no = ++state.offNo;
    $('off-label').textContent = labelOf(ym);
    setMsg($('off-msg'), t('loading'));
    var gotNames = function (docs) {
      state.offDoctors = docs;
      if (state.offDoctor && !docs.some(function (d) { return d.code === state.offDoctor; })) { state.offDoctor = ''; saveOffDoctor(''); }
      call('getOffs', [ym, state.offDoctor], function (res) {
        if (no !== state.offNo) return;
        if (!res.ok) { setMsg($('off-msg'), res.reason || t('loadFailed'), 'err'); return; }
        setMsg($('off-msg'), '');
        state.offData = res;
        renderOffs();
      }, function (msg) { if (no === state.offNo) setMsg($('off-msg'), msg, 'err'); });
    };
    if (state.offDoctors) { gotNames(state.offDoctors); return; }
    call('listOffDoctors', [], function (res) {
      if (!res.ok) { setMsg($('off-msg'), res.reason || t('loadFailed'), 'err'); return; }
      gotNames(res.doctors);
    }, function (msg) { setMsg($('off-msg'), msg, 'err'); });
  }

  function renderOffs() {
    var d = state.offData;
    paintStatus($('off-status'), d.status, d.editing);
    // 名前のボタン
    var names = $('off-names');
    names.innerHTML = '';
    (state.offDoctors || []).forEach(function (doc) {
      var b = el('button', 'off-name' + (doc.code === state.offDoctor ? ' on' : ''), doc.name);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(doc.code === state.offDoctor));
      b.addEventListener('click', function () {
        state.offDoctor = doc.code;
        saveOffDoctor(doc.code);
        loadOffs();
      });
      names.appendChild(b);
    });
    // カレンダー
    var chosen = !!state.offDoctor && d.code === state.offDoctor;
    var canPress = chosen && d.open;
    $('off-grid').classList.toggle('disabled', !chosen);
    var body = $('off-body');
    body.innerHTML = '';
    var first = d.days[0].dow;
    var n = d.days.length;
    var weeks = Math.ceil((first + n) / 7);
    var mine = {};
    d.dates.forEach(function (x) { mine[x] = true; });
    for (var w = 0; w < weeks; w++) {
      var tr = el('tr');
      for (var c = 0; c < 7; c++) {
        var idx = w * 7 + c - first;
        var td = el('td');
        if (idx < 0 || idx >= n) { td.className = 'out'; tr.appendChild(td); continue; }
        var day = d.days[idx];
        var cls = [];
        if (day.holiday) cls.push('hol'); else if (day.dow === 0) cls.push('sun'); else if (day.dow === 6) cls.push('sat');
        if (mine[day.date]) cls.push('off-on');
        td.className = cls.join(' ');
        var b = el('button', 'cell off-cell');
        b.type = 'button';
        b.disabled = !canPress;
        b.setAttribute('data-date', day.date);
        b.setAttribute('aria-pressed', String(!!mine[day.date]));
        b.appendChild(el('span', 'd', String(Number(day.date.slice(8, 10)))));
        if (day.holiday) b.appendChild(el('span', 'hol', t('holidayMark')));
        if (mine[day.date]) b.appendChild(el('span', 'off-big', t('offMark')));
        b.addEventListener('click', onOffClick);
        td.appendChild(b);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    $('off-count').textContent = chosen ? t('offCount', { n: d.dates.length }) : '';
    // 編集モード：全員の一覧
    var all = $('off-all');
    all.hidden = !d.editing;
    all.innerHTML = '';
    if (d.editing) {
      if (!d.all.length) all.appendChild(el('div', 'off-all-item', t('offAllNone')));
      d.all.forEach(function (x) {
        all.appendChild(el('div', 'off-all-item', t('offAllItem', {
          name: x.name,
          days: x.dates.map(function (dt) { return t('offAllDay', { d: Number(dt.slice(8, 10)) }); }).join(TEXT.listSep)
        })));
      });
    }
  }
  function onOffClick(ev) {
    var b = ev.currentTarget;
    var date = b.getAttribute('data-date');
    var on = b.getAttribute('aria-pressed') !== 'true';
    var ym = state.ym;
    b.disabled = true;
    call('setOff', [date, state.offDoctor, on], function (res) {
      if (!res.ok) {
        setMsg($('off-msg'), res.reason || t('offSaveFailed'), 'err');
        if (res.closed) loadOffs(); else b.disabled = false;
        return;
      }
      if (state.ym !== ym) return;
      setMsg($('off-msg'), '');
      state.offData = res;
      renderOffs();
    }, function (msg) { b.disabled = false; setMsg($('off-msg'), msg, 'err'); });
  }

  // ---- 文言を画面に入れる（index.html の data-t / data-t-ph / data-t-aria）と「？」の説明 ----
  function applyTexts() {
    document.title = t('appTitle');
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (e) { e.textContent = t(e.getAttribute('data-t')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-t-ph]'), function (e) { e.placeholder = t(e.getAttribute('data-t-ph')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-t-aria]'), function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-t-aria'))); });
    Array.prototype.forEach.call(document.querySelectorAll('.week-head'), function (head) {
      head.innerHTML = '';
      TEXT.weekDays.forEach(function (w, i) { head.appendChild(el('th', i === 0 ? 'sun' : i === 6 ? 'sat' : null, w)); });
    });
  }
  // 見出しの横の「？」：押すと説明が出て、もう一度押すと閉じる
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.help-btn') : null;
    if (!b) return;
    var box = $(b.getAttribute('data-help'));
    if (!box) return;
    box.hidden = !box.hidden;
    b.setAttribute('aria-expanded', String(!box.hidden));
  });
  applyTexts();

  // ---- 始め：初期表示は「今日の翌月」 ----
  state.ym = addMonth(todayJst().slice(0, 7), 1);
  route();
  loadMonth(state.ym);
})();
