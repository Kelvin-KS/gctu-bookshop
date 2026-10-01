/* GCTU Bookshop · librarian (admin) screens.
   Runs on sample data and keeps changes in this browser (localStorage "gb-admin") until the
   database is connected. Real protection comes from database rules later; this page only
   checks the demo session so visitors land in the right place.
   All text from data or forms is inserted with textContent, never as HTML. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DAY = 86400000;

  // ---------- who is signed in ----------
  function readSession() { try { return JSON.parse(localStorage.getItem('gb-demo') || 'null'); } catch (e) { return null; } }
  var who = readSession();
  if (!who || who.role !== 'librarian') { location.replace('/admin/'); return; }
  document.getElementById('signout').addEventListener('click', function () {
    try { localStorage.removeItem('gb-demo'); sessionStorage.setItem('gb-flash', 'Signed out of the admin demo.'); } catch (e) {}
    location.href = '/';
  });

  // ---------- helpers ----------
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function cedi(n) { return 'GH₵ ' + Number(n).toLocaleString('en-GB'); }
  function fmtDate(t, withTime) { var d = new Date(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + (withTime ? ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''); }
  function isoDay(t) { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  var toastT;
  function toast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function field(label, input, hint, id) {
    var w = el('div', 'fld'); var l = el('label', null, label); input.id = id; l.htmlFor = id; w.appendChild(l); w.appendChild(input);
    var e = el('span', 'err'); e.id = id + '-e'; input.setAttribute('aria-describedby', e.id); w.appendChild(e);
    if (hint) w.appendChild(el('small', 'hint-s', hint));
    return w;
  }
  function input(type, value, attrs) { var i = el('input'); i.type = type || 'text'; if (value != null) i.value = value; for (var k in (attrs || {})) i.setAttribute(k, attrs[k]); return i; }
  function select(opts, value) { var s = el('select'); opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === value) op.selected = true; s.appendChild(op); }); return s; }
  function setErr(i, m) { var e = document.getElementById(i.id + '-e'); if (e) e.textContent = m || ''; i.setAttribute('aria-invalid', m ? 'true' : 'false'); }
  function pill(text, kind) { return el('span', 'pill-s ' + (kind || ''), text); }

  // ---------- drawer (side panel) ----------
  var lastFocus = null;
  function drawer(title, build) {
    closeDrawer();
    lastFocus = document.activeElement;
    var wrap = el('div', 'drawer'); wrap.id = 'drawer'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'dr-t');
    var panel = el('div', 'drawer-panel');
    var head = el('div', 'drawer-head'); var h = el('h2', null, title); h.id = 'dr-t'; head.appendChild(h);
    var x = el('button', 'icon-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', closeDrawer); head.appendChild(x);
    panel.appendChild(head); var body = el('div', 'drawer-body'); panel.appendChild(body); build(body);
    wrap.appendChild(panel); document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeDrawer(); });
    var f = body.querySelector('input,select,textarea,button'); (f || x).focus();
  }
  function closeDrawer() { var d = document.getElementById('drawer'); if (d) { d.remove(); if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus(); } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  // ---------- data ----------
  var CAT, SAMPLE, ST;
  var KEY = 'gb-admin';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { toast('This browser blocked saving, so changes will be lost on refresh.'); } }
  function seed() {
    var now = Date.now();
    var orders = SAMPLE.orders.map(function (o) {
      var t = o.time.split(':'), d = new Date(dayStart(now - o.daysAgo * DAY)); d.setHours(+t[0], +t[1]);
      var at = Math.min(d.getTime(), now - 60000);
      return { id: o.id, student: o.student, items: o.items, delivery: o.delivery, status: o.status, code: o.code, at: at, log: [{ s: 'paid', at: at }] };
    });
    // Promotions: start from the same sample schedule the shop shows, as real dates.
    var P = CAT.promotions, start = Date.parse(P.epoch), total = 0; P.cycle.forEach(function (c) { total += c.days * DAY; });
    var into = (now - start) % total, t0 = now - into, i = 0, promos = [];
    for (; i < P.cycle.length; i++) { if (into < P.cycle[i].days * DAY) break; into -= P.cycle[i].days * DAY; t0 += P.cycle[i].days * DAY; }
    for (var k = 0; k < 3; k++) { var c = P.cycle[(i + k) % P.cycle.length]; promos.push({ id: 'PR-' + (k + 1), item: c.item, percent: c.percent, start: t0, end: t0 + c.days * DAY }); t0 += c.days * DAY; }
    var lect = SAMPLE.lecturers.map(function (l) { var x = Object.assign({}, l); if (l.status === 'setup') { x.code = newCode(); x.codeExpires = now + l.codeDaysLeft * DAY; } return x; });
    var reqs = SAMPLE.requests.map(function (r) { var x = Object.assign({}, r); x.at = now - r.daysAgo * DAY; return x; });
    ST = { v: 1, orders: orders, students: SAMPLE.students.slice(), lecturers: lect, requests: reqs, books: {}, ess: {}, newBooks: [], promotions: promos, nextOrder: 1079 };
    save();
  }
  function newCode() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s.slice(0, 3) + '-' + s.slice(3); }
  function book(id) {
    var b = CAT.books.filter(function (x) { return x.id === id; })[0] || ST.newBooks.filter(function (x) { return x.id === id; })[0];
    if (!b) return null; return Object.assign({}, b, ST.books[id] || {});
  }
  function ess(id) { var e = CAT.essentials.filter(function (x) { return x.id === id; })[0]; return e ? Object.assign({}, e, ST.ess[id] || {}) : null; }
  function allBooks() { return CAT.books.concat(ST.newBooks).map(function (b) { return book(b.id); }); }
  function allEss() { return CAT.essentials.map(function (e) { return ess(e.id); }); }
  function student(id) { return ST.students.filter(function (s) { return s.id === id; })[0] || { name: 'Unknown', id: id }; }
  function itemInfo(it) {
    var x = it.kind === 'ess' ? ess(it.id) : book(it.id);
    if (!x) return { name: it.id, unit: 0 };
    var unit = it.kind === 'ess' ? x.price : it.format === 'hard' ? x.price : (x.source === 'openstax' ? 0 : Math.round(x.price * (100 - x.saving) / 100));
    return { name: it.kind === 'ess' ? x.name : x.title, unit: unit, fmt: it.kind === 'ess' ? 'Item' : it.format === 'hard' ? 'Hard copy' : 'E-book' };
  }
  var FEES = { pickup: 0, accra: 25, ghana: 45, none: 0 };
  function orderTotal(o) { var s = 0; o.items.forEach(function (it) { s += itemInfo(it).unit * it.qty; }); return s + FEES[o.delivery]; }

  // ---------- order flow ----------
  var FLOW = { pickup: ['paid', 'preparing', 'ready', 'done'], accra: ['paid', 'preparing', 'out', 'done'], ghana: ['paid', 'preparing', 'out', 'done'], none: ['done'] };
  var LABEL = { paid: 'To pack', preparing: 'Being prepared', ready: 'Ready for pickup', out: 'Out for delivery' };
  function statusLabel(o) { if (o.status === 'done') return o.delivery === 'pickup' ? 'Collected' : o.delivery === 'none' ? 'E-books delivered' : 'Delivered'; return LABEL[o.status]; }
  function statusKind(o) { return o.status === 'paid' ? 'warn' : o.status === 'done' ? 'ok' : 'info'; }
  var DEL = { pickup: 'Campus pickup', accra: 'Delivery in Accra', ghana: 'Courier, elsewhere in Ghana', none: 'E-books only' };

  // ---------- routing ----------
  var main = document.getElementById('adm-main');
  var VIEWS = { dashboard: dashboard, orders: orders, books: books, people: people, promotions: promotions, requests: requests, settings: settings };
  function route() {
    var v = (location.hash || '#dashboard').slice(1).split('/')[0]; if (!VIEWS[v]) v = 'dashboard';
    document.querySelectorAll('#adm-nav a[data-v]').forEach(function (a) { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    closeDrawer(); main.replaceChildren(); VIEWS[v](); badges();
    document.title = (v[0].toUpperCase() + v.slice(1)) + ' · Admin · GCTU Bookshop';
    if (!reduce) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); }
    window.scrollTo(0, 0); main.focus({ preventScroll: true });
  }
  function badges() {
    var n = ST.orders.filter(function (o) { return o.status === 'paid'; }).length, r = ST.requests.filter(function (q) { return q.status === 'waiting'; }).length;
    var a = document.getElementById('n-orders'), b = document.getElementById('n-requests');
    a.textContent = n || ''; a.hidden = !n; a.setAttribute('aria-label', n + ' to pack');
    b.textContent = r || ''; b.hidden = !r; b.setAttribute('aria-label', r + ' waiting');
  }
  function head(title, sub, actions) {
    var h = el('header', 'adm-head'); var t = el('div'); t.appendChild(el('h1', null, title)); if (sub) t.appendChild(el('p', null, sub)); h.appendChild(t);
    if (actions) { var a = el('div', 'adm-actions'); actions.forEach(function (x) { a.appendChild(x); }); h.appendChild(a); }
    main.appendChild(h);
  }
  function btn(text, cls, fn) { var b = el('button', 'btn ' + (cls || 'slate'), text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function tableWrap(cols) {
    var w = el('div', 'tbl-wrap'), t = el('table', 'tbl'), th = el('thead'), tr = el('tr');
    cols.forEach(function (c) { var x = el('th', c[1] || null, c[0]); x.scope = 'col'; tr.appendChild(x); });
    th.appendChild(tr); t.appendChild(th); var tb = el('tbody'); t.appendChild(tb); w.appendChild(t); return { wrap: w, body: tb };
  }
  function tabs(list, current, onPick) {
    var g = el('div', 'adm-tabs'); g.setAttribute('role', 'group');
    list.forEach(function (x) { var b = el('button', null, x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(x[0] === current)); b.addEventListener('click', function () { g.querySelectorAll('button').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); }); onPick(x[0]); }); g.appendChild(b); });
    return g;
  }

  // ================= DASHBOARD =================
  function currentPromos() { var now = Date.now(); return ST.promotions.filter(function (p) { return p.start <= now && now < p.end; }).sort(function (a, b) { return a.end - b.end; }); }
  function dashboard() {
    var now = Date.now();
    var hr = new Date().getHours();
    head((hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'), 'Here’s what needs doing in the bookshop today.', [btn('+ Add a book', 'slate', function () { location.hash = '#books/new'; })]);
    var toPack = ST.orders.filter(function (o) { return o.status === 'paid'; });
    var ready = ST.orders.filter(function (o) { return o.status === 'ready'; });
    var week = ST.orders.filter(function (o) { return o.at > now - 7 * DAY; });
    var weekSales = week.reduce(function (s, o) { return s + orderTotal(o); }, 0);
    var low = allBooks().filter(function (b) { return b.stock <= 3; }).concat(allEss().filter(function (e) { return e.stock <= 3; }));
    var waiting = ST.requests.filter(function (r) { return r.status === 'waiting'; });
    var k = el('section', 'kpis'); k.setAttribute('aria-label', 'Today at a glance');
    [[toPack.length, 'orders to pack', '#orders/paid', toPack.length ? 'warn' : ''], [ready.length, 'waiting for pickup', '#orders/ready', ''], [cedi(weekSales), 'sales in the last 7 days', '#orders/all', ''], [low.length, 'items low on stock', '#books/low', low.length ? 'warn' : ''], [waiting.length, 'book requests waiting', '#requests', waiting.length ? 'warn' : '']]
      .forEach(function (x) { var a = el('a', 'kpi ' + x[3]); a.href = x[2]; a.appendChild(el('b', null, String(x[0]))); a.appendChild(el('span', null, x[1])); k.appendChild(a); });
    main.appendChild(k);
    var grid = el('div', 'dash-grid');
    // sales chart, last 14 days
    var chart = el('section', 'card-a chart-card'); chart.appendChild(el('h2', null, 'Sales, last 14 days'));
    var days = []; for (var i = 13; i >= 0; i--) { var d0 = dayStart(now - i * DAY); days.push({ t: d0, v: 0, n: 0 }); }
    ST.orders.forEach(function (o) { var d = dayStart(o.at); days.forEach(function (x) { if (x.t === d) { x.v += orderTotal(o); x.n++; } }); });
    var max = Math.max.apply(null, days.map(function (x) { return x.v; })) || 1, nice = Math.ceil(max / 200) * 200;
    var NS = 'http://www.w3.org/2000/svg', W = 640, H = 220, padL = 46, padB = 26, cw = (W - padL - 8) / days.length;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Daily sales for the last 14 days. Highest day ' + cedi(max) + '.');
    function s(tag, attrs, text) { var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (text != null) e.textContent = text; svg.appendChild(e); return e; }
    [0, .5, 1].forEach(function (f) { var y = H - padB - (H - padB - 12) * f; s('line', { x1: padL, x2: W - 8, y1: y, y2: y, 'class': 'grid' }); s('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', 'class': 'ax' }, Math.round(nice * f)); });
    var tip = el('div', 'tip'); tip.hidden = true;
    days.forEach(function (x, j) {
      var h = (H - padB - 12) * (x.v / nice), bx = padL + j * cw + cw * .18, bw = cw * .64, y = H - padB - h;
      var r = s('rect', { x: bx, y: H - padB, width: bw, height: 0, rx: 4, 'class': 'bar' + (j === days.length - 1 ? ' today' : ''), tabindex: 0 });
      r.setAttribute('aria-label', fmtDate(x.t) + ': ' + cedi(x.v) + ' from ' + x.n + ' orders');
      setTimeout(function () { r.setAttribute('y', y); r.setAttribute('height', Math.max(h, x.v ? 2 : 0)); }, reduce ? 0 : 60 + j * 35);
      if (j % 2 === 1 || j === days.length - 1) s('text', { x: bx + bw / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'ax' }, j === days.length - 1 ? 'Today' : new Date(x.t).getDate());
      function show() { tip.hidden = false; tip.textContent = fmtDate(x.t) + ' · ' + cedi(x.v) + ' · ' + x.n + ' order' + (x.n === 1 ? '' : 's'); tip.style.left = ((bx + bw / 2) / W * 100) + '%'; }
      r.addEventListener('mouseenter', show); r.addEventListener('focus', show); r.addEventListener('mouseleave', function () { tip.hidden = true; }); r.addEventListener('blur', function () { tip.hidden = true; });
    });
    var cbox = el('div', 'chart-box'); cbox.appendChild(svg); cbox.appendChild(tip); chart.appendChild(cbox);
    chart.appendChild(el('p', 'note-s', 'Online orders only, including delivery fees. Sample data.'));
    grid.appendChild(chart);
    // needs attention
    var att = el('section', 'card-a'); att.appendChild(el('h2', null, 'Needs attention'));
    var ul = el('ul', 'attn');
    toPack.slice(0, 4).forEach(function (o) { var li = el('li'); var a = el('a', null, o.id + ' · ' + student(o.student).name); a.href = '#orders/open/' + o.id; li.appendChild(pill('To pack', 'warn')); li.appendChild(a); ul.appendChild(li); });
    low.slice(0, 4).forEach(function (b) { var li = el('li'); var a = el('a', null, (b.title || b.name) + ' · ' + b.stock + ' left'); a.href = '#books/low'; li.appendChild(pill(b.stock === 0 ? 'Out' : 'Low', b.stock === 0 ? 'bad' : 'warn')); li.appendChild(a); ul.appendChild(li); });
    waiting.slice(0, 3).forEach(function (r) { var li = el('li'); var a = el('a', null, r.title); a.href = '#requests'; li.appendChild(pill('Request', 'info')); li.appendChild(a); ul.appendChild(li); });
    if (!ul.children.length) ul.appendChild(el('li', null, 'All clear.'));
    att.appendChild(ul); grid.appendChild(att);
    // promotion
    var pr = el('section', 'card-a'); pr.appendChild(el('h2', null, 'Running promotion'));
    var cur = currentPromos()[0];
    if (cur) { var e = ess(cur.item); pr.appendChild(el('p', 'big-line', e.name)); pr.appendChild(el('p', null, cur.percent + '% off for students · ends ' + fmtDate(cur.end - 1) + ' (' + Math.ceil((cur.end - now) / DAY) + ' days left)')); }
    else pr.appendChild(el('p', null, 'No promotion is running right now.'));
    var pa = el('a', 'see', 'Manage promotions →'); pa.href = '#promotions'; pr.appendChild(pa); grid.appendChild(pr);
    // top sellers
    var top = el('section', 'card-a'); top.appendChild(el('h2', null, 'Best sellers, last 30 days'));
    var count = {}; ST.orders.filter(function (o) { return o.at > now - 30 * DAY; }).forEach(function (o) { o.items.forEach(function (it) { var n = itemInfo(it).name; count[n] = (count[n] || 0) + it.qty; }); });
    var ol = el('ol', 'sellers'); Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 5).forEach(function (n) { var li = el('li'); li.appendChild(el('span', null, n)); li.appendChild(el('b', null, count[n] + ' sold')); ol.appendChild(li); });
    top.appendChild(ol); grid.appendChild(top);
    main.appendChild(grid);
  }

  // ================= ORDERS =================
  function orders() {
    var parts = location.hash.split('/'), filter = parts[1] && parts[1] !== 'open' ? parts[1] : 'paid';
    head('Orders', 'Move each order forward as you pack, hand over or send it.');
    var q = input('search', '', { placeholder: 'Search order number or student', 'aria-label': 'Search orders' }); q.className = 'adm-search';
    var bar = el('div', 'adm-bar');
    var F = [['paid', 'To pack'], ['preparing', 'Being prepared'], ['ready', 'Ready / out'], ['done', 'Completed'], ['all', 'All']];
    bar.appendChild(tabs(F, filter, function (f) { filter = f; history.replaceState(null, '', '#orders/' + f); render(); }));
    bar.appendChild(q); main.appendChild(bar);
    var T = tableWrap([['Order'], ['Student'], ['Items'], ['Delivery'], ['Total', 'num'], ['Status'], ['Placed']]); main.appendChild(T.wrap);
    var empty = el('p', 'empty-a'); main.appendChild(empty);
    function render() {
      var term = q.value.trim().toLowerCase();
      var list = ST.orders.filter(function (o) {
        var ok = filter === 'all' || o.status === filter || (filter === 'ready' && (o.status === 'ready' || o.status === 'out'));
        return ok && (!term || (o.id + ' ' + student(o.student).name).toLowerCase().indexOf(term) >= 0);
      }).sort(function (a, b) { return filter === 'paid' ? a.at - b.at : b.at - a.at; });
      T.body.replaceChildren();
      list.forEach(function (o) {
        var tr = el('tr', 'row-link'); tr.tabIndex = 0; tr.setAttribute('aria-label', 'Open order ' + o.id);
        var c1 = el('td'); c1.appendChild(el('b', null, o.id)); tr.appendChild(c1);
        tr.appendChild(el('td', null, student(o.student).name));
        tr.appendChild(el('td', null, o.items.reduce(function (n, i) { return n + i.qty; }, 0) + ''));
        tr.appendChild(el('td', null, DEL[o.delivery]));
        tr.appendChild(el('td', 'num', cedi(orderTotal(o))));
        var st = el('td'); st.appendChild(pill(statusLabel(o), statusKind(o))); tr.appendChild(st);
        tr.appendChild(el('td', 'muted-a', fmtDate(o.at, true)));
        function open() { history.replaceState(null, '', '#orders/open/' + o.id); orderDrawer(o, render); }
        tr.addEventListener('click', open); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        T.body.appendChild(tr);
      });
      empty.textContent = list.length ? '' : (filter === 'paid' ? 'Nothing to pack. Nice.' : 'No orders here.');
      badges();
    }
    q.addEventListener('input', render); render();
    if (parts[1] === 'open' && parts[2]) { var o = ST.orders.filter(function (x) { return x.id === parts[2]; })[0]; if (o) orderDrawer(o, render); }
  }
  function orderDrawer(o, after) {
    drawer('Order ' + o.id, function (b) {
      var s = student(o.student);
      var meta = el('dl', 'meta-a');
      [['Student', s.name + ' (' + s.id + ')'], ['Placed', fmtDate(o.at, true)], ['Delivery', DEL[o.delivery]], ['Total', cedi(orderTotal(o))]].forEach(function (x) { var d = el('div'); d.appendChild(el('dt', null, x[0])); d.appendChild(el('dd', null, x[1])); meta.appendChild(d); });
      b.appendChild(meta);
      var items = el('ul', 'items-a');
      o.items.forEach(function (it) { var inf = itemInfo(it), li = el('li'); li.appendChild(el('span', null, inf.name)); li.appendChild(el('span', 'muted-a', inf.fmt + ' × ' + it.qty)); li.appendChild(el('b', null, cedi(inf.unit * it.qty))); items.appendChild(li); });
      b.appendChild(items);
      var flow = FLOW[o.delivery], idx = flow.indexOf(o.status);
      var steps = el('ol', 'steps-a');
      flow.forEach(function (st, i) { var li = el('li', i <= idx ? 'done' : ''); li.appendChild(el('span', 'dot-a', String(i + 1))); li.appendChild(el('span', null, st === 'done' ? (o.delivery === 'pickup' ? 'Collected' : o.delivery === 'none' ? 'Delivered' : 'Delivered') : LABEL[st])); steps.appendChild(li); });
      b.appendChild(steps);
      if (o.status === 'done') { b.appendChild(el('p', 'ok-a', 'This order is complete.')); return; }
      var next = flow[idx + 1];
      if (next === 'done' && o.delivery === 'pickup') {
        b.appendChild(el('p', null, 'Ask the student for their 4-digit pickup code, then enter it to hand over the books.'));
        var code = input('text', '', { inputmode: 'numeric', maxlength: '4', autocomplete: 'off' });
        b.appendChild(field('Pickup code', code, 'Demo: the code for this order is ' + o.code + '.', 'pk'));
        b.appendChild(btn('Hand over and mark collected', 'slate', function () {
          if (!/^\d{4}$/.test(code.value)) { setErr(code, 'Enter the 4 digits.'); code.focus(); return; }
          if (code.value !== o.code) { setErr(code, 'That code doesn’t match this order. Don’t hand over the books.'); code.select(); return; }
          advance(o, 'done'); toast(o.id + ' collected.'); closeDrawer(); after();
        }));
      } else {
        var labels = { preparing: 'Start packing', ready: 'Mark ready for pickup', out: 'Mark out for delivery', done: 'Mark delivered' };
        b.appendChild(btn(labels[next], 'slate', function () { advance(o, next); toast(o.id + ': ' + statusLabel(o) + '.'); closeDrawer(); after(); }));
      }
      b.appendChild(el('p', 'note-s', 'Steps only move forward. The student’s tracking page updates when the database is connected.'));
    });
  }
  function advance(o, st) { o.status = st; o.log.push({ s: st, at: Date.now() }); save(); }

  // ================= BOOKS & STOCK =================
  function books() {
    var parts = location.hash.split('/'), tab = parts[1] === 'ess' ? 'ess' : 'books', onlyLow = parts[1] === 'low';
    head('Books & stock', 'Change prices, the e-book saving and stock. Changes show in the shop on this browser.', [btn('+ Add a book', 'slate', addBook)]);
    var bar = el('div', 'adm-bar');
    bar.appendChild(tabs([['books', 'Books'], ['ess', 'Campus essentials']], tab, function (t) { tab = t; history.replaceState(null, '', '#books' + (t === 'ess' ? '/ess' : '')); render(); }));
    var lowBox = el('label', 'chk'); var lowC = input('checkbox'); lowC.checked = onlyLow; lowBox.appendChild(lowC); lowBox.appendChild(document.createTextNode(' Low stock only (3 or fewer)'));
    var q = input('search', '', { placeholder: 'Search title or author', 'aria-label': 'Search stock' }); q.className = 'adm-search';
    bar.appendChild(lowBox); bar.appendChild(q); main.appendChild(bar);
    var host = el('div'); main.appendChild(host);
    function numCell(v, min, max, label) { var i = input('number', v, { min: min, max: max, step: '1', 'aria-label': label }); i.className = 'num-in'; return i; }
    function render() {
      host.replaceChildren();
      var term = q.value.trim().toLowerCase();
      if (tab === 'books') {
        var T = tableWrap([['Book'], ['Genre'], ['Hard copy GH₵', 'num'], ['E-book saving %', 'num'], ['Stock', 'num'], ['']]);
        allBooks().filter(function (b) { return (!lowC.checked || b.stock <= 3) && (!term || (b.title + ' ' + b.author).toLowerCase().indexOf(term) >= 0); }).forEach(function (b) {
          var tr = el('tr'), c = el('td', 'book-cell');
          if (b.cover || b.art) { var im = el('img'); im.src = b.cover || b.art; im.alt = ''; im.width = 28; im.height = 40; im.loading = 'lazy'; c.appendChild(im); }
          var t = el('span'); t.appendChild(el('b', null, b.title)); t.appendChild(el('small', null, b.author)); c.appendChild(t); tr.appendChild(c);
          tr.appendChild(el('td', 'muted-a', b.genre === 'text' ? 'Textbook' : (CAT.genres.filter(function (g) { return g.id === b.genre; })[0] || {}).name || b.genre));
          var p = numCell(b.price, 1, 2000, 'Hard copy price for ' + b.title), sv = numCell(b.saving == null ? '' : b.saving, 3, 10, 'E-book saving for ' + b.title), stk = numCell(b.stock, 0, 999, 'Stock for ' + b.title);
          if (b.source === 'openstax') { sv.disabled = true; sv.placeholder = 'free'; sv.title = 'OpenStax e-books are free'; }
          [p, sv, stk].forEach(function (i) { var td = el('td', 'num'); td.appendChild(i); tr.appendChild(td); });
          var act = el('td'); var sb = btn('Save', 'line sm', function () {
            var price = +p.value, saving = b.source === 'openstax' ? null : +sv.value, stock = +stk.value;
            if (!(price >= 1)) { toast('Enter a hard-copy price of at least GH₵ 1.'); p.focus(); return; }
            if (saving !== null && (!(saving >= 3 && saving <= 10) || saving % 1)) { toast('The e-book saving must be a whole number from 3 to 10%.'); sv.focus(); return; }
            if (!(stock >= 0) || stock % 1) { toast('Stock must be 0 or more.'); stk.focus(); return; }
            ST.books[b.id] = { price: price, saving: saving, stock: stock }; save(); toast('Saved ' + b.title + '.'); render();
          }); act.appendChild(sb); tr.appendChild(act);
          if (b.stock <= 3) tr.classList.add(b.stock === 0 ? 'row-bad' : 'row-warn');
          T.body.appendChild(tr);
        });
        host.appendChild(T.wrap);
        host.appendChild(el('p', 'note-s', 'E-book price = hard-copy price minus the saving (3–10%), worked out automatically. Students get a further 10% at checkout.'));
      } else {
        var T2 = tableWrap([['Item'], ['Price GH₵', 'num'], ['Stock', 'num'], ['']]);
        allEss().filter(function (e) { return (!lowC.checked || e.stock <= 3) && (!term || e.name.toLowerCase().indexOf(term) >= 0); }).forEach(function (e) {
          var tr = el('tr'), c = el('td', 'book-cell'); var im = el('img'); im.src = e.img; im.alt = ''; im.width = 40; im.height = 40; im.loading = 'lazy'; c.appendChild(im); c.appendChild(el('b', null, e.name)); tr.appendChild(c);
          var p = numCell(e.price, 1, 5000, 'Price for ' + e.name), stk = numCell(e.stock, 0, 999, 'Stock for ' + e.name);
          [p, stk].forEach(function (i) { var td = el('td', 'num'); td.appendChild(i); tr.appendChild(td); });
          var act = el('td'); act.appendChild(btn('Save', 'line sm', function () {
            if (!(+p.value >= 1)) { toast('Enter a price of at least GH₵ 1.'); p.focus(); return; }
            if (!(+stk.value >= 0) || +stk.value % 1) { toast('Stock must be 0 or more.'); stk.focus(); return; }
            ST.ess[e.id] = { price: +p.value, stock: +stk.value }; save(); toast('Saved ' + e.name + '.'); render();
          })); tr.appendChild(act);
          if (e.stock <= 3) tr.classList.add(e.stock === 0 ? 'row-bad' : 'row-warn');
          T2.body.appendChild(tr);
        });
        host.appendChild(T2.wrap);
      }
    }
    lowC.addEventListener('change', render); q.addEventListener('input', render); render();
    if (parts[1] === 'new') addBook();
  }
  function addBook() {
    drawer('Add a book', function (b) {
      var f = el('form'); f.noValidate = true;
      var title = input('text'), author = input('text'), genre = select(CAT.genres.filter(function (g) { return g.id !== 'essentials' && g.id !== 'afr' && g.id !== 'text'; }).map(function (g) { return [g.id, g.name]; }), 'myst');
      var year = input('number', '', { min: '1500', max: '1955' }), price = input('number', '', { min: '1' }), saving = input('number', '5', { min: '3', max: '10' }), stock = input('number', '0', { min: '0' });
      var blurb = el('textarea'); blurb.rows = 3;
      f.appendChild(field('Title', title, null, 'nb-t')); f.appendChild(field('Author', author, 'Public domain only: the author must have died more than 70 years ago.', 'nb-a'));
      f.appendChild(field('Genre', genre, null, 'nb-g')); f.appendChild(field('First published', year, null, 'nb-y'));
      var row = el('div', 'two-a'); row.appendChild(field('Hard copy GH₵', price, null, 'nb-p')); row.appendChild(field('E-book saving %', saving, '3 to 10', 'nb-s')); row.appendChild(field('Stock', stock, null, 'nb-k')); f.appendChild(row);
      f.appendChild(field('Short description', blurb, null, 'nb-b'));
      var go = el('button', 'btn slate', 'Add to the catalogue'); go.type = 'submit'; f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var bad = null;
        [title, author, year, price, saving, stock].forEach(function (i) { setErr(i, ''); });
        function no(i, m) { setErr(i, m); bad = bad || i; }
        if (!title.value.trim()) no(title, 'Enter the title.');
        if (!author.value.trim()) no(author, 'Enter the author.');
        if (!(+year.value >= 1500 && +year.value <= 1955)) no(year, 'Enter a year between 1500 and 1955.');
        if (!(+price.value >= 1)) no(price, 'Enter a price.');
        if (!(+saving.value >= 3 && +saving.value <= 10)) no(saving, '3 to 10.');
        if (!(+stock.value >= 0) || stock.value === '') no(stock, '0 or more.');
        if (bad) { bad.focus(); return; }
        var id = 'new-' + title.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Date.now().toString(36).slice(-4);
        ST.newBooks.push({ id: id, title: title.value.trim(), author: author.value.trim(), year: +year.value, genre: genre.value, price: +price.value, saving: +saving.value, stock: +stock.value, source: 'pd', blurb: blurb.value.trim() || 'Added by the librarian.', rank: 50 });
        save(); toast('Added ' + title.value.trim() + '. It now shows in the shop on this browser.'); closeDrawer(); history.replaceState(null, '', '#books'); route();
      });
      b.appendChild(f);
    });
  }

  // ================= PEOPLE =================
  function people() {
    var tab = location.hash.split('/')[1] === 'lecturers' ? 'lecturers' : 'students';
    head('People', 'Only people added here can sign in. There is no public sign-up.', [btn('+ Add a student', 'slate', addStudent), btn('Upload a spreadsheet', 'line', uploadCsv), btn('+ Add a lecturer', 'line', addLecturer)]);
    var bar = el('div', 'adm-bar'); bar.appendChild(tabs([['students', 'Students'], ['lecturers', 'Lecturers']], tab, function (t) { tab = t; history.replaceState(null, '', '#people/' + t); render(); }));
    var q = input('search', '', { placeholder: 'Search name or ID', 'aria-label': 'Search people' }); q.className = 'adm-search'; bar.appendChild(q); main.appendChild(bar);
    var host = el('div'); main.appendChild(host);
    function render() {
      host.replaceChildren(); var term = q.value.trim().toLowerCase(), today = isoDay(Date.now());
      if (tab === 'students') {
        var T = tableWrap([['Name'], ['Student ID'], ['Programme'], ['Level', 'num'], ['Access until'], ['Status']]);
        ST.students.filter(function (s) { return !term || (s.name + ' ' + s.id).toLowerCase().indexOf(term) >= 0; }).forEach(function (s) {
          var tr = el('tr'); tr.appendChild(el('td', null, s.name)); var idc = el('td'); idc.appendChild(el('code', null, s.id)); tr.appendChild(idc);
          tr.appendChild(el('td', 'muted-a', s.programme)); tr.appendChild(el('td', 'num', String(s.level)));
          var gd = input('date', s.graduates, { 'aria-label': 'Graduation date for ' + s.name }); gd.className = 'date-in';
          gd.addEventListener('change', function () { if (!gd.value) return; s.graduates = gd.value; save(); toast('Access for ' + s.name + ' now ends ' + new Date(gd.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '.'); render(); });
          var tdg = el('td'); tdg.appendChild(gd); tr.appendChild(tdg);
          var active = s.graduates >= today; var st = el('td'); st.appendChild(pill(active ? 'Active' : 'Graduated: can browse, can’t buy', active ? 'ok' : 'muted')); tr.appendChild(st);
          T.body.appendChild(tr);
        });
        host.appendChild(T.wrap);
        host.appendChild(el('p', 'note-s', 'After the graduation date, a student can still browse but can no longer sign in to buy. All names and IDs here are fictional.'));
      } else {
        var T2 = tableWrap([['Name'], ['Staff ID'], ['Department'], ['Courses'], ['Status'], ['']]);
        ST.lecturers.filter(function (l) { return !term || (l.name + ' ' + l.id).toLowerCase().indexOf(term) >= 0; }).forEach(function (l) {
          var tr = el('tr'); tr.appendChild(el('td', null, l.name)); var idc = el('td'); idc.appendChild(el('code', null, l.id)); tr.appendChild(idc);
          tr.appendChild(el('td', 'muted-a', l.department));
          var cs = el('td'); l.courses.forEach(function (c) { cs.appendChild(el('span', 'tag-a', c)); }); tr.appendChild(cs);
          var st = el('td'), act = el('td', 'acts-a');
          if (l.status === 'active') st.appendChild(pill('Active', 'ok'));
          else if (l.status === 'off') st.appendChild(pill('Switched off', 'muted'));
          else { var expired = l.codeExpires < Date.now(); st.appendChild(pill(expired ? 'Setup code expired' : 'Waiting for first sign-in', expired ? 'bad' : 'warn')); if (!expired) { var c = el('div', 'code-a'); c.appendChild(document.createTextNode('Code ')); c.appendChild(el('code', null, l.code)); c.appendChild(document.createTextNode(' · ' + Math.ceil((l.codeExpires - Date.now()) / DAY) + ' days left')); st.appendChild(c); } }
          if (l.status !== 'off') act.appendChild(btn(l.status === 'active' ? 'Reset password' : 'New setup code', 'line sm', function () { var was = l.status; l.status = 'setup'; l.code = newCode(); l.codeExpires = Date.now() + 7 * DAY; save(); toast((was === 'active' ? 'Password reset. ' : '') + 'New setup code for ' + l.name + ': ' + l.code + '. Give it to them directly.'); render(); }));
          act.appendChild(btn(l.status === 'off' ? 'Switch back on' : 'Switch off', 'line sm', function () { if (l.status === 'off') { l.status = 'setup'; l.code = newCode(); l.codeExpires = Date.now() + 7 * DAY; toast(l.name + ' switched back on. New setup code: ' + l.code + '.'); } else { l.status = 'off'; l.code = null; toast(l.name + ' can no longer sign in. Their reading lists are hidden.'); } save(); render(); }));
          tr.appendChild(st); tr.appendChild(act); T2.body.appendChild(tr);
        });
        host.appendChild(T2.wrap);
        host.appendChild(el('p', 'note-s', 'Only the librarian sets a lecturer’s courses. A setup code works once and lasts 7 days. Staff accounts don’t expire; switch them off when someone leaves.'));
      }
    }
    q.addEventListener('input', render); render();
  }
  function idOk(v) { return /^[A-Z0-9-]{4,20}$/.test(v); }
  function addStudent() {
    drawer('Add a student', function (b) {
      var f = el('form'); f.noValidate = true;
      var name = input('text'), sid = input('text', '', { autocapitalize: 'characters', spellcheck: 'false' }), prog = input('text', 'BSc Computer Science'), lvl = select([['100', 'Level 100'], ['200', 'Level 200'], ['300', 'Level 300'], ['400', 'Level 400']], '100'), grad = input('date', (new Date().getFullYear() + 4) + '-07-31');
      f.appendChild(field('Full name', name, null, 'ns-n')); f.appendChild(field('Student ID', sid, 'In the demo, start IDs with DEMO- so no real ID is ever entered.', 'ns-i'));
      f.appendChild(field('Programme', prog, null, 'ns-p')); f.appendChild(field('Level', lvl, null, 'ns-l')); f.appendChild(field('Access until (graduation)', grad, null, 'ns-g'));
      var go = el('button', 'btn slate', 'Add student'); go.type = 'submit'; f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault(); [name, sid, grad].forEach(function (i) { setErr(i, ''); });
        var v = sid.value.trim().toUpperCase(), bad = null;
        if (!name.value.trim()) { setErr(name, 'Enter the name.'); bad = bad || name; }
        if (!/^DEMO-/.test(v) || !idOk(v)) { setErr(sid, 'Use a demo ID like DEMO-S-2001 (letters, numbers and dashes).'); bad = bad || sid; }
        else if (ST.students.some(function (s) { return s.id === v; })) { setErr(sid, 'A student with this ID already exists.'); bad = bad || sid; }
        if (!grad.value) { setErr(grad, 'Choose a date.'); bad = bad || grad; }
        if (bad) { bad.focus(); return; }
        ST.students.unshift({ id: v, name: name.value.trim(), programme: prog.value.trim(), level: +lvl.value, graduates: grad.value }); save();
        toast(name.value.trim() + ' added.'); closeDrawer(); history.replaceState(null, '', '#people/students'); route();
      });
      b.appendChild(f);
    });
  }
  function addLecturer() {
    drawer('Add a lecturer', function (b) {
      var f = el('form'); f.noValidate = true;
      var name = input('text'), sid = input('text', '', { autocapitalize: 'characters', spellcheck: 'false' }), dept = input('text'), courses = input('text', '', { placeholder: 'e.g. CSC 205, CSC 301' });
      f.appendChild(field('Full name', name, null, 'nl-n')); f.appendChild(field('Staff ID', sid, 'In the demo, start IDs with DEMO-.', 'nl-i'));
      f.appendChild(field('Department', dept, null, 'nl-d')); f.appendChild(field('Courses they teach', courses, 'Separate course codes with commas. Only you can change these later.', 'nl-c'));
      var go = el('button', 'btn slate', 'Add and create setup code'); go.type = 'submit'; f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault(); [name, sid, courses].forEach(function (i) { setErr(i, ''); });
        var v = sid.value.trim().toUpperCase(), list = courses.value.split(',').map(function (c) { return c.trim().toUpperCase(); }).filter(Boolean), bad = null;
        if (!name.value.trim()) { setErr(name, 'Enter the name.'); bad = bad || name; }
        if (!/^DEMO-/.test(v) || !idOk(v)) { setErr(sid, 'Use a demo ID like DEMO-T-0031.'); bad = bad || sid; }
        else if (ST.lecturers.some(function (l) { return l.id === v; })) { setErr(sid, 'A lecturer with this ID already exists.'); bad = bad || sid; }
        if (!list.length || list.some(function (c) { return !/^[A-Z]{2,5} ?\d{3}$/.test(c); })) { setErr(courses, 'Use course codes like CSC 205, separated by commas.'); bad = bad || courses; }
        if (bad) { bad.focus(); return; }
        var l = { id: v, name: name.value.trim(), department: dept.value.trim() || '—', courses: list, status: 'setup', code: newCode(), codeExpires: Date.now() + 7 * DAY };
        ST.lecturers.unshift(l); save(); closeDrawer(); history.replaceState(null, '', '#people/lecturers'); route();
        toast(l.name + ' added. Setup code ' + l.code + ', valid 7 days.');
      });
      b.appendChild(f);
    });
  }
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  function uploadCsv() {
    drawer('Upload students from a spreadsheet', function (b) {
      b.appendChild(el('p', null, 'Save the spreadsheet as CSV with these columns: name, student_id, programme, level, graduation_date (YYYY-MM-DD). Nothing is added until you check the preview.'));
      var sample = 'name,student_id,programme,level,graduation_date\nKafui Agbeko,DEMO-S-3001,BSc Computer Science,100,2030-07-31\nSelorm Dzah,DEMO-S-3002,BSc Accounting,200,2029-07-31\nAma Owusu,DEMO-S-1040,BSc Computer Science,200,2029-07-31\nMawuli Kpeli,,BSc Economics,300,2028-07-31\n';
      var dl = el('a', 'see', 'Download a sample file ↓'); dl.href = URL.createObjectURL(new Blob([sample], { type: 'text/csv' })); dl.download = 'sample-students.csv'; b.appendChild(dl);
      var fi = input('file', null, { accept: '.csv,text/csv' }); b.appendChild(field('CSV file', fi, null, 'csv-f'));
      var tryS = btn('Or preview the sample file', 'line sm', function () { preview(sample); }); b.appendChild(tryS);
      var out = el('div', 'csv-out'); b.appendChild(out);
      fi.addEventListener('change', function () { var f = fi.files[0]; if (!f) return; if (f.size > 200000) { setErr(fi, 'That file is too big for the demo (200 KB max).'); return; } var r = new FileReader(); r.onload = function () { preview(String(r.result)); }; r.readAsText(f); });
      function preview(text) {
        out.replaceChildren(); var rows = parseCsv(text); if (!rows.length) { out.appendChild(el('p', 'err', 'The file is empty.')); return; }
        var hdr = rows[0].map(function (h) { return h.trim().toLowerCase(); }), need = ['name', 'student_id', 'programme', 'level', 'graduation_date'];
        var miss = need.filter(function (n) { return hdr.indexOf(n) < 0; });
        if (miss.length) { out.appendChild(el('p', 'err', 'Missing column' + (miss.length > 1 ? 's' : '') + ': ' + miss.join(', ') + '.')); return; }
        var seen = {}, good = [], T = tableWrap([['Row', 'num'], ['Name'], ['Student ID'], ['Result']]);
        rows.slice(1, 501).forEach(function (r, i) {
          var g = function (n) { return (r[hdr.indexOf(n)] || '').trim(); };
          var rec = { name: g('name'), id: g('student_id').toUpperCase(), programme: g('programme'), level: +g('level'), graduates: g('graduation_date') }, prob = '';
          if (!rec.name) prob = 'Missing name';
          else if (!rec.id) prob = 'Missing student ID';
          else if (!/^DEMO-/.test(rec.id) || !idOk(rec.id)) prob = 'Not a demo ID (must start DEMO-)';
          else if (seen[rec.id] || ST.students.some(function (s) { return s.id === rec.id; })) prob = 'Duplicate ID';
          else if ([100, 200, 300, 400].indexOf(rec.level) < 0) prob = 'Level must be 100–400';
          else if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.graduates)) prob = 'Date must be YYYY-MM-DD';
          seen[rec.id] = true;
          var tr = el('tr', prob ? 'row-bad' : ''); tr.appendChild(el('td', 'num', String(i + 2))); tr.appendChild(el('td', null, rec.name || '—')); tr.appendChild(el('td', null, rec.id || '—'));
          var res = el('td'); res.appendChild(pill(prob || 'Ready to add', prob ? 'bad' : 'ok')); tr.appendChild(res); T.body.appendChild(tr);
          if (!prob) good.push(rec);
        });
        out.appendChild(T.wrap);
        if (!good.length) { out.appendChild(el('p', 'err', 'No rows can be added. Fix the problems and upload again.')); return; }
        out.appendChild(btn('Add ' + good.length + ' student' + (good.length > 1 ? 's' : '') + ', skip ' + (rows.length - 1 - good.length), 'slate', function () {
          good.forEach(function (s) { ST.students.unshift(s); }); save(); toast(good.length + ' students added.'); closeDrawer(); history.replaceState(null, '', '#people/students'); route();
        }));
      }
    });
  }

  // ================= PROMOTIONS =================
  function promotions() {
    head('Promotions', 'A student discount on one item, for a day up to six weeks. The shop shows the one ending soonest.', [btn('+ New promotion', 'slate', newPromo)]);
    var now = Date.now(), host = el('div'); main.appendChild(host);
    [['Running now', function (p) { return p.start <= now && now < p.end; }], ['Coming up', function (p) { return p.start > now; }], ['Finished', function (p) { return p.end <= now; }]].forEach(function (g) {
      var list = ST.promotions.filter(g[1]).sort(function (a, b) { return a.start - b.start; });
      var sec = el('section', 'promo-group'); sec.appendChild(el('h2', null, g[0]));
      if (!list.length) { sec.appendChild(el('p', 'muted-a', 'None.')); host.appendChild(sec); return; }
      list.forEach(function (p) {
        var e = ess(p.item), c = el('div', 'promo-row');
        var im = el('img'); im.src = e.img; im.alt = ''; im.width = 56; im.height = 56; c.appendChild(im);
        var t = el('div'); t.appendChild(el('b', null, e.name)); t.appendChild(el('span', null, p.percent + '% off for students · ' + fmtDate(p.start) + ' to ' + fmtDate(p.end - 1) + ' · ' + Math.round((p.end - p.start) / DAY) + ' days')); c.appendChild(t);
        var price = el('span', 'promo-price', cedi(Math.round(e.price * (100 - p.percent) / 100)) + ' (was ' + cedi(e.price) + ')'); c.appendChild(price);
        if (p.end > now) c.appendChild(btn(p.start <= now ? 'End now' : 'Cancel', 'line sm', function () { if (p.start <= now) p.end = Date.now(); else ST.promotions = ST.promotions.filter(function (x) { return x !== p; }); save(); toast('Promotion ' + (p.start <= now ? 'ended' : 'cancelled') + '.'); route(); }));
        sec.appendChild(c);
      });
      host.appendChild(sec);
    });
  }
  function newPromo() {
    drawer('New promotion', function (b) {
      var f = el('form'); f.noValidate = true;
      var item = select(allEss().map(function (e) { return [e.id, e.name]; }), allEss()[0].id), pct = input('number', '10', { min: '1', max: '50' });
      var today = isoDay(Date.now()), start = input('date', today, { min: today }), end = input('date', isoDay(Date.now() + 7 * DAY), { min: today });
      f.appendChild(field('Item', item, null, 'np-i')); f.appendChild(field('Student discount %', pct, '1 to 50', 'np-p'));
      var row = el('div', 'two-a'); row.appendChild(field('First day', start, null, 'np-s')); row.appendChild(field('Last day', end, 'Ends at midnight after this day (Accra time).', 'np-e')); f.appendChild(row);
      var prev = el('p', 'note-s'); f.appendChild(prev);
      function upd() { var e = ess(item.value); var n = Math.round((Date.parse(end.value) - Date.parse(start.value)) / DAY) + 1; prev.textContent = e ? 'Students pay ' + cedi(Math.round(e.price * (100 - (+pct.value || 0)) / 100)) + ' instead of ' + cedi(e.price) + (n > 0 ? ' for ' + n + ' day' + (n === 1 ? '' : 's') + '.' : '.') : ''; }
      [item, pct, start, end].forEach(function (i) { i.addEventListener('input', upd); }); upd();
      var go = el('button', 'btn slate', 'Schedule promotion'); go.type = 'submit'; f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault(); [pct, start, end].forEach(function (i) { setErr(i, ''); });
        var s = new Date(start.value + 'T00:00:00').getTime(), en = new Date(end.value + 'T00:00:00').getTime() + DAY, days = Math.round((en - s) / DAY);
        if (!(+pct.value >= 1 && +pct.value <= 50) || +pct.value % 1) { setErr(pct, 'A whole number from 1 to 50.'); pct.focus(); return; }
        if (!start.value || s < dayStart(Date.now())) { setErr(start, 'Start today or later.'); start.focus(); return; }
        if (!end.value || days < 1) { setErr(end, 'The last day can’t be before the first day.'); end.focus(); return; }
        if (days > 42) { setErr(end, 'Promotions can run for up to six weeks (42 days).'); end.focus(); return; }
        var clash = ST.promotions.filter(function (p) { return p.item === item.value && p.end > s && p.start < en; })[0];
        if (clash) { setErr(start, 'This item already has a promotion from ' + fmtDate(clash.start) + ' to ' + fmtDate(clash.end - 1) + '.'); start.focus(); return; }
        ST.promotions.push({ id: 'PR-' + Date.now().toString(36), item: item.value, percent: +pct.value, start: s, end: en }); save();
        toast('Promotion scheduled for ' + days + ' day' + (days === 1 ? '' : 's') + '.'); closeDrawer(); route();
      });
      b.appendChild(f);
    });
  }

  // ================= REQUESTS =================
  function requests() {
    head('Book requests', 'Students ask for titles we don’t stock. Your reply appears in their messages (stage 3).');
    var host = el('div', 'reqs-a'); main.appendChild(host);
    var ORDER = { waiting: 0, ordered: 1, added: 2, no: 3 };
    ST.requests.slice().sort(function (a, b) { return ORDER[a.status] - ORDER[b.status] || b.at - a.at; }).forEach(function (r) {
      var c = el('article', 'req-a' + (r.status === 'waiting' ? ' is-new' : ''));
      var t = el('div'); t.appendChild(el('b', null, r.title)); t.appendChild(el('span', 'muted-a', r.format + ' · ' + student(r.student).name + ' · ' + fmtDate(r.at))); c.appendChild(t);
      var st = select([['waiting', 'Waiting'], ['ordered', 'Ordered'], ['added', 'Added to the shop'], ['no', 'Not possible']], r.status); st.setAttribute('aria-label', 'Status for ' + r.title);
      var note = input('text', r.note, { placeholder: 'Reply to the student', 'aria-label': 'Reply about ' + r.title, maxlength: '200' });
      var row = el('div', 'req-ctl'); row.appendChild(st); row.appendChild(note);
      row.appendChild(btn('Save', 'line sm', function () { if (st.value !== 'waiting' && !note.value.trim()) { note.focus(); toast('Add a short reply so the student knows what happens next.'); return; } r.status = st.value; r.note = note.value.trim(); save(); toast('Reply saved.'); route(); }));
      c.appendChild(row); host.appendChild(c);
    });
  }

  // ================= SETTINGS =================
  function settings() {
    head('Demo settings', 'This admin area runs on sample data while the database isn’t connected yet.');
    var c = el('section', 'card-a');
    c.appendChild(el('p', null, 'Your changes (orders moved forward, prices, stock, people, promotions, replies) are saved in this browser only. Other visitors don’t see them, and clearing your browser data removes them.'));
    c.appendChild(el('p', null, 'Changes to prices, stock and promotions also show in the shop on this browser, so you can see the effect straight away.'));
    c.appendChild(btn('Reset all demo data', 'danger', function () {
      sheet();
      function sheet() {
        drawer('Reset the demo?', function (b) {
          b.appendChild(el('p', null, 'This puts back the original sample orders, stock, people and promotions. It only affects this browser.'));
          var row = el('div', 'btns'); row.appendChild(btn('Reset demo data', 'danger', function () { try { localStorage.removeItem(KEY); } catch (e) {} seed(); closeDrawer(); toast('Demo data reset.'); location.hash = '#dashboard'; route(); }));
          row.appendChild(btn('Keep my changes', 'line', closeDrawer)); b.appendChild(row);
        });
      }
    }));
    main.appendChild(c);
  }

  // ---------- start ----------
  Promise.all([fetch('/data/books.json').then(function (r) { return r.json(); }), fetch('/data/admin-sample.json').then(function (r) { return r.json(); })]).then(function (d) {
    CAT = d[0]; SAMPLE = d[1];
    try { ST = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { ST = null; }
    if (!ST || ST.v !== 1) seed();
    window.addEventListener('hashchange', route); route();
  }).catch(function () { main.replaceChildren(el('p', 'err', 'The admin data could not load. Refresh the page.')); });
})();
