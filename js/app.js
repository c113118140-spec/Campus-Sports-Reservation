/* 介面層：頁面切換、渲染與事件處理 */
(function () {
  'use strict';
  var S = window.Store;
  var $ = function (id) { return document.getElementById(id); };
  var NAME_KEY = 'csr_current_name';
  var selectedHour = null;
  var currentView = 'home';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function range(h) { return pad(h) + ':00–' + pad(h + 1) + ':00'; }
  function getName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function setName(v) { try { localStorage.setItem(NAME_KEY, v); } catch (e) { /* 忽略 */ } }
  function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }

  var toastTimer;
  function toast(msg, type) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3200);
  }

  function confirmBox(title, html, yesText) {
    return new Promise(function (resolve) {
      var d = $('dlg');
      $('dlgTitle').textContent = title;
      $('dlgBody').innerHTML = html;
      $('dlgYes').textContent = yesText || '確認';
      d.returnValue = '';
      d.addEventListener('close', function h() {
        d.removeEventListener('close', h);
        resolve(d.returnValue === 'yes');
      });
      d.showModal();
    });
  }

  /* ---------- 導覽 ---------- */
  function show(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-view') === view);
    });
    document.querySelectorAll('#mainNav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === view);
    });
    $('mainNav').classList.remove('open');
    $('menuBtn').setAttribute('aria-expanded', 'false');
    renderAll();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    if (currentView === 'home') renderHome();
    if (currentView === 'facilities') renderFacilities();
    if (currentView === 'book') renderBook();
    if (currentView === 'mine') renderMine();
    if (currentView === 'admin') renderAdmin();
  }

  /* ---------- 場地卡片 ---------- */
  function facCard(f, date, withBook) {
    var free = 0, hrs = S.hours(f);
    hrs.forEach(function (h) { if (S.slotStatus(f, date, h) === 'free') free++; });
    var tag = f.status === 'open' ? '<span class="tag open">開放中</span>' : '<span class="tag closed">暫停開放</span>';
    return '<div class="card"><div class="fac-top"><div class="fac-ico">' + esc(f.icon) + '</div>' + tag + '</div>' +
      '<h3>' + esc(f.name) + '</h3><div class="fac-meta">' +
      '<div>📍 位置：' + esc(f.location) + '</div>' +
      '<div>🕘 開放時段：' + pad(f.open) + ':00–' + pad(f.close) + ':00</div>' +
      '<div>📆 ' + date + ' 可預約：' + (f.status === 'open' ? free + ' / ' + hrs.length + ' 個時段' : '—') + '</div></div>' +
      (withBook ? '<button class="btn btn-primary btn-sm" data-act="goBook" data-id="' + f.id + '" data-date="' + date + '">預約此場地</button>' : '') +
      '</div>';
  }

  function renderHome() {
    $('homeFacilities').innerHTML = S.facilities().map(function (f) { return facCard(f, S.today(), true); }).join('');
  }

  function renderFacilities() {
    var sel = $('fType'), cur = sel.value, types = [];
    S.facilities().forEach(function (f) { if (types.indexOf(f.type) < 0) types.push(f.type); });
    sel.innerHTML = '<option value="">全部</option>' + types.map(function (t) {
      return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
    }).join('');
    sel.value = types.indexOf(cur) >= 0 ? cur : '';
    var d = $('fDate'); d.min = S.today();
    if (!validDate(d.value) || d.value < S.today()) d.value = S.today();
    var list = S.facilities().filter(function (f) { return !sel.value || f.type === sel.value; });
    $('facilityList').innerHTML = list.length
      ? list.map(function (f) { return facCard(f, d.value, true); }).join('')
      : '<div class="empty">查無符合條件的場地</div>';
  }

  /* ---------- 預約 ---------- */
  function renderBook() {
    var sel = $('bFacility'), cur = sel.value;
    sel.innerHTML = S.facilities().map(function (f) {
      return '<option value="' + f.id + '">' + esc(f.name) + (f.status !== 'open' ? '（暫停開放）' : '') + '</option>';
    }).join('');
    if (cur && S.facility(cur)) sel.value = cur;
    var d = $('bDate'); d.min = S.today();
    if (!validDate(d.value) || d.value < S.today()) d.value = S.today();
    if (document.activeElement !== $('bName')) $('bName').value = getName();
    renderSlots();
  }

  function renderSlots() {
    var f = S.facility($('bFacility').value), date = $('bDate').value;
    if (!f || !validDate(date)) { $('slotGrid').innerHTML = '<div class="empty">請選擇場地與日期</div>'; return; }
    if (selectedHour !== null && S.slotStatus(f, date, selectedHour) !== 'free') selectedHour = null;
    var labels = { free: '可預約', booked: '已被預約', past: '已過時段', closed: '未開放' };
    $('slotGrid').innerHTML = S.hours(f).map(function (h) {
      var st = S.slotStatus(f, date, h);
      var cls = st + (selectedHour === h ? ' sel' : '');
      return '<button type="button" class="slot ' + cls + '" data-act="slot" data-hour="' + h + '">' + range(h) +
        '<small>' + (selectedHour === h ? '已選擇' : labels[st]) + '</small></button>';
    }).join('');
    $('bSummary').textContent = selectedHour === null ? '請選擇時段'
      : f.name + '｜' + date + '｜' + range(selectedHour);
  }

  function submitBooking() {
    var name = $('bName').value.trim();
    var f = S.facility($('bFacility').value), date = $('bDate').value;
    if (!name) { toast('請輸入預約人姓名', 'err'); $('bName').focus(); return; }
    if (!f || !validDate(date)) { toast('請選擇場地與日期', 'err'); return; }
    if (date < S.today()) { toast('過去日期無法預約', 'err'); return; }
    if (selectedHour === null) { toast('請先選擇預約時段', 'err'); return; }
    var hour = selectedHour;
    var st = S.slotStatus(f, date, hour);
    if (st !== 'free') {
      toast(st === 'booked' ? '該時段已被預約，請重新選擇' : '此時段無法預約', 'err');
      selectedHour = null; renderSlots(); return;
    }
    setName(name);
    confirmBox('確認預約',
      '<p>預約人：<b>' + esc(name) + '</b><br>場地：<b>' + esc(f.name) + '</b><br>日期：<b>' + date +
      '</b><br>時段：<b>' + range(hour) + '</b></p>', '確認預約').then(function (ok) {
      if (!ok) { toast('已取消預約操作'); return; }
      var res = S.create(f.id, date, hour, name);
      if (res.ok) {
        selectedHour = null;
        toast('預約成功！' + f.name + ' ' + date + ' ' + range(hour), 'ok');
      } else {
        toast(res.msg, 'err');
      }
      renderSlots();
    });
  }

  /* ---------- 我的預約 ---------- */
  function resStatus(r) {
    if (r.status === 'cancelled') return { cls: 'cancelled', tag: '<span class="tag can">已取消</span>' };
    if (S.hasStarted(r)) return { cls: 'started', tag: '<span class="tag done">已開始／已結束</span>' };
    return { cls: '', tag: '<span class="tag act">預約中</span>' };
  }

  function renderMine() {
    var inp = $('mName');
    if (document.activeElement !== inp && !inp.value) inp.value = getName();
    $('mDemoNames').innerHTML = S.studentNames().map(function (n) {
      return '<button type="button" class="chip" data-act="pickName" data-name="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    var name = inp.value.trim(), box = $('myList');
    if (!name) { box.innerHTML = '<div class="empty">請輸入姓名，或點選上方示範姓名查看預約紀錄</div>'; return; }
    var list = S.reservationsOf(name);
    if (!list.length) { box.innerHTML = '<div class="empty">「' + esc(name) + '」目前沒有預約紀錄</div>'; return; }
    box.innerHTML = list.map(function (r) {
      var f = S.facility(r.facilityId), st = resStatus(r);
      return '<div class="item ' + st.cls + '"><div><b>' + esc(f ? f.name : '（已移除場地）') + '</b> ' + st.tag +
        '<div class="sub">📆 ' + r.date + '　🕘 ' + range(r.hour) + '</div></div>' +
        (r.status === 'active' ? '<button class="btn btn-danger btn-sm" data-act="cancel" data-id="' + r.id + '">取消預約</button>' : '') +
        '</div>';
    }).join('');
  }

  function doCancel(id) {
    var r = null;
    S.reservationsOf($('mName').value.trim()).forEach(function (x) { if (x.id === id) r = x; });
    if (!r) { toast('找不到此預約', 'err'); return; }
    if (r.status === 'cancelled') { toast('此預約已取消', 'err'); renderMine(); return; }
    if (S.hasStarted(r)) { toast('無法取消已開始的預約', 'err'); renderMine(); return; }
    var f = S.facility(r.facilityId);
    confirmBox('確認取消預約',
      '<p>' + esc(f ? f.name : '') + '<br>' + r.date + ' ' + range(r.hour) + '<br>取消後該時段將釋放給其他人預約。</p>', '確認取消').then(function (ok) {
      if (!ok) { toast('已保留原預約'); return; }
      var res = S.cancel(id);
      toast(res.ok ? '取消成功，時段已釋放' : res.msg, res.ok ? 'ok' : 'err');
      renderMine();
    });
  }

  /* ---------- 管理員 ---------- */
  function renderAdmin() {
    var d = $('adDate');
    if (!validDate(d.value)) d.value = S.today();
    var fs = S.facilities();
    $('adminFacilities').innerHTML =
      '<tr><th class="l">場地</th><th>類型</th><th class="l">位置</th><th>狀態</th><th>開放時段（時）</th><th>操作</th></tr>' +
      fs.map(function (f) {
        return '<tr><td class="l">' + esc(f.icon) + ' ' + esc(f.name) + '</td><td>' + esc(f.type) + '</td><td class="l">' + esc(f.location) + '</td>' +
          '<td>' + (f.status === 'open' ? '<span class="tag open">開放中</span>' : '<span class="tag closed">暫停開放</span>') + '</td>' +
          '<td><input type="number" min="0" max="23" value="' + f.open + '" id="o_' + f.id + '" style="width:64px"> – ' +
          '<input type="number" min="1" max="24" value="' + f.close + '" id="c_' + f.id + '" style="width:64px"></td>' +
          '<td><button class="btn btn-ghost btn-sm" data-act="saveHours" data-id="' + f.id + '">儲存時段</button> ' +
          '<button class="btn btn-primary btn-sm" data-act="toggle" data-id="' + f.id + '">' + (f.status === 'open' ? '設為暫停' : '設為開放') + '</button></td></tr>';
      }).join('');

    var date = d.value, minH = 24, maxH = 0;
    fs.forEach(function (f) { minH = Math.min(minH, f.open); maxH = Math.max(maxH, f.close); });
    var head = '<tr><th class="l">場地＼時段</th>';
    for (var h = minH; h < maxH; h++) head += '<th>' + pad(h) + ':00</th>';
    head += '</tr>';
    var body = fs.map(function (f) {
      var row = '<tr><td class="l">' + esc(f.name) + '</td>';
      for (var h = minH; h < maxH; h++) {
        if (h < f.open || h >= f.close) { row += '<td class="c-none">–</td>'; continue; }
        var st = S.slotStatus(f, date, h), rec = S.activeAt(f.id, date, h);
        var txt = { free: '空', booked: rec ? esc(rec.student) : '已約', past: rec ? esc(rec.student) : '已過', closed: '未開放' }[st];
        row += '<td class="c-' + st + '">' + txt + '</td>';
      }
      return row + '</tr>';
    }).join('');
    $('adminBoard').innerHTML = head + body;

    var recs = S.reservationsOn(date);
    $('adminDetail').innerHTML = recs.length ? recs.map(function (r) {
      var f = S.facility(r.facilityId);
      return '<div class="item"><div><b>' + esc(f ? f.name : '') + '</b> ' + resStatus(r).tag +
        '<div class="sub">🕘 ' + range(r.hour) + '　👤 ' + esc(r.student) + '</div></div></div>';
    }).join('') : '<div class="empty">此日期沒有有效預約</div>';
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) { show(nav.getAttribute('data-nav')); return; }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (act === 'goBook') {
      selectedHour = null;
      show('book');
      $('bFacility').value = id;
      var dt = el.getAttribute('data-date');
      if (validDate(dt) && dt >= S.today()) $('bDate').value = dt;
      renderSlots();
    } else if (act === 'slot') {
      var h = +el.getAttribute('data-hour');
      var f = S.facility($('bFacility').value);
      var st = S.slotStatus(f, $('bDate').value, h);
      if (st === 'free') { selectedHour = selectedHour === h ? null : h; renderSlots(); }
      else toast({ booked: '該時段已被預約，請重新選擇', past: '無法預約過去或已開始的時段', closed: '此場地目前未開放預約' }[st], 'err');
    } else if (act === 'pickName') {
      $('mName').value = el.getAttribute('data-name');
      setName($('mName').value);
      renderMine();
    } else if (act === 'cancel') {
      doCancel(id);
    } else if (act === 'toggle') {
      var ff = S.facility(id), next = ff.status === 'open' ? 'closed' : 'open';
      S.setStatus(id, next);
      toast(ff.name + (next === 'open' ? ' 已設為開放' : ' 已設為暫停開放'), 'ok');
      renderAdmin();
    } else if (act === 'saveHours') {
      var o = parseInt($('o_' + id).value, 10), c = parseInt($('c_' + id).value, 10);
      if (isNaN(o) || isNaN(c) || !S.setHours(id, o, c)) toast('開放時段不正確（開始需小於結束，範圍 0–24）', 'err');
      else toast('開放時段已更新', 'ok');
      renderAdmin();
    }
  });

  $('menuBtn').addEventListener('click', function () {
    var open = $('mainNav').classList.toggle('open');
    this.setAttribute('aria-expanded', String(open));
  });
  $('fType').addEventListener('change', renderFacilities);
  $('fDate').addEventListener('change', renderFacilities);
  $('bFacility').addEventListener('change', function () { selectedHour = null; renderSlots(); });
  $('bDate').addEventListener('change', function () {
    selectedHour = null;
    if (!validDate(this.value) || this.value < S.today()) { toast('過去日期無法預約', 'err'); this.value = S.today(); }
    renderSlots();
  });
  $('bName').addEventListener('input', function () { setName(this.value.trim()); });
  $('bSubmit').addEventListener('click', submitBooking);
  $('mName').addEventListener('input', function () { setName(this.value.trim()); renderMine(); });
  $('adDate').addEventListener('change', renderAdmin);
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var o = parseInt($('aOpen').value, 10), c = parseInt($('aClose').value, 10);
    var name = $('aName').value.trim(), type = $('aType').value.trim(), loc = $('aLoc').value.trim();
    if (!name || !type || !loc) { toast('請填寫完整場地資料', 'err'); return; }
    if (isNaN(o) || isNaN(c) || o < 0 || c > 24 || o >= c) { toast('開放時段不正確（開始需小於結束）', 'err'); return; }
    S.addFacility({ name: name, type: type, location: loc, open: o, close: c });
    this.reset(); $('aOpen').value = 8; $('aClose').value = 21;
    toast('已新增場地：' + name, 'ok');
    renderAdmin();
  });
  $('resetBtn').addEventListener('click', function () {
    confirmBox('重設示範資料', '<p>將清除所有預約與場地修改，並還原預設示範資料。</p>', '確認重設').then(function (ok) {
      if (!ok) return;
      S.reset(); selectedHour = null;
      toast('示範資料已重設', 'ok');
      renderAll();
    });
  });

  // 定時刷新，讓「已開始」狀態隨時間更新
  setInterval(function () { if (!$('dlg').open && currentView !== 'admin' && currentView !== 'book') renderAll(); }, 60000 * 5);
  // 換日或其他分頁修改資料時同步畫面
  window.addEventListener('storage', function () { location.reload(); });

  show('home');
})();
