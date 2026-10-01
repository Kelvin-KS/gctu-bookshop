/* GCTU Bookshop · Faculty desk (lecturers).
   Runs on sample data and keeps changes in this browser until the database is connected:
   reading lists in localStorage "gb-lists"; the librarian's records in "gb-admin".
   All text from data or forms is inserted with textContent, never as HTML. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DAY = 86400000;
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  var who = readJSON('gb-demo');
  if (!who || who.role !== 'lecturer') { location.replace('/sign-in/?as=lecturer&next=' + encodeURIComponent('/faculty/' + location.hash)); return; }
  document.getElementById('signout').addEventListener('click', function () {
    try { localStorage.removeItem('gb-demo'); sessionStorage.setItem('gb-flash', 'Signed out of the Faculty desk.'); } catch (e) {}
    location.href = '/';
  });

  // ---------- helpers ----------
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function cedi(n) { return 'GH₵ ' + n; }
  var toastT;
  function toast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function btn(text, cls, fn) { var b = el('button', 'btn ' + (cls || 'slate'), text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function pill(text, kind) { return el('span', 'pill-s ' + (kind || ''), text); }
  function field(label, input, hint, id) {
    var w = el('div', 'fld'); var l = el('label', null, label); input.id = id; l.htmlFor = id; w.appendChild(l); w.appendChild(input);
    var e = el('span', 'err'); e.id = id + '-e'; input.setAttribute('aria-describedby', e.id); w.appendChild(e);
    if (hint) w.appendChild(el('small', 'hint-s', hint)); return w;
  }
  function setErr(i, m) { var e = document.getElementById(i.id + '-e'); if (e) e.textContent = m || ''; i.setAttribute('aria-invalid', m ? 'true' : 'false'); }
  function slug(code) { return code.replace(/\s+/g, '-'); }
  function unslug(s) { return decodeURIComponent(s || '').replace(/-/g, ' '); }
  var lastFocus = null;
  function drawer(title, build) {
    closeDrawer(); lastFocus = document.activeElement;
    var wrap = el('div', 'drawer'); wrap.id = 'drawer'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'dr-t');
    var panel = el('div', 'drawer-panel'), head = el('div', 'drawer-head'), h = el('h2', null, title); h.id = 'dr-t'; head.appendChild(h);
    var x = el('button', 'icon-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', closeDrawer); head.appendChild(x);
    panel.appendChild(head); var body = el('div', 'drawer-body'); panel.appendChild(body); build(body);
    wrap.appendChild(panel); document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeDrawer(); });
    var f = body.querySelector('input,select,textarea,button'); (f || x).focus();
  }
  function closeDrawer() { var d = document.getElementById('drawer'); if (d) { d.remove(); if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus(); } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  // ---------- data ----------
  var CAT, RL, SAMPLE, ADMIN, LS, ME;
  function saveLists() { try { localStorage.setItem('gb-lists', JSON.stringify(LS)); } catch (e) { toast('This browser blocked saving, so changes will be lost on refresh.'); } }
  function thing(id) {
    var b = CAT.books.filter(function (x) { return x.id === id; })[0];
    if (b) { var o = ADMIN && ADMIN.books && ADMIN.books[id]; b = Object.assign({}, b, o || {}); return { id: id, kind: 'book', name: b.title, sub: b.author, img: b.cover || b.art || null, price: b.source === 'openstax' ? 'Free e-book' : cedi(Math.round(b.price * (100 - b.saving) / 100)) + ' e-book', b: b }; }
    var e = CAT.essentials.filter(function (x) { return x.id === id; })[0];
    if (e) return { id: id, kind: 'ess', name: e.name, sub: 'Campus essentials', img: e.img, price: cedi(e.price) };
    return null;
  }
  function courseName(c) { return (RL.courses[c] || {}).name || c; }
  function myLists() { return ME.courses.map(function (c) { return { code: c, list: LS.lists[c] || null }; }); }
  // Distinct students who bought each item (counts only; never names), from the bookshop's orders.
  function buyers() {
    var orders = ADMIN && ADMIN.orders ? ADMIN.orders : SAMPLE.orders, map = {};
    orders.forEach(function (o) { o.items.forEach(function (it) { (map[it.id] = map[it.id] || {})[o.student] = 1; }); });
    var out = {}; Object.keys(map).forEach(function (k) { out[k] = Object.keys(map[k]).length; }); return out;
  }
  function courseHave(code) {
    var l = LS.lists[code]; if (!l) return 0;
    var orders = ADMIN && ADMIN.orders ? ADMIN.orders : SAMPLE.orders, ids = l.items.map(function (i) { return i.id; }), s = {};
    orders.forEach(function (o) { if (o.items.some(function (it) { return ids.indexOf(it.id) >= 0; })) s[o.student] = 1; });
    return Math.min(Object.keys(s).length, (RL.courses[code] || {}).followers || 0);
  }

  // ---------- routing ----------
  var main = document.getElementById('adm-main');
  var VIEWS = { overview: overview, lists: lists, request: request, add: addFromShop };
  function route() {
    var parts = (location.hash || '#overview').slice(1).split('/'), v = VIEWS[parts[0]] ? parts[0] : 'overview';
    document.querySelectorAll('#adm-nav a[data-v]').forEach(function (a) { if (a.dataset.v === v || (v === 'add' && a.dataset.v === 'lists')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (dirty && !confirmLeave()) return;
    closeDrawer(); main.replaceChildren();
    if (ME.status === 'off') { switchedOff(); return; }
    VIEWS[v](parts);
    document.title = (v === 'lists' ? 'Reading lists' : v === 'request' ? 'Request a book' : 'Overview') + ' · Faculty desk · GCTU Bookshop';
    if (!reduce) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); }
    window.scrollTo(0, 0); main.focus({ preventScroll: true });
  }
  var dirty = false, lastHash = location.hash;
  function confirmLeave() {
    // Unsaved edits in the list editor: stay on the page and say so (no browser pop-up).
    history.replaceState(null, '', lastHash); toast('You have unsaved changes. Save the list or press Discard first.'); return false;
  }
  window.addEventListener('hashchange', function () { route(); if (!dirty) lastHash = location.hash; });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  function head(title, sub, actions) {
    var h = el('header', 'adm-head'), t = el('div'); t.appendChild(el('h1', null, title)); if (sub) t.appendChild(el('p', null, sub)); h.appendChild(t);
    if (actions) { var a = el('div', 'adm-actions'); actions.forEach(function (x) { a.appendChild(x); }); h.appendChild(a); }
    main.appendChild(h);
  }
  function switchedOff() {
    head('Your account is switched off', 'The librarian has switched off this staff account, so you can’t edit reading lists. Your lists are hidden from students.');
    main.appendChild(el('p', 'note-s', 'In this demo you can switch it back on from the admin side: People → Lecturers → Switch back on.'));
  }

  // ================= OVERVIEW =================
  function overview() {
    var hr = new Date().getHours(), mine = myLists();
    var published = mine.filter(function (m) { return m.list && m.list.published; });
    var missing = mine.filter(function (m) { return !m.list || !m.list.items.length; });
    head((hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + ', ' + ME.name,
      published.length + ' of your ' + mine.length + ' courses have a reading list.' + (missing.length ? ' ' + missing.map(function (m) { return m.code; }).join(', ') + ' still need' + (missing.length === 1 ? 's' : '') + ' one.' : ''),
      [btn('+ New reading list', 'slate', function () { var m = missing[0] || mine[0]; location.hash = '#lists/' + slug(m.code); })]);
    var followers = mine.reduce(function (n, m) { return n + ((RL.courses[m.code] || {}).followers || 0); }, 0);
    var have = mine.reduce(function (n, m) { return n + courseHave(m.code); }, 0);
    var k = el('section', 'kpis k4'); k.setAttribute('aria-label', 'At a glance');
    [[mine.length, 'courses this semester'], [published.length, 'reading lists published'], [followers, 'students following your courses'], [have, 'have bought a listed book']].forEach(function (x) { var d = el('div', 'kpi'); d.appendChild(el('b', null, String(x[0]))); d.appendChild(el('span', null, x[1])); k.appendChild(d); });
    main.appendChild(k);
    main.appendChild(el('h2', 'sec-h', 'Your courses'));
    var cards = el('div', 'courses-f');
    mine.forEach(function (m) {
      var c = RL.courses[m.code] || {}, l = m.list, n = l ? l.items.length : 0, h = courseHave(m.code), f = c.followers || 0;
      var a = el('a', 'course-f' + (n ? '' : ' empty')); a.href = '#lists/' + slug(m.code);
      a.appendChild(el('span', 'cc', m.code)); a.appendChild(el('b', null, c.name || m.code));
      a.appendChild(el('span', 'm', f + ' students · ' + (n ? n + ' item' + (n === 1 ? '' : 's') + ' listed' : 'no reading list yet')));
      var bar = el('div', 'cbar'), i = el('i'); bar.appendChild(i); a.appendChild(bar);
      setTimeout(function () { i.style.width = (f ? Math.round(h / f * 100) : 0) + '%'; }, reduce ? 0 : 150);
      a.appendChild(el('span', 'm', n ? h + ' of ' + f + ' have bought from the list' : '+ Create one'));
      if (l && !l.published && n) a.appendChild(pill('Draft', 'warn'));
      cards.appendChild(a);
    });
    main.appendChild(cards);
    var grid = el('div', 'dash-grid');
    var buy = el('section', 'card-a'); buy.appendChild(el('h2', null, 'What your students are buying'));
    var counts = buyers(), seen = {}, rows = [];
    mine.forEach(function (m) { (m.list ? m.list.items : []).forEach(function (it) { if (seen[it.id]) return; seen[it.id] = 1; var t = thing(it.id); if (t) rows.push([t.name, counts[it.id] || 0, m.code]); }); });
    rows.sort(function (a, b) { return b[1] - a[1]; });
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    var ul = el('ul', 'buys');
    rows.forEach(function (r) { var li = el('li'), top = el('div', 'row'); top.appendChild(el('b', null, r[0])); top.appendChild(el('span', null, r[1] + ' student' + (r[1] === 1 ? '' : 's'))); li.appendChild(top); var m = el('div', 'meter'), i = el('i'); m.appendChild(i); li.appendChild(m); ul.appendChild(li); setTimeout(function () { i.style.width = (r[1] / max * 100) + '%'; }, reduce ? 0 : 250); });
    if (!rows.length) ul.appendChild(el('li', null, 'Add books to a reading list to see this.'));
    buy.appendChild(ul); buy.appendChild(el('p', 'note-s', 'Counts only. You never see which student bought what.'));
    grid.appendChild(buy);
    var help = el('section', 'card-a'); help.appendChild(el('h2', null, 'How reading lists work'));
    var ol = el('ol', 'how-f');
    ['Pick books from the catalogue and add a short note on why each one matters.', 'Mark each as Essential or Optional, then publish.', 'Students following the course see “Recommended by your lecturer” and can add the whole list to their cart.', 'Missing a book? Request it and the librarian will reply.'].forEach(function (s) { ol.appendChild(el('li', null, s)); });
    help.appendChild(ol);
    var pv = el('a', 'see', 'See what students see →'); pv.href = '/course/'; help.appendChild(pv);
    grid.appendChild(help);
    main.appendChild(grid);
  }

  // ================= READING LISTS =================
  function lists(parts) {
    var code = parts[1] ? unslug(parts[1]) : null;
    if (code && ME.courses.indexOf(code) >= 0) return editor(code);
    head('Reading lists', 'One list per course you teach. Only the librarian can change which courses are yours.');
    var g = el('div', 'courses-f');
    myLists().forEach(function (m) {
      var a = el('a', 'course-f' + (m.list && m.list.items.length ? '' : ' empty')); a.href = '#lists/' + slug(m.code);
      a.appendChild(el('span', 'cc', m.code)); a.appendChild(el('b', null, courseName(m.code)));
      a.appendChild(el('span', 'm', m.list && m.list.items.length ? m.list.items.length + ' items · ' + (m.list.published ? 'published' : 'draft') : 'No list yet: create one'));
      g.appendChild(a);
    });
    main.appendChild(g);
    if (code) main.appendChild(el('p', 'note-s', code + ' isn’t one of your courses.'));
  }
  function editor(code) {
    var saved = LS.lists[code] || { by: ME.id, published: false, intro: '', items: [] };
    var L = JSON.parse(JSON.stringify(saved));
    var preview = el('a', 'btn line', 'Preview as a student ↗'); preview.href = '/course/?code=' + slug(code); preview.target = '_blank'; preview.rel = 'noopener';
    var saveB = btn('Save list', 'slate', doSave), discard = btn('Discard changes', 'line', function () { dirty = false; route(); });
    head(code + ' · ' + courseName(code), ((RL.courses[code] || {}).followers || 0) + ' students follow this course.', [preview, discard, saveB]);
    var status = el('p', 'save-state'); status.setAttribute('aria-live', 'polite'); main.appendChild(status);
    function mark() { dirty = JSON.stringify(L) !== JSON.stringify(saved); status.textContent = dirty ? 'Unsaved changes' : (saved.items.length ? 'All changes saved' : ''); status.classList.toggle('is-dirty', dirty); discard.hidden = !dirty; }
    var top = el('div', 'card-a ed-top');
    var intro = el('textarea'); intro.rows = 2; intro.maxLength = 300; intro.value = L.intro || ''; intro.placeholder = 'A sentence for students, e.g. what to read before week 4';
    intro.addEventListener('input', function () { L.intro = intro.value; mark(); });
    top.appendChild(field('Message to students', intro, null, 'ed-intro'));
    var sw = el('label', 'switch-f'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!L.published; sw.appendChild(cb); sw.appendChild(el('span', 'knob', '')); sw.appendChild(el('span', null, 'Published: students following ' + code + ' can see this list'));
    cb.addEventListener('change', function () { L.published = cb.checked; mark(); });
    top.appendChild(sw); main.appendChild(top);
    var listBox = el('ol', 'ed-list'); main.appendChild(listBox);
    var add = el('div', 'card-a ed-add'); add.appendChild(el('h2', null, 'Add a book or item'));
    var q = el('input'); q.type = 'search'; q.className = 'adm-search'; q.placeholder = 'Search the catalogue: title, author or course code'; q.setAttribute('aria-label', 'Search the catalogue to add an item'); q.autocomplete = 'off';
    var res = el('ul', 'ed-results'); res.setAttribute('aria-live', 'polite'); add.appendChild(q); add.appendChild(res); main.appendChild(add);
    function render() {
      listBox.replaceChildren();
      if (!L.items.length) listBox.appendChild(el('li', 'ed-empty', 'No items yet. Search below to add the first one.'));
      L.items.forEach(function (it, i) {
        var t = thing(it.id); if (!t) return;
        var li = el('li', 'ed-item');
        if (t.img) { var im = el('img'); im.src = t.img; im.alt = ''; im.width = 44; im.height = t.kind === 'ess' ? 44 : 64; im.loading = 'lazy'; li.appendChild(im); } else li.appendChild(el('span', 'ph-f'));
        var mid = el('div', 'ed-mid'); var nm = el('b', null, t.name); mid.appendChild(nm); mid.appendChild(el('span', 'muted-a', t.sub + ' · ' + t.price));
        var seg = el('div', 'adm-tabs mini-f'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Importance of ' + t.name);
        [[true, 'Essential'], [false, 'Optional']].forEach(function (o) { var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(it.essential === o[0])); b.addEventListener('click', function () { it.essential = o[0]; mark(); render(); }); seg.appendChild(b); });
        mid.appendChild(seg);
        var note = el('input'); note.type = 'text'; note.maxLength = 200; note.value = it.note || ''; note.className = 'ed-note'; note.placeholder = 'Why should students read this?'; note.setAttribute('aria-label', 'Note for ' + t.name);
        note.addEventListener('input', function () { it.note = note.value; mark(); });
        mid.appendChild(note); li.appendChild(mid);
        var ctl = el('div', 'ed-ctl');
        var up = btn('↑', 'line sm', function () { L.items.splice(i - 1, 0, L.items.splice(i, 1)[0]); mark(); render(); focusRow(i - 1, 0); }); up.setAttribute('aria-label', 'Move ' + t.name + ' up'); up.disabled = i === 0;
        var dn = btn('↓', 'line sm', function () { L.items.splice(i + 1, 0, L.items.splice(i, 1)[0]); mark(); render(); focusRow(i + 1, 1); }); dn.setAttribute('aria-label', 'Move ' + t.name + ' down'); dn.disabled = i === L.items.length - 1;
        var rm = btn('Remove', 'line sm', function () { L.items.splice(i, 1); mark(); render(); toast('Removed ' + t.name + '.'); }); rm.setAttribute('aria-label', 'Remove ' + t.name);
        ctl.appendChild(up); ctl.appendChild(dn); ctl.appendChild(rm); li.appendChild(ctl);
        listBox.appendChild(li);
      });
    }
    function focusRow(i, which) { var row = listBox.children[i]; if (row) { var b = row.querySelectorAll('.ed-ctl button')[which]; if (b && !b.disabled) b.focus(); else row.querySelector('.ed-ctl button:not([disabled])').focus(); } }
    function search() {
      res.replaceChildren(); var term = q.value.trim().toLowerCase(); if (term.length < 2) return;
      var pool = CAT.books.map(function (b) { return { id: b.id, txt: [b.title, b.author, b.course || ''].join(' ') }; }).concat(CAT.essentials.map(function (e) { return { id: e.id, txt: e.name + ' stationery essentials' }; }));
      var hits = pool.filter(function (p) { return p.txt.toLowerCase().indexOf(term) >= 0; }).slice(0, 6);
      if (!hits.length) { var li0 = el('li', 'muted-a'); li0.appendChild(document.createTextNode('Not in the catalogue. ')); var rq = el('a', null, 'Request it from the librarian'); rq.href = '#request'; li0.appendChild(rq); res.appendChild(li0); return; }
      hits.forEach(function (h) {
        var t = thing(h.id), have = L.items.some(function (x) { return x.id === h.id; });
        var li = el('li'), b = el('button', 'ed-hit'); b.type = 'button'; b.disabled = have;
        b.appendChild(el('b', null, t.name)); b.appendChild(el('span', 'muted-a', have ? 'Already on the list' : t.sub + ' · ' + t.price));
        b.addEventListener('click', function () { L.items.push({ id: h.id, note: '', essential: true }); mark(); render(); q.value = ''; res.replaceChildren(); toast('Added ' + t.name + '. Add a note for students.'); var notes = listBox.querySelectorAll('.ed-note'); if (notes.length) notes[notes.length - 1].focus(); });
        li.appendChild(b); res.appendChild(li);
      });
    }
    q.addEventListener('input', search);
    function doSave() {
      if (L.published && !L.items.length) { toast('Add at least one item before publishing, or switch Published off.'); q.focus(); return; }
      var empty = L.items.filter(function (it) { return !String(it.note || '').trim(); }).length;
      L.by = ME.id; L.updated = Date.now(); L.intro = String(L.intro || '').slice(0, 300);
      L.items.forEach(function (it) { it.note = String(it.note || '').trim().slice(0, 200); });
      LS.lists[code] = L; saveLists(); saved = JSON.parse(JSON.stringify(L)); mark();
      toast(L.published ? 'Saved and published. ' + ((RL.courses[code] || {}).followers || 0) + ' students can see it.' + (empty ? ' Tip: ' + empty + ' item' + (empty === 1 ? ' has' : 's have') + ' no note yet.' : '') : 'Saved as a draft. Students can’t see it yet.');
      lastHash = location.hash;
    }
    render(); mark();
  }
  // From a book page in the shop: "Add it to a course reading list"
  function addFromShop(parts) {
    var t = thing(parts[1] || ''); overview();
    if (!t) return;
    drawer('Add to a reading list', function (b) {
      b.appendChild(el('p', null, 'Add “' + t.name + '” to which course?'));
      ME.courses.forEach(function (c) {
        var l = LS.lists[c], has = l && l.items.some(function (x) { return x.id === t.id; });
        var o = btn(c + ' · ' + courseName(c) + (has ? ' (already listed)' : ''), 'line', function () {
          LS.lists[c] = l || { by: ME.id, published: false, intro: '', items: [] };
          LS.lists[c].items.push({ id: t.id, note: '', essential: true }); saveLists(); closeDrawer();
          toast('Added to ' + c + '. Add a note, then save.'); location.hash = '#lists/' + slug(c);
        });
        o.disabled = !!has; o.classList.add('wide'); b.appendChild(o);
      });
    });
  }

  // ================= REQUEST A BOOK =================
  function request() {
    head('Request a book', 'Ask the librarian to stock a title for your course. The reply appears here.');
    var f = el('form', 'card-a req-form'); f.noValidate = true;
    var title = el('input'); title.maxLength = 120; var course = el('select'); ME.courses.concat(['Other']).forEach(function (c) { var o = el('option', null, c === 'Other' ? 'Not for a specific course' : c + ' · ' + courseName(c)); o.value = c; course.appendChild(o); });
    var fmt = el('select'); ['Either', 'E-book', 'Hard copy'].forEach(function (x) { var o = el('option', null, x); o.value = x; fmt.appendChild(o); });
    var note = el('textarea'); note.rows = 3; note.maxLength = 300; note.placeholder = 'Edition, how many copies, or when you need it';
    f.appendChild(field('Title, author or ISBN', title, null, 'rq-t')); f.appendChild(field('Course', course, null, 'rq-c')); f.appendChild(field('Format', fmt, null, 'rq-f')); f.appendChild(field('Note to the librarian (optional)', note, null, 'rq-n'));
    var go = el('button', 'btn slate', 'Send request'); go.type = 'submit'; f.appendChild(go);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); setErr(title, '');
      if (title.value.trim().length < 2) { setErr(title, 'Enter the title or author.'); title.focus(); return; }
      LS.requests = LS.requests || [];
      LS.requests.push({ id: 'RQ-L' + Date.now().toString(36).toUpperCase(), student: ME.id, title: (title.value.trim() + (course.value !== 'Other' ? ' (for ' + course.value + ')' : '')).slice(0, 160), format: fmt.value, status: 'waiting', note: '', at: Date.now(), message: note.value.trim().slice(0, 300) });
      saveLists(); toast('Request sent. The librarian sees it under Requests.'); route();
    });
    main.appendChild(f);
    var mine = (LS.requests || []).slice().reverse();
    if (mine.length) {
      main.appendChild(el('h2', 'sec-h', 'Your requests'));
      var box = el('div', 'reqs-a'), adm = ADMIN && ADMIN.requests ? ADMIN.requests : [];
      var LBL = { waiting: ['Waiting', 'warn'], ordered: ['Ordered', 'info'], added: ['Added to the shop', 'ok'], no: ['Not possible', 'bad'] };
      mine.forEach(function (r) {
        var cur = adm.filter(function (x) { return x.id === r.id; })[0] || r, l = LBL[cur.status] || LBL.waiting;
        var c = el('article', 'req-a'), t = el('div'); t.appendChild(el('b', null, r.title)); t.appendChild(el('span', 'muted-a', r.format + ' · ' + new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))); c.appendChild(t);
        var s = el('div'); s.appendChild(pill(l[0], l[1])); if (cur.note) s.appendChild(el('p', 'note-s', 'Librarian: ' + cur.note)); c.appendChild(s);
        box.appendChild(c);
      });
      main.appendChild(box);
    }
  }

  // ---------- start ----------
  Promise.all(['/data/books.json', '/data/reading-lists.json', '/data/admin-sample.json'].map(function (u) { return fetch(u).then(function (r) { return r.json(); }); })).then(function (d) {
    CAT = d[0]; RL = d[1]; SAMPLE = d[2];
    ADMIN = readJSON('gb-admin'); if (!ADMIN || ADMIN.v !== 1) ADMIN = null;
    LS = readJSON('gb-lists'); if (!LS || LS.v !== 1) { LS = { v: 1, lists: JSON.parse(JSON.stringify(RL.lists)), requests: [] }; saveLists(); }
    var rec = (ADMIN ? ADMIN.lecturers : SAMPLE.lecturers).filter(function (l) { return l.id === RL.lecturer; })[0] || SAMPLE.lecturers[0];
    ME = { id: rec.id, name: rec.name, courses: rec.courses.slice(), status: rec.status };
    route();
  }).catch(function () { main.replaceChildren(el('p', 'err', 'The Faculty desk could not load. Refresh the page.')); });
})();
