/* GCTU Bookshop · stage 1: the shop front (home, catalogue, search, book pages).
   Plain JavaScript, no libraries. Every piece of text from the data or the URL is
   inserted with textContent, never as HTML. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page = document.body.dataset.page;
  var params = new URLSearchParams(location.search);

  // ---------- small helpers ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // Icons are fixed strings in this file (never user data), parsed as SVG documents.
  function svg(markup) {
    var doc = new DOMParser().parseFromString(markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }
  function cedi(n) { return 'GH₵ ' + n; }
  function ebookPrice(b) { return b.source === 'openstax' ? 0 : Math.round(b.price * (100 - b.saving) / 100); }
  function variant(b) { var h = 0; for (var i = 0; i < b.id.length; i++) h = (h * 31 + b.id.charCodeAt(i)) % 997; return h % 3; }

  var ICON = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10 12 4l9 6v10H3z"/></svg>',
    browse: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="6" height="16" rx="1"/><rect x="12" y="4" width="8" height="16" rx="1"/></svg>',
    user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    logo: '<svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="40" width="44" height="12" rx="3" fill="#1c2957"/><rect x="14" y="26" width="38" height="12" rx="3" fill="#2f4185"/><rect x="8" y="12" width="34" height="12" rx="3" fill="#e3ad35"/></svg>',
    logoLight: '<svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="40" width="44" height="12" rx="3" fill="#ffffff"/><rect x="14" y="26" width="38" height="12" rx="3" fill="#8fa0dd"/><rect x="8" y="12" width="34" height="12" rx="3" fill="#e3ad35"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f4185" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
  };

  // ---------- notices for features that arrive in a later stage ----------
  var LATER = {
    buy: ['Buying opens in stage 2', 'This is the shop front. The next stage adds:', ['Demo sign-in buttons for a student, a lecturer and the librarian', 'Cart and checkout with Paystack test payments (no real money)', 'My Library, orders and pickup tracking']],
    account: ['Accounts open in stage 2', 'Students and lecturers will sign in with their ID. In this public demo, one-click demo accounts are used instead, so no real ID is ever needed.', []],
    request: ['Book requests open in stage 3', 'Students will be able to ask the librarian for a title and follow the reply in their messages.', []]
  };
  function later(kind, opener) {
    var d = LATER[kind];
    var wrap = el('div', 'sheet'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'sheet-t');
    var box = el('div', 'sheet-box');
    var h = el('h2', null, d[0]); h.id = 'sheet-t'; box.appendChild(h);
    box.appendChild(el('p', null, d[1]));
    if (d[2].length) { var ul = el('ul'); d[2].forEach(function (x) { ul.appendChild(el('li', null, x)); }); box.appendChild(ul); }
    var ok = el('button', 'btn navy', 'OK'); box.appendChild(ok);
    wrap.appendChild(box); document.body.appendChild(wrap); ok.focus();
    function close() { wrap.remove(); document.removeEventListener('keydown', esc); if (opener) opener.focus(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    ok.addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', esc);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-later]');
    if (t) { e.preventDefault(); later(t.dataset.later, t); }
  });

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // ---------- shared layout: header, footer, phone bar ----------
  function link(href, text, current) { var a = el('a', null, text); a.href = href; if (current) a.setAttribute('aria-current', 'page'); return a; }
  function buildHeader() {
    var top = document.getElementById('site-top'); if (!top) return;
    var demo = el('div', 'demo-bar'); demo.appendChild(el('b', null, 'Concept demo')); demo.appendChild(document.createTextNode(' · not a real shop · no real orders or payments · not an official GCTU service'));
    var promo = el('div', 'promo', 'Free campus pickup · Delivery across Ghana');
    var head = el('header', 'top'); head.id = 'top';
    var w = el('div', 'wrap');
    var mark = el('a', 'mark'); mark.href = '/'; mark.setAttribute('aria-label', 'GCTU Bookshop home');
    mark.appendChild(svg(ICON.logo)); var words = el('span'); words.appendChild(el('b', null, 'GCTU')); words.appendChild(el('i', null, 'Bookshop')); mark.appendChild(words);
    w.appendChild(mark);
    var nav = el('nav', 'nav'); nav.setAttribute('aria-label', 'Main');
    var g = params.get('genre');
    nav.appendChild(link('/browse/', 'Browse', page === 'browse' && g !== 'text' && g !== 'essentials'));
    nav.appendChild(link('/browse/?genre=text', 'Textbooks', page === 'browse' && g === 'text'));
    nav.appendChild(link('/browse/?genre=essentials', 'Essentials', page === 'browse' && g === 'essentials'));
    nav.appendChild(link('/#genres', 'Genres'));
    w.appendChild(nav);
    var f = el('form', 'search-form'); f.action = '/search/'; f.setAttribute('role', 'search');
    f.appendChild(svg(ICON.search));
    var inp = el('input'); inp.type = 'search'; inp.name = 'q'; inp.placeholder = 'Search title, author or course code'; inp.setAttribute('aria-label', 'Search books'); inp.autocomplete = 'off';
    if (page === 'search') inp.value = params.get('q') || '';
    f.appendChild(inp); w.appendChild(f);
    var cart = el('button', 'icon-btn cart-btn'); cart.setAttribute('aria-label', 'Cart'); cart.dataset.later = 'buy'; cart.appendChild(svg(ICON.cart)); w.appendChild(cart);
    var si = el('button', 'btn navy sm signin', 'Sign in'); si.dataset.later = 'account'; w.appendChild(si);
    head.appendChild(w);
    top.appendChild(demo); top.appendChild(promo); top.appendChild(head);
    window.addEventListener('scroll', function () { head.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });
  }
  function buildTabbar() {
    var bar = el('nav', 'tabbar'); bar.setAttribute('aria-label', 'Phone navigation');
    function tab(href, icon, text, cur, laterKind) {
      var a = el(href ? 'a' : 'button'); if (href) a.href = href; if (laterKind) a.dataset.later = laterKind;
      if (cur) a.setAttribute('aria-current', 'page');
      a.appendChild(svg(icon)); a.appendChild(document.createTextNode(text)); bar.appendChild(a);
    }
    tab('/', ICON.home, 'Home', page === 'home');
    tab('/browse/', ICON.browse, 'Browse', page === 'browse' || page === 'book');
    tab('/search/', ICON.search.replace('18', '22').replace('18', '22'), 'Search', page === 'search');
    tab(null, ICON.cart.replace('20', '22').replace('20', '22'), 'Cart', false, 'buy');
    tab(null, ICON.user, 'Account', false, 'account');
    document.body.appendChild(bar);
    var t = el('div', 'toast'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t);
  }
  function buildFooter() {
    var host = document.getElementById('site-footer'); if (!host) return;
    var f = el('footer', 'site'); f.id = 'footer';
    f.appendChild(el('div', 'footer-word', 'Bookshop')).setAttribute('aria-hidden', 'true');
    var w = el('div', 'wrap');
    var req = el('div', 'req rv'); var rq = el('div'); rq.appendChild(el('h2', null, 'Can’t find the book you need?'));
    rq.appendChild(el('p', null, 'Tell the librarian the title or course code. You’ll get a reply in your messages, usually within a day.'));
    req.appendChild(rq); var rb = el('button', 'btn gold'); rb.dataset.later = 'request'; rb.appendChild(document.createTextNode('Request a book ')); rb.appendChild(el('span', 'arr', '→')); req.appendChild(rb);
    w.appendChild(req);
    var grid = el('div', 'fgrid');
    var brand = el('div', 'fbrand rv'); brand.id = 'fbrand';
    var m = el('a', 'mark'); m.href = '/'; m.setAttribute('aria-label', 'GCTU Bookshop home'); m.appendChild(svg(ICON.logoLight));
    var mw = el('span'); mw.appendChild(el('b', null, 'GCTU')); mw.appendChild(el('i', null, 'Bookshop')); m.appendChild(mw); brand.appendChild(m);
    brand.appendChild(el('p', null, 'E-books and hard copies for GCTU students and lecturers. Free pickup on campus, delivery across Ghana.'));
    grid.appendChild(brand);
    [['Shop', [['/browse/', 'All books'], ['/#genres', 'Genres'], ['/browse/?genre=text', 'Course textbooks'], ['/browse/?genre=essentials', 'Campus essentials']]],
     ['Help', [['', 'Track an order', 'buy'], ['/#delivery', 'Delivery & pickup'], ['', 'Message the librarian', 'request'], ['', 'Request a book', 'request']]],
     ['Account', [['', 'Sign in', 'account'], ['', 'My Library', 'account'], ['', 'Wishlist', 'account'], ['', 'Order history', 'account']]]
    ].forEach(function (col) {
      var c = el('div', 'fcol rv'); c.appendChild(el('h2', null, col[0])); var ul = el('ul');
      col[1].forEach(function (l) { var li = el('li'), a = el('a', null, l[1]); a.href = l[0] || '#'; if (l[2]) a.dataset.later = l[2]; li.appendChild(a); ul.appendChild(li); });
      c.appendChild(ul); grid.appendChild(c);
    });
    w.appendChild(grid);
    var cr = el('div', 'credits rv');
    var c1 = el('div'); c1.appendChild(el('h2', null, 'About this project'));
    var p1 = el('p'); p1.appendChild(document.createTextNode('Original 2024 HND project (Accra Technical University) by '));
    [['Ebueku Isaac', ', '], ['Kelvin Sakyi', ' and '], ['Okyere Osei Samuel', ', supervised by '], ['Mr. Joseph Eyram Dzata', '. This rebuild by '], ['Kelvin Sakyi', '.']].forEach(function (x) { p1.appendChild(el('b', null, x[0])); p1.appendChild(document.createTextNode(x[1])); });
    c1.appendChild(p1);
    var team = el('div', 'team'); ['Ebueku Isaac', 'Kelvin Sakyi', 'Okyere Osei Samuel'].forEach(function (n) { team.appendChild(el('span', null, n)); }); c1.appendChild(team);
    var c2 = el('div'); c2.appendChild(el('h2', null, 'Credits & licences'));
    var p2 = el('p'); p2.appendChild(document.createTextNode('Campus photos: “Bookshop (GCTU)”, “Student Study Area (GCTU)” and “Faculty of Computing & Information Studies (GCTU)” by Jwale2, Wikimedia Commons, '));
    var cc = el('a', null, 'CC BY-SA 4.0'); cc.href = 'https://creativecommons.org/licenses/by-sa/4.0/'; cc.rel = 'license noopener'; p2.appendChild(cc);
    p2.appendChild(document.createTextNode(', colour-corrected (edited versions under the same licence). Fiction: public domain. Textbooks: OpenStax, CC BY 4.0, access for free at openstax.org. Classic covers: Standard Ebooks (CC0); other covers are original designs. Campus essentials photos: AI-generated with Higgsfield for this demo. Fonts: Fraunces and DM Sans (SIL OFL).'));
    c2.appendChild(p2); cr.appendChild(c1); cr.appendChild(c2); w.appendChild(cr);
    var bottom = el('div', 'fbottom'); bottom.appendChild(el('span', null, 'Concept demo · not a real shop · no real orders or payments · not an official GCTU service'));
    var tt = el('button', 'totop'); tt.appendChild(el('span', 'up', '↑')); tt.appendChild(document.createTextNode(' Back to top'));
    tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); var first = document.querySelector('.mark'); if (first) first.focus({ preventScroll: true }); });
    bottom.appendChild(tt); w.appendChild(bottom);
    f.appendChild(w); host.appendChild(f);
    // the logo's three books stack themselves as the footer appears; the big word drifts as you scroll
    if (!reduce && 'IntersectionObserver' in window) {
      brand.classList.add('wait');
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { setTimeout(function () { brand.classList.remove('wait'); }, 250); io.disconnect(); } }, { threshold: .4 });
      io.observe(brand);
      var word = f.querySelector('.footer-word');
      window.addEventListener('scroll', function () { var r = f.getBoundingClientRect(); if (r.top < innerHeight) word.style.setProperty('--fx', (-(innerHeight - r.top) * .15).toFixed(1) + 'px'); }, { passive: true });
    }
  }

  // ---------- book pieces ----------
  var DATA = null, GENRES = {};
  function cover(b) {
    if (b.cover) { // Standard Ebooks cover art (CC0)
      var ci = el('div', 'cover has-img'); ci.setAttribute('aria-hidden', 'true');
      var img = el('img'); img.src = b.cover; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 350; img.height = 525;
      ci.appendChild(img); return ci;
    }
    var c = el('div', 'cover g-' + b.genre + (variant(b) ? ' v' + variant(b) : ''));
    c.appendChild(el('span', 'k', b.source === 'openstax' ? 'OpenStax · ' + b.course : GENRES[b.genre].name));
    var mid = el('div'); mid.appendChild(el('div', 'ttl', b.title)); mid.appendChild(el('div', 'rule')); mid.appendChild(el('div', 'au', b.author)); c.appendChild(mid);
    c.appendChild(el('span', 'orn')); c.setAttribute('aria-hidden', 'true');
    return c;
  }
  function priceRow(b, mode) {
    var p = el('div', 'price');
    if (b.source === 'openstax') {
      if (mode === 'hard') { p.appendChild(el('span', 'now', cedi(b.price))); p.appendChild(el('span', null, 'printed')); }
      else { p.appendChild(el('span', 'now', 'Free')); p.appendChild(el('span', null, 'e-book · ' + cedi(b.price) + ' printed')); }
    } else if (mode === 'hard') { p.appendChild(el('span', 'now', cedi(b.price))); p.appendChild(el('span', null, 'hard copy')); }
    else { p.appendChild(el('span', 'now', cedi(ebookPrice(b)))); var s = el('s', null, cedi(b.price)); s.setAttribute('aria-label', 'hard copy ' + cedi(b.price)); p.appendChild(s); p.appendChild(el('span', 'save', 'Save ' + b.saving + '%')); }
    return p;
  }
  function stockLine(b) {
    if (b.stock === 0) return el('div', 'stock out', 'Hard copy out of stock · e-book available');
    if (b.stock <= 3) return el('div', 'stock low', 'Only ' + b.stock + ' hard cop' + (b.stock === 1 ? 'y' : 'ies') + ' left');
    return el('div', 'stock', 'In stock');
  }
  function card(b, mode) {
    var a = el('a', 'card'); a.href = '/book/?id=' + encodeURIComponent(b.id);
    a.setAttribute('aria-label', b.title + ' by ' + b.author);
    var cw = el('div', 'cover-wrap'); cw.appendChild(cover(b)); a.appendChild(cw);
    var m = el('div', 'meta'); m.appendChild(el('h3', 't', b.title)); m.appendChild(el('p', 'a', b.author));
    m.appendChild(priceRow(b, mode)); m.appendChild(stockLine(b)); a.appendChild(m);
    return a;
  }
  function byId(id) { return DATA.books.filter(function (b) { return b.id === id; })[0]; }

  function shelf(host, list, label) {
    var s = el('div', 'shelf');
    var prev = el('button', 'arrow prev', '‹'); prev.setAttribute('aria-label', 'Scroll ' + label + ' left'); prev.disabled = true;
    var next = el('button', 'arrow next', '›'); next.setAttribute('aria-label', 'Scroll ' + label + ' right');
    var rail = el('div', 'rail'); rail.setAttribute('role', 'list'); rail.setAttribute('aria-label', label);
    list.forEach(function (b) { var c = card(b); c.setAttribute('role', 'listitem'); c.classList.add('rv'); rail.appendChild(c); });
    s.appendChild(prev); s.appendChild(rail); s.appendChild(next); host.appendChild(s);
    var bar = host.parentNode.querySelector('.progress i');
    function upd() {
      var max = rail.scrollWidth - rail.clientWidth, x = rail.scrollLeft;
      prev.disabled = x < 4; next.disabled = x > max - 4;
      if (bar) { var w = Math.max(18, Math.min(100, rail.clientWidth / rail.scrollWidth * 100)); bar.style.width = w + '%'; bar.style.marginLeft = (max > 0 ? (x / max) * (100 - w) : 0) + '%'; }
    }
    rail.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
    function step(d) { rail.scrollBy({ left: d * rail.clientWidth * .8, behavior: reduce ? 'auto' : 'smooth' }); }
    prev.addEventListener('click', function () { step(-1); }); next.addEventListener('click', function () { step(1); });
  }

  // ---------- campus essentials + student promotions ----------
  // A promotion runs on one item for anywhere from a day to a few weeks. The librarian will
  // schedule them in stage 4; until then the demo cycles through the sample list in books.json.
  var DAY = 86400000;
  function currentPromo() {
    var P = DATA.promotions, start = Date.parse(P.epoch), total = 0;
    P.cycle.forEach(function (c) { total += c.days * DAY; });
    var into = (Date.now() - start) % total, t0 = Date.now() - into;
    for (var i = 0; i < P.cycle.length; i++) {
      var c = P.cycle[i], len = c.days * DAY;
      if (into < len) return { item: essById(c.item), percent: c.percent, days: c.days, ends: t0 + len };
      into -= len; t0 += len;
    }
  }
  function essById(id) { return DATA.essentials.filter(function (e) { return e.id === id; })[0]; }
  function promoPrice(e, pc) { return Math.round(e.price * (100 - pc) / 100); }
  function essCard(e) {
    var pr = currentPromo(), on = pr && pr.item.id === e.id;
    var a = el('article', 'ess rv' + (on ? ' is-deal' : ''));
    var ph = el('div', 'ess-ph'); var img = el('img'); img.src = e.img; img.alt = e.name; img.loading = 'lazy'; img.decoding = 'async'; img.width = 720; img.height = 720; ph.appendChild(img);
    if (on) ph.appendChild(el('span', 'deal-tag', 'Student promo −' + pr.percent + '%'));
    a.appendChild(ph);
    var m = el('div', 'meta'); m.appendChild(el('h3', 't', e.name)); m.appendChild(el('p', 'a', e.blurb));
    var p = el('div', 'price'); p.appendChild(el('span', 'now', cedi(e.price)));
    if (on) p.appendChild(el('span', 'save', 'Students ' + cedi(promoPrice(e, pr.percent))));
    m.appendChild(p);
    m.appendChild(e.stock === 0 ? el('div', 'stock out', 'Out of stock') : e.stock <= 3 ? el('div', 'stock low', 'Only ' + e.stock + ' left') : el('div', 'stock', 'In stock'));
    if (e.credit) m.appendChild(el('p', 'photo-credit', e.credit));
    var add = el('button', 'btn line sm add', 'Add to cart'); add.type = 'button'; add.dataset.later = 'buy'; m.appendChild(add);
    a.appendChild(m); return a;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dealBox(host) {
    var pr = currentPromo(); if (!pr) return;
    var e = pr.item;
    var box = el('div', 'deal rv');
    var ph = el('div', 'deal-ph'); var img = el('img'); img.src = e.img; img.alt = e.name; img.width = 720; img.height = 720; ph.appendChild(img); box.appendChild(ph);
    var c = el('div', 'deal-copy');
    c.appendChild(el('p', 'eyebrow', 'Student promotion · ' + pr.days + (pr.days === 1 ? ' day only' : ' days')));
    c.appendChild(el('h3', null, e.name));
    var row = el('p', 'deal-price');
    row.appendChild(el('span', 'now', cedi(promoPrice(e, pr.percent)))); row.appendChild(el('s', null, cedi(e.price)));
    row.appendChild(el('span', 'save', pr.percent + '% off for students'));
    c.appendChild(row);
    c.appendChild(el('p', 'ends', 'Ends in'));
    var cd = el('div', 'countdown'); cd.setAttribute('role', 'timer');
    var units = [['d', 'days'], ['h', 'hours'], ['m', 'min'], ['s', 'sec']].map(function (u) { var b = el('span', 'unit'); var n = el('b', null, '00'); b.appendChild(n); b.appendChild(el('small', null, u[1])); cd.appendChild(b); return n; });
    c.appendChild(cd);
    var endDate = new Date(pr.ends - 1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Accra' });
    c.appendChild(el('p', 'deal-note', 'Students only, applied at checkout. Last day: ' + endDate + ' (Accra time).'));
    var add = el('button', 'btn gold', 'Add to cart'); add.type = 'button'; add.dataset.later = 'buy'; c.appendChild(add);
    box.appendChild(c); host.appendChild(box);
    function tick() {
      var left = Math.max(0, pr.ends - Date.now()), s = Math.floor(left / 1000);
      var vals = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      units.forEach(function (n, i) { var v = pad(vals[i]); if (n.textContent !== v) { n.textContent = v; if (!reduce && i === 3) { n.classList.remove('flip'); void n.offsetWidth; n.classList.add('flip'); } } });
      cd.setAttribute('aria-label', 'Promotion ends in ' + vals[0] + ' days ' + vals[1] + ' hours');
      if (left < 1000) setTimeout(function () { host.replaceChildren(); dealBox(host); }, 1500);
    }
    tick(); var iv = setInterval(function () { if (!document.body.contains(cd)) { clearInterval(iv); return; } tick(); }, 1000);
  }

  // ---------- pages ----------
  function home() {
    var pop = DATA.popular.map(byId);
    shelf(document.getElementById('shelf-popular'), pop, 'Popular this semester');
    shelf(document.getElementById('shelf-text'), DATA.books.filter(function (b) { return b.genre === 'text'; }), 'Course textbooks');
    shelf(document.getElementById('shelf-myst'), DATA.books.filter(function (b) { return b.genre === 'myst'; }), 'Mystery and crime');
    var chips = document.getElementById('home-chips');
    DATA.genres.forEach(function (g) { var a = el('a', 'chip', g.name); a.href = '/browse/?genre=' + g.id; chips.appendChild(a); });
    dealBox(document.getElementById('deal'));
    var eg = document.getElementById('ess-grid'); DATA.essentials.slice(0, 4).forEach(function (e) { eg.appendChild(essCard(e)); });
    var tiles = document.getElementById('tiles');
    [{ g: 'myst', cols: ['#24384f', '#5e1d22', '#2c6e58'] }, { g: 'drama', cols: ['#5b3b7a', '#a8475e', '#1f5f86'] },
     { g: 'text', img: '/img/campus-study-area.webp', name: 'Course textbooks', line: 'Free OpenStax e-books for core courses.' },
     { g: 'horr', img: '/img/campus-computing-faculty.webp', name: 'Horror & Thriller', line: 'Classic chills for late-night reading.' }
    ].forEach(function (t) {
      var G = GENRES[t.g], a = el('a', 'tile rv'); a.href = '/browse/?genre=' + t.g;
      var bg = el('div', 'bg' + (t.img ? '' : ' stackbg'));
      if (t.img) bg.style.backgroundImage = 'url("' + t.img + '")';
      else t.cols.forEach(function (c, k) { var i = el('i'); i.style.background = c; i.style.setProperty('--r', [-8, 4, 10][k] + 'deg'); bg.appendChild(i); });
      a.appendChild(bg); a.appendChild(el('h3', null, t.name || G.name)); a.appendChild(el('p', null, t.line || G.line));
      var s = el('span', 'see', 'View all '); s.appendChild(el('span', 'arr', '→')); a.appendChild(s);
      tiles.appendChild(a);
    });
  }

  function browse() {
    var g = params.get('genre'); if (g && !GENRES[g]) g = null;
    var state = { genre: g || 'all', mode: 'ebook', instock: false, free: false, sort: 'pop' };
    var chips = document.getElementById('cat-chips');
    var all = el('a', 'chip', 'All books'); all.href = '/browse/'; chips.appendChild(all);
    DATA.genres.forEach(function (x) { var a = el('a', 'chip', x.name); a.href = '/browse/?genre=' + x.id; chips.appendChild(a); });
    chips.querySelectorAll('a').forEach(function (a) { if ((state.genre === 'all' && a.getAttribute('href') === '/browse/') || a.getAttribute('href').endsWith('=' + state.genre)) { a.setAttribute('aria-current', 'page'); setTimeout(function () { a.scrollIntoView({ block: 'nearest', inline: 'center' }); }, 0); } });
    var G = GENRES[state.genre];
    if (state.genre === 'essentials') { document.getElementById('f-mode').hidden = true; document.getElementById('f-free-l').hidden = true; document.getElementById('f-src').hidden = true; document.getElementById('f-stock-t').textContent = 'In stock'; dealBox(document.getElementById('cat-deal')); }
    document.getElementById('cat-title').textContent = G ? G.name : 'All books';
    document.getElementById('cat-sub').textContent = G ? G.line : 'Classic fiction and course textbooks, as e-books or hard copies.';
    document.title = (G ? G.name : 'All books') + ' · GCTU Bookshop';
    var grid = document.getElementById('cat-grid'), count = document.getElementById('cat-count');
    function render() {
      var list = DATA.books.filter(function (b) { return state.genre === 'all' || b.genre === state.genre; });
      if (state.instock) list = list.filter(function (b) { return b.stock > 0; });
      if (state.free) list = list.filter(function (b) { return b.source === 'openstax'; });
      list = list.slice().sort(function (a, b) {
        if (state.sort === 'az') return a.title.localeCompare(b.title);
        if (state.sort === 'low') return (state.mode === 'hard' ? a.price - b.price : ebookPrice(a) - ebookPrice(b));
        if (state.sort === 'new') return (b.year || 0) - (a.year || 0);
        return a.rank - b.rank;
      });
      grid.replaceChildren();
      if (state.genre === 'essentials') {
        var es = DATA.essentials.filter(function (e) { return !state.instock || e.stock > 0; }).slice();
        if (state.sort === 'az') es.sort(function (a, b) { return a.name.localeCompare(b.name); });
        if (state.sort === 'low') es.sort(function (a, b) { return a.price - b.price; });
        grid.classList.add('ess-grid');
        es.forEach(function (e) { var c = essCard(e); c.classList.remove('rv'); grid.appendChild(c); });
        count.textContent = es.length + ' item' + (es.length === 1 ? '' : 's'); return;
      }
      grid.classList.remove('ess-grid');
      if (state.genre === 'afr') {
        var c = el('div', 'coming'); c.appendChild(el('b', null, 'African Stories are on the way'));
        c.appendChild(document.createTextNode('These come from African Storybook (CC BY 4.0) and are added in a later stage, with each author and illustrator credited.'));
        grid.appendChild(c); count.textContent = '0 books'; return;
      }
      list.forEach(function (b, i) { var c = card(b, state.mode); c.style.animationDelay = Math.min(i, 12) * 45 + 'ms'; grid.appendChild(c); });
      if (!list.length) grid.appendChild(el('p', 'empty', 'No books match these filters. Try clearing one.'));
      count.textContent = list.length + ' book' + (list.length === 1 ? '' : 's');
    }
    var form = document.getElementById('filters');
    form.addEventListener('change', function () {
      state.mode = form.querySelector('[name=mode]:checked').value;
      state.instock = document.getElementById('f-stock').checked;
      state.free = document.getElementById('f-free').checked;
      render();
    });
    document.getElementById('sort').addEventListener('change', function () { state.sort = this.value; render(); });
    var ft = document.getElementById('filter-toggle');
    ft.addEventListener('click', function () { var open = form.classList.toggle('open'); ft.setAttribute('aria-expanded', String(open)); });
    render();
  }

  function highlight(text, q) {
    var span = el('span'), i = text.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) { span.textContent = text; return span; }
    span.appendChild(document.createTextNode(text.slice(0, i))); span.appendChild(el('mark', null, text.slice(i, i + q.length))); span.appendChild(document.createTextNode(text.slice(i + q.length)));
    return span;
  }
  function search() {
    var input = document.getElementById('q'), box = document.getElementById('results');
    input.value = params.get('q') || '';
    function render() {
      var q = input.value.trim(); box.replaceChildren();
      var url = q ? '/search/?q=' + encodeURIComponent(q) : '/search/';
      history.replaceState(null, '', url);
      document.title = (q ? '“' + q + '” · ' : '') + 'Search · GCTU Bookshop';
      if (!q) { box.appendChild(el('p', 'empty', 'Type a title, author, genre or course code.')); return; }
      var ql = q.toLowerCase();
      var hits = DATA.books.filter(function (b) { return [b.title, b.author, b.course || '', b.faculty || '', GENRES[b.genre].name, String(b.year || '')].join(' ').toLowerCase().indexOf(ql) >= 0; });
      var ess = DATA.essentials.filter(function (e) { return (e.name + ' ' + e.blurb + ' stationery essentials').toLowerCase().indexOf(ql) >= 0; });
      if (!hits.length && ess.length) {
        box.appendChild(el('p', 'empty', ess.length + ' campus essential' + (ess.length > 1 ? 's' : '') + ' for “' + q + '”')).style.padding = '6px 0 0';
        var eg = el('div', 'grid ess-grid'); ess.forEach(function (e) { var c = essCard(e); c.classList.remove('rv'); eg.appendChild(c); }); box.appendChild(eg); return;
      }
      if (!hits.length) {
        var n = el('div', 'none'); n.appendChild(el('h2', null, 'No books found for “' + q + '”'));
        n.appendChild(el('p', null, 'We may not stock it yet. Ask the librarian and you’ll get a reply in your messages.'));
        var rb = el('button', 'btn navy', 'Request “' + q + '”'); rb.dataset.later = 'request'; n.appendChild(rb);
        box.appendChild(n); return;
      }
      box.appendChild(el('p', 'empty', hits.length + ' result' + (hits.length > 1 ? 's' : '') + ' for “' + q + '”')).style.padding = '6px 0 0';
      var list = el('div', 'results');
      hits.forEach(function (b, i) {
        var a = el('a', 'ritem'); a.href = '/book/?id=' + encodeURIComponent(b.id); a.style.animationDelay = Math.min(i, 10) * 40 + 'ms';
        a.appendChild(cover(b));
        var m = el('div'), t = el('b'); t.appendChild(highlight(b.title, q)); m.appendChild(t);
        var mm = el('span', 'm'); mm.appendChild(highlight(b.author + (b.course ? ' · ' + b.course : '') + ' · ' + GENRES[b.genre].name, q)); m.appendChild(mm);
        a.appendChild(m); a.appendChild(el('span', 'now', b.source === 'openstax' ? 'Free e-book' : cedi(ebookPrice(b))));
        list.appendChild(a);
      });
      box.appendChild(list);
      if (ess.length) { box.appendChild(el('h2', 'sub-h', 'Campus essentials')); var eg2 = el('div', 'grid ess-grid'); ess.forEach(function (e) { var c = essCard(e); c.classList.remove('rv'); eg2.appendChild(c); }); box.appendChild(eg2); }
    }
    var t; input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 120); });
    document.getElementById('big-search').addEventListener('submit', function (e) { e.preventDefault(); render(); });
    render();
    if (!input.value) input.focus();
  }

  function book() {
    var b = byId(params.get('id') || '');
    var main = document.getElementById('book-main');
    if (!b) {
      document.title = 'Book not found · GCTU Bookshop';
      var nf = el('div', 'notfound'); nf.appendChild(el('div', 'eyebrow', 'Not on our shelves'));
      nf.appendChild(el('h1', null, 'We couldn’t find that book')); nf.appendChild(el('p', null, 'The link may be old or mistyped. Try searching instead.'));
      var bt = el('div', 'btns'); var s = el('a', 'btn navy', 'Search books'); s.href = '/search/'; var br = el('a', 'btn line', 'Browse all'); br.href = '/browse/'; bt.appendChild(s); bt.appendChild(br); nf.appendChild(bt);
      main.replaceChildren(nf); return;
    }
    var G = GENRES[b.genre], os = b.source === 'openstax';
    document.title = b.title + ' · GCTU Bookshop';
    var crumbs = document.getElementById('crumbs');
    var h = el('a', null, 'Home'); h.href = '/'; var gl = el('a', null, G.name); gl.href = '/browse/?genre=' + b.genre;
    crumbs.appendChild(h); crumbs.appendChild(document.createTextNode(' / ')); crumbs.appendChild(gl); crumbs.appendChild(document.createTextNode(' / ' + b.title));
    var cw = document.getElementById('book-cover'); cw.appendChild(cover(b));
    document.getElementById('b-genre').textContent = os ? 'Course textbook · ' + b.faculty : G.name;
    document.getElementById('b-title').textContent = b.title;
    document.getElementById('b-by').textContent = os ? 'OpenStax · example course code ' + b.course : b.author + ' · ' + (b.year < 1700 ? 'c. ' : '') + b.year + ' · public domain';
    var seg = document.getElementById('seg'), big = document.getElementById('bigprice'), ship = document.getElementById('ship');
    var mode = b.stock === 0 ? 'ebook' : 'hard';
    if (b.stock === 0) seg.querySelector('[data-v="hard"]').disabled = true;
    function setMode(v) {
      mode = v; seg.dataset.v = v;
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === v)); });
      big.replaceChildren();
      if (v === 'hard') { big.appendChild(el('span', 'now', cedi(b.price))); big.appendChild(stockLine(b)); }
      else if (os) { big.appendChild(el('span', 'now', 'Free')); big.appendChild(el('span', 'save', 'OpenStax e-book')); }
      else { big.appendChild(el('span', 'now', cedi(ebookPrice(b)))); var s = el('s', null, cedi(b.price)); s.setAttribute('aria-label', 'hard copy price ' + cedi(b.price)); big.appendChild(s); big.appendChild(el('span', 'save', 'Save ' + b.saving + '% on the e-book')); }
      if (!reduce) { big.classList.remove('swap'); void big.offsetWidth; big.classList.add('swap'); }
      ship.replaceChildren();
      (v === 'hard' ? ['Campus pickup: free, ready in 1–2 working days', 'Delivery in Accra: 2–3 working days, ' + cedi(25), 'Elsewhere in Ghana: courier or bus parcel, 3–5 working days, ' + cedi(45)]
                    : ['Opens in My Library as soon as payment clears', 'Read on your phone or laptop, in the browser', 'Yours to keep']).forEach(function (s) { ship.appendChild(el('li', null, s)); });
    }
    seg.addEventListener('click', function (e) { var x = e.target.closest('button'); if (x && !x.disabled) setMode(x.dataset.v); });
    setMode(mode);
    document.getElementById('b-blurb').textContent = b.blurb;
    var facts = document.getElementById('facts');
    function fact(k, v) { var d = el('div'); d.appendChild(el('span', null, k)); d.appendChild(document.createTextNode(v)); facts.appendChild(d); }
    if (os) { fact('Course', b.course + ' (example)'); fact('Faculty', b.faculty); }
    else { fact('First published', (b.year < 1700 ? 'c. ' : '') + b.year); fact('Genre', G.name); }
    fact('Hard copy', b.stock === 0 ? 'Out of stock' : b.stock + ' in stock');
    fact('E-book', 'Reads in the browser');
    var lic = document.getElementById('licence');
    if (os) lic.textContent = 'OpenStax textbook, licensed CC BY 4.0. Access for free at openstax.org. Cover designed for this demo; OpenStax’s own covers and logo are not used.';
    else {
      lic.appendChild(document.createTextNode('Public domain: the author died more than 70 years ago, so the text is free to use in Ghana and worldwide. '));
      if (b.sourceUrl) { lic.appendChild(document.createTextNode('Edition and cover: ')); var se = el('a', null, 'Standard Ebooks'); se.href = b.sourceUrl; se.rel = 'noopener'; lic.appendChild(se); lic.appendChild(document.createTextNode(' (CC0 public domain dedication).')); }
      else lic.appendChild(document.createTextNode('Cover designed for this demo.'));
    }
    var more = DATA.books.filter(function (x) { return x.genre === b.genre && x.id !== b.id; }).slice(0, 8);
    document.getElementById('more-title').textContent = 'More ' + (os ? 'course textbooks' : G.name);
    shelf(document.getElementById('shelf-more'), more, 'More ' + G.name);
  }

  // ---------- motion ----------
  function tilt() {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card .cover-wrap'); if (!c) return;
      var cv = c.querySelector('.cover'), r = cv.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cv.style.setProperty('--ry', ((px - .5) * 16).toFixed(2) + 'deg'); cv.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
      cv.style.setProperty('--gx', (px * 100).toFixed(0) + '%'); cv.style.setProperty('--gy', (py * 100).toFixed(0) + '%');
    });
    document.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('.card .cover-wrap'); if (!c || c.contains(e.relatedTarget)) return;
      var cv = c.querySelector('.cover'); cv.style.setProperty('--ry', '0deg'); cv.style.setProperty('--rx', '0deg');
    });
  }
  function reveal() {
    var items = [].slice.call(document.querySelectorAll('.rv'));
    if (reduce || !('IntersectionObserver' in window)) return;
    var seen = false;
    var io = new IntersectionObserver(function (es) {
      seen = true;
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove('wait'); io.unobserve(en.target);
        setTimeout(function () { en.target.style.removeProperty('--d'); }, 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (x) {
      var sib = [].filter.call(x.parentNode.children, function (c) { return c.classList.contains('rv'); });
      var i = sib.indexOf(x); if (i > 0) x.style.setProperty('--d', Math.min(i, 4) * 90 + 'ms');
      x.classList.add('wait'); io.observe(x);
    });
    // safety net: if the observer never reports, show everything
    setTimeout(function () { if (!seen) items.forEach(function (x) { x.classList.remove('wait'); }); }, 2500);
  }

  // ---------- start ----------
  buildHeader(); buildFooter(); buildTabbar(); tilt();
  fetch('/data/books.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    DATA = d; d.genres.forEach(function (g) { GENRES[g.id] = g; }); GENRES.text = GENRES.text || { name: 'Course textbooks' };
    if (page === 'home') home();
    if (page === 'browse') browse();
    if (page === 'search') search();
    if (page === 'book') book();
    reveal();
  }).catch(function () {
    var m = document.getElementById('main');
    if (m) { var p = el('p', 'coming', 'The catalogue could not load. Check your connection and refresh the page.'); p.style.margin = '30px auto'; m.prepend(p); }
    reveal();
  });
})();
