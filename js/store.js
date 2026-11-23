/* 資料層：對應 UML 的 Facility / TimeSlot / Reservation，使用 localStorage 儲存 */
(function () {
  'use strict';
  var KEY = 'csr_demo_v1';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dateStr(d); }
  function startOf(date, hour) {
    var p = date.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], hour, 0, 0);
  }
  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function seed() {
    var now = new Date().toISOString();
    function r(f, d, h, who) {
      return { id: uid(), facilityId: f, date: d, hour: h, student: who, status: 'active', createdAt: now };
    }
    return {
      facilities: [
        { id: 'f1', name: '籃球場 A', type: '籃球', icon: '🏀', location: '體育館 1 樓', open: 8, close: 21, status: 'open' },
        { id: 'f2', name: '羽球場 B', type: '羽球', icon: '🏸', location: '體育館 2 樓', open: 9, close: 20, status: 'open' },
        { id: 'f3', name: '排球場 C', type: '排球', icon: '🏐', location: '戶外運動場西側', open: 8, close: 18, status: 'open' }
      ],
      reservations: [
        r('f1', addDays(-1), 10, '王小明'),
        r('f1', dateStr(new Date()), 8, '王小明'),
        r('f1', addDays(1), 18, '王小明'),
        r('f1', addDays(1), 19, '陳小美'),
        r('f2', addDays(1), 15, '陳小美'),
        r('f2', addDays(2), 17, '林同學'),
        r('f3', addDays(2), 16, '林同學'),
        r('f3', addDays(3), 10, '王小明')
      ]
    };
  }

  var data;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.facilities) && Array.isArray(d.reservations)) return d;
      }
    } catch (e) { /* 資料損毀則重建 */ }
    var s = seed();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 忽略 */ }
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  data = load();

  var Store = {
    dateStr: dateStr,
    startOf: startOf,
    today: function () { return dateStr(new Date()); },
    facilities: function () { return data.facilities; },
    facility: function (id) { return data.facilities.filter(function (f) { return f.id === id; })[0]; },
    hours: function (f) { var a = []; for (var h = f.open; h < f.close; h++) a.push(h); return a; },
    activeAt: function (fid, date, hour) {
      return data.reservations.filter(function (r) {
        return r.facilityId === fid && r.date === date && r.hour === hour && r.status === 'active';
      })[0];
    },
    /* free / booked / past / closed */
    slotStatus: function (f, date, hour) {
      if (f.status !== 'open') return 'closed';
      if (startOf(date, hour) <= new Date()) return 'past';
      if (Store.activeAt(f.id, date, hour)) return 'booked';
      return 'free';
    },
    hasStarted: function (r) { return startOf(r.date, r.hour) <= new Date(); },
    reservationsOf: function (name) {
      return data.reservations.filter(function (r) { return r.student === name; })
        .sort(function (a, b) { return startOf(b.date, b.hour) - startOf(a.date, a.hour); });
    },
    reservationsOn: function (date) {
      return data.reservations.filter(function (r) { return r.date === date && r.status === 'active'; })
        .sort(function (a, b) { return a.hour - b.hour; });
    },
    studentNames: function () {
      var s = [];
      data.reservations.forEach(function (r) { if (s.indexOf(r.student) < 0) s.push(r.student); });
      return s;
    },
    /* 建立預約：再次檢查所有規則，回傳 {ok, msg, reservation} */
    create: function (fid, date, hour, name) {
      var f = Store.facility(fid);
      if (!f) return { ok: false, msg: '找不到場地' };
      if (!name) return { ok: false, msg: '請輸入預約人姓名' };
      if (hour < f.open || hour >= f.close) return { ok: false, msg: '該時段不在開放時間內' };
      if (f.status !== 'open') return { ok: false, msg: '此場地目前未開放預約' };
      if (startOf(date, hour) <= new Date()) return { ok: false, msg: '無法預約過去或已開始的時段' };
      if (Store.activeAt(fid, date, hour)) return { ok: false, msg: '該時段已被預約，請重新選擇' };
      var rec = { id: uid(), facilityId: fid, date: date, hour: hour, student: name, status: 'active', createdAt: new Date().toISOString() };
      data.reservations.push(rec);
      if (!save()) { data.reservations.pop(); return { ok: false, msg: '預約失敗，請稍後再試' }; }
      return { ok: true, reservation: rec };
    },
    cancel: function (id) {
      var r = data.reservations.filter(function (x) { return x.id === id; })[0];
      if (!r) return { ok: false, msg: '找不到此預約' };
      if (r.status === 'cancelled') return { ok: false, msg: '此預約已取消' };
      if (Store.hasStarted(r)) return { ok: false, msg: '無法取消已開始的預約' };
      r.status = 'cancelled';
      r.cancelledAt = new Date().toISOString();
      if (!save()) { r.status = 'active'; return { ok: false, msg: '取消失敗，請稍後再試' }; }
      return { ok: true };
    },
    setStatus: function (fid, status) {
      var f = Store.facility(fid); if (!f) return false;
      f.status = status; return save();
    },
    setHours: function (fid, open, close) {
      var f = Store.facility(fid);
      if (!f || !(open >= 0 && close <= 24 && open < close)) return false;
      f.open = open; f.close = close; return save();
    },
    addFacility: function (o) {
      data.facilities.push({ id: 'f' + Date.now().toString(36), name: o.name, type: o.type, icon: '🏟️', location: o.location, open: o.open, close: o.close, status: 'open' });
      return save();
    },
    reset: function () { data = seed(); return save(); }
  };
  window.Store = Store;
})();
