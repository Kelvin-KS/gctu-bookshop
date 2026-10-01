/* GCTU Bookshop · messages between lecturers and the librarian.
   Shared by the admin and Faculty desk pages. Until the database is connected, conversations are
   kept in this browser (localStorage "gb-msgs"), so you can reply by switching demo roles.
   Messages are plain text only: they are shown with textContent, so links or code never run. */
(function () {
  'use strict';
  var KEY = 'gb-msgs', DAY = 86400000, MAX = 1000;
  var store = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function dayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

  function init(sample) {
    try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { store = null; }
    if (store && store.v === 1) return store;
    var now = Date.now();
    store = { v: 1, threads: {} };
    Object.keys(sample.threads).forEach(function (id) {
      var msgs = sample.threads[id].map(function (m, i) {
        var t = m.time.split(':'), d = new Date(dayStart(now - m.daysAgo * DAY)); d.setHours(+t[0], +t[1]);
        return { id: id + '-' + i, from: m.from, text: m.text, at: Math.min(d.getTime(), now - 60000 * (sample.threads[id].length - i)), book: m.book || null };
      });
      var last = msgs[msgs.length - 1];
      // Demo starting point: each side has one unread message waiting.
      store.threads[id] = { msgs: msgs, readL: last.from === 'librarian' ? last.at - 1 : now, readA: last.from === 'lecturer' ? last.at - 1 : now };
    });
    save(); return store;
  }
  function reload() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) store = s; } catch (e) {} }
  function thread(id) { return store.threads[id] || (store.threads[id] = { msgs: [], readL: 0, readA: 0 }); }
  function unread(role, id) {
    var ids = id ? [id] : Object.keys(store.threads), n = 0;
    ids.forEach(function (k) { var t = store.threads[k]; if (!t) return; var seen = role === 'lecturer' ? t.readL : t.readA, other = role === 'lecturer' ? 'librarian' : 'lecturer';
      t.msgs.forEach(function (m) { if (m.from === other && m.at > seen) n++; }); });
    return n;
  }
  function last(id) { var t = store.threads[id]; return t && t.msgs.length ? t.msgs[t.msgs.length - 1] : null; }
  function markRead(role, id) { var t = thread(id); if (role === 'lecturer') t.readL = Date.now(); else t.readA = Date.now(); save(); }
  function when(t) {
    var d = new Date(t), today = dayStart(Date.now());
    var time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (t >= today) return time;
    if (t >= today - DAY) return 'Yesterday ' + time;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + time;
  }
  function dayLabel(t) {
    var today = dayStart(Date.now()), d = dayStart(t);
    if (d === today) return 'Today'; if (d === today - DAY) return 'Yesterday';
    return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* Draws one conversation into `host`.
     opts: role ('lecturer' | 'librarian'), id (lecturer id), otherName, otherSub, avatar,
           findBook(id) -> {name, sub, img, href} | null, searchBooks(term) -> [{id, name, sub}],
           toast(msg), onChange() */
  function render(host, opts) {
    host.replaceChildren();
    var me = opts.role, other = me === 'lecturer' ? 'librarian' : 'lecturer';
    var box = el('section', 'msg-thread'); box.setAttribute('aria-label', 'Conversation with ' + opts.otherName);
    var head = el('div', 'msg-head'); head.appendChild(el('span', 'msg-av', opts.avatar));
    var hn = el('div'); hn.appendChild(el('b', null, opts.otherName)); hn.appendChild(el('span', null, opts.otherSub)); head.appendChild(hn); box.appendChild(head);
    var list = el('ol', 'msg-list'); list.setAttribute('aria-live', 'polite'); list.setAttribute('aria-label', 'Messages'); box.appendChild(list);
    function bookCard(id) {
      var b = opts.findBook(id); if (!b) return null;
      var a = el('a', 'msg-book'); a.href = b.href;
      if (b.img) { var im = el('img'); im.src = b.img; im.alt = ''; im.width = 34; im.height = 48; a.appendChild(im); }
      var t = el('span'); t.appendChild(el('b', null, b.name)); t.appendChild(el('small', null, b.sub)); a.appendChild(t);
      return a;
    }
    function draw() {
      list.replaceChildren();
      var t = thread(opts.id), prevDay = null, otherRead = me === 'lecturer' ? t.readA : t.readL;
      if (!t.msgs.length) list.appendChild(el('li', 'msg-empty', 'No messages yet. Say hello, or ask about a book.'));
      t.msgs.forEach(function (m, i) {
        var d = dayStart(m.at);
        if (d !== prevDay) { list.appendChild(el('li', 'msg-day', dayLabel(m.at))); prevDay = d; }
        var li = el('li', 'msg-item ' + (m.from === me ? 'mine' : 'theirs'));
        var bub = el('div', 'bub'); if (m.text) bub.appendChild(el('p', null, m.text));
        if (m.book) { var bc = bookCard(m.book); if (bc) bub.appendChild(bc); }
        li.appendChild(bub);
        var meta = el('span', 'msg-meta', when(m.at));
        if (m.from === me && i === t.msgs.length - 1) meta.textContent += otherRead >= m.at ? ' · Seen' : ' · Sent';
        li.appendChild(meta);
        if (m.from !== me && m.at > (me === 'lecturer' ? t.readL : t.readA)) li.classList.add('is-new');
        list.appendChild(li);
      });
      list.scrollTop = list.scrollHeight;
    }
    // compose
    var form = el('form', 'msg-compose'); form.noValidate = true;
    var attach = null;
    var chip = el('div', 'msg-chip'); chip.hidden = true;
    var ta = el('textarea'); ta.rows = 2; ta.maxLength = MAX; ta.placeholder = 'Write a message…'; ta.setAttribute('aria-label', 'Message to ' + opts.otherName);
    var row = el('div', 'msg-row');
    var ab = el('button', 'btn line sm', '+ Attach a book'); ab.type = 'button'; ab.setAttribute('aria-expanded', 'false');
    var count = el('span', 'msg-count', '0 / ' + MAX);
    var send = el('button', 'btn slate sm', 'Send'); send.type = 'submit';
    row.appendChild(ab); row.appendChild(count); row.appendChild(send);
    var picker = el('div', 'msg-picker'); picker.hidden = true;
    var q = el('input'); q.type = 'search'; q.placeholder = 'Search the catalogue'; q.setAttribute('aria-label', 'Search for a book to attach'); q.autocomplete = 'off';
    var res = el('ul', 'msg-res'); picker.appendChild(q); picker.appendChild(res);
    form.appendChild(chip); form.appendChild(ta); form.appendChild(picker); form.appendChild(row);
    var err = el('p', 'err'); err.setAttribute('role', 'alert'); form.appendChild(err);
    form.appendChild(el('p', 'msg-hint', 'Demo: both sides use this browser. Switch to the ' + (me === 'lecturer' ? 'librarian (admin demo)' : 'lecturer demo') + ' to see this message arrive and reply.'));
    box.appendChild(form);
    function setChip(id) {
      attach = id; chip.replaceChildren();
      if (!id) { chip.hidden = true; return; }
      var b = opts.findBook(id); chip.hidden = false;
      chip.appendChild(el('span', null, '📖 ' + b.name));
      var x = el('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + b.name); x.addEventListener('click', function () { setChip(null); ta.focus(); }); chip.appendChild(x);
    }
    ab.addEventListener('click', function () { var open = picker.hidden; picker.hidden = !open; ab.setAttribute('aria-expanded', String(open)); if (open) q.focus(); });
    q.addEventListener('input', function () {
      res.replaceChildren(); var term = q.value.trim(); if (term.length < 2) return;
      var hits = opts.searchBooks(term).slice(0, 5);
      if (!hits.length) { res.appendChild(el('li', 'muted-a', 'Not in the catalogue. Describe it in your message instead.')); return; }
      hits.forEach(function (h) { var li = el('li'), b = el('button', null); b.type = 'button'; b.appendChild(el('b', null, h.name)); b.appendChild(el('small', null, h.sub)); b.addEventListener('click', function () { setChip(h.id); picker.hidden = true; ab.setAttribute('aria-expanded', 'false'); q.value = ''; res.replaceChildren(); ta.focus(); }); li.appendChild(b); res.appendChild(li); });
    });
    ta.addEventListener('input', function () { count.textContent = ta.value.length + ' / ' + MAX; err.textContent = ''; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); } });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); reload();
      var text = ta.value.trim();
      if (!text && !attach) { err.textContent = 'Write a message or attach a book.'; ta.focus(); return; }
      if (text.length > MAX) { err.textContent = 'Keep it under ' + MAX + ' characters.'; return; }
      var t = thread(opts.id);
      t.msgs.push({ id: opts.id + '-' + Date.now().toString(36), from: me, text: text, at: Date.now(), book: attach });
      if (me === 'lecturer') t.readL = Date.now(); else t.readA = Date.now();
      save(); ta.value = ''; ta.style.height = ''; count.textContent = '0 / ' + MAX; setChip(null); draw();
      if (opts.toast) opts.toast('Message sent to ' + opts.otherName + '.');
      if (opts.onChange) opts.onChange();
      ta.focus();
    });
    host.appendChild(box);
    // Draw first so unread messages are highlighted, then mark them as read.
    reload(); draw(); markRead(me, opts.id); if (opts.onChange) opts.onChange();
    // Pick up replies sent from the other role in another tab.
    function onStorage(ev) { if (ev.key === KEY && document.body.contains(list)) { reload(); draw(); markRead(me, opts.id); if (opts.onChange) opts.onChange(); } }
    window.addEventListener('storage', onStorage);
  }

  window.GBMessages = { init: init, unread: unread, last: last, render: render, reload: reload, when: when, threads: function () { return store.threads; } };
})();
