/* THE 3D FUTURE public page, the behaviour (inlined at the end of src/pages/the-3d-future/index.astro).
   The head script has already set html[data-phase] (before · early · open · after;
   24/11: after = from Sat 5/12, the doors stay open at €19, only the founders' €9 is over), html[data-v] (a · b) and
   window.__t3f = { off, v } (off = the ?at= preview offset). Every call to the APIs may fail: the page then says
   "Something went wrong, try again" and stays usable. */
(function () {
  var h = document.documentElement, q = new URLSearchParams(location.search);
  var T = window.__t3f || { off: 0, v: h.getAttribute('data-v') || 'a' };
  var now = function () { return Date.now() + T.off; };
  var E = +h.dataset.tEarly, O = +h.dataset.tOpen, C = +h.dataset.tClose, SEATS = 100;
  var phaseAt = function (t) { return t < E ? 'before' : t < O ? 'early' : t < C ? 'open' : 'after'; };
  var phase = h.getAttribute('data-phase');
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var atQ = q.get('at') ? '?at=' + encodeURIComponent(q.get('at').replace(' ', '+')) : '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var NAME = T.v === 'b' ? '3D THAT SELLS' : 'THE 3D FUTURE';
  var URL_ = 'https://www.omnyalab.com/the-3d-future';
  var FAIL = 'Something went wrong, try again';
  var store = function (s) { return { get: function (k) { try { return JSON.parse(s.getItem(k) || 'null'); } catch (e) { return null; } }, set: function (k, v) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} } }; };
  var ss = store(window.sessionStorage), ls = store(window.localStorage);
  var ig = ''; try { ig = localStorage.getItem('omnya-ig') || ''; } catch (e) {}
  var post = function (url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d || {} }; }); });
  };

  /* ---------- toast ---------- */
  var toastEl = $('[data-toast]'), toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800); }

  /* ---------- the clock: countdowns, and the phase changing while the page is open ---------- */
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function tick() {
    var t = now(), p = phaseAt(t);
    if (p !== phase) { phase = p; h.setAttribute('data-phase', p); loadSeats(); }
    $$('[data-cd]').forEach(function (el) {
      var ms = Math.max(0, (el.dataset.cd === 'early' ? E : C) - t);
      var v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
      $$('b[data-part]', el).forEach(function (b) { var x = v[b.dataset.part], s = b.dataset.part === 'd' ? String(x) : pad(x); if (b.textContent !== s) b.textContent = s; });
    });
  }
  tick(); setInterval(tick, 1000);

  /* ---------- seats and price: the real count from Stripe (api/club.js); ?seats=<n> previews the seats taken ---------- */
  var taken = null, proof = ss.get('t3f-proof');
  if (proof && !(proof.token && Date.now() - proof.at < 23 * 36e5)) proof = null;
  function renderSeats() {
    var box = $('[data-seatbox]');
    if (taken === null) box.hidden = true;
    else {
      var n = Math.min(SEATS, taken); box.hidden = false; $('[data-left]').textContent = String(SEATS - n);
      $$('[data-seatbar] i').forEach(function (i, k) { var f = Math.max(0, Math.min(1, (n - k * 5) / 5)); i.className = f >= 1 ? 'on' : f > 0 ? 'part' : ''; i.style.setProperty('--f', Math.round(f * 100) + '%'); });
    }
    // 23/11: the whole founders' round is €9, the 100 are the gifts; 24/11: after 4/12 €19, €9 for a proven guide buyer
    var eur = phase === 'after' && !proof ? '€19' : '€9';
    $$('[data-eur]').forEach(function (e) { if (e.textContent !== eur) e.textContent = eur; });
  }
  var seatsTimer = null;
  function loadSeats() {
    var raw = q.get('seats');
    if (raw !== null) { taken = Math.max(0, parseInt(raw, 10) || 0); return renderSeats(); }
    var live = function () { return false; }; // 25/11 Nico «basta contatore»: no number on the page (the seat box stays hidden)
    if (!live()) return renderSeats();
    fetch('/api/club/seats' + atQ).then(function (r) { return r.ok ? r.json() : null; })
      .then(function () { renderSeats(); })   // 26/11: the API no longer gives the count (Nico: nobody must know how many are inside)
      .catch(function () { renderSeats(); });
    if (!seatsTimer) seatsTimer = setInterval(function () { if (live()) loadSeats(); }, 60000);
  }
  loadSeats();

  /* ---------- the numbers count up once, when they come into view ---------- */
  if (!RM && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var el = e.target; io.unobserve(el);
        var n = +el.dataset.count, dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '', t0 = performance.now();
        var step = function (t) { var p = Math.min(1, (t - t0) / 1100), k = 1 - Math.pow(1 - p, 3); el.textContent = pre + (dec ? (n * k).toFixed(dec) : Math.round(n * k).toLocaleString('en-US')) + suf; if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.35 });
    $$('[data-count]').forEach(function (el) { io.observe(el); });
  }

  /* ---------- the page takes the colour of the section in the middle of the screen ---------- */
  var secs = $$('main > [data-tint]');
  var tint = function () { var mid = scrollY + innerHeight * 0.5, cur = secs[0]; secs.forEach(function (s) { if (s.offsetTop <= mid) cur = s; }); if (document.body.style.getPropertyValue('--tint') !== cur.dataset.tint) document.body.style.setProperty('--tint', cur.dataset.tint); };
  addEventListener('scroll', tint, { passive: true }); tint();

  /* ---------- the Vault: on the computer the card under the pointer (or the focus) opens; a tap joins ---------- */
  var cards = $$('[data-card]');
  cards.forEach(function (c) {
    var openIt = function () { cards.forEach(function (x) { x.classList.toggle('open', x === c); }); };
    c.addEventListener('mouseenter', openIt); c.addEventListener('focus', openIt);
    var go = function (e) { if (c.hasAttribute('data-soon')) toast('The next build opens Friday 4 December'); else join(c, e); };
    c.addEventListener('click', go);
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
  });

  /* ---------- buttons ---------- */
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]'); if (j) { e.preventDefault(); join(j); return; }
    var lj = e.target.closest('[data-list]'); if (lj) { e.preventDefault(); openList(lj); return; } // 25/11: the free list, without the gift
    var s = e.target.closest('[data-see]'); if (s) { e.preventDefault(); $('#vault').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }
  });
  function join(from) { openPay(from); } // 24/11: the doors never close; 25/11: before the opening it is the reservation with the card

  /* ---------- dialogs: one open at a time, Escape and the back button close it, the focus stays inside ---------- */
  var cur = null, back = null, sheet = $('[data-sheet]');
  function showOv(ov, from) {
    back = from || document.activeElement; ov.hidden = false; cur = ov; h.classList.add('lock');
    try { history.pushState({ t3f: ov.dataset.ov }, ''); } catch (e) {}
  }
  function hideOv(fromPop) {
    if (!cur) return; closeSheet(); cur.hidden = true; cur = null; h.classList.remove('lock');
    if (!fromPop && history.state && history.state.t3f) history.back();
    if (back && back.focus) back.focus({ preventScroll: true });
  }
  addEventListener('popstate', function () { if (cur) hideOv(true); });
  document.addEventListener('keydown', function (e) {
    if (!cur) return;
    if (e.key === 'Escape') { if (!sheet.hidden) closeSheet(); else hideOv(); return; }
    if (e.key !== 'Tab') return;
    var box = sheet.hidden ? cur : sheet;
    var f = $$('a[href],button:not([disabled]),input:not([tabindex="-1"]),iframe,[tabindex="0"]', box).filter(function (x) { return (x.offsetParent !== null || x.tagName === 'IFRAME') && !x.closest('[inert]'); });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  $$('[data-ov] [data-close]').forEach(function (b) { b.addEventListener('click', function () { hideOv(); }); });
  var focusHead = function (el) { setTimeout(function () { if (el) el.focus({ preventScroll: true }); }, 30); };

  /* ---------- A2: the pre-registration in three steps ---------- */
  var L = $('[data-ov="list"]'), want = 'tower', ROUND = 'r1'; // the list is only before the doors open
  function setStep(n) {
    L.dataset.step = String(n);
    $$('[data-s]', L).forEach(function (s) { s.hidden = +s.dataset.s !== n; });
    $('[data-steppanel]', L).hidden = n === 3; $('[data-x3]', L).hidden = n !== 3;
    var tr = $('[data-track]', L), w = (n * 33.3) + '%';
    tr.firstElementChild.style.width = w; tr.lastElementChild.style.left = w; tr.lastElementChild.textContent = n + '/3';
    tr.setAttribute('aria-valuenow', String(n)); tr.setAttribute('aria-label', 'Step ' + n + ' of 3');
    $$('[data-dots] span', L).forEach(function (d, i) { if (i === n - 1) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    L.setAttribute('aria-labelledby', 't3f-l' + n);
    L.scrollTop = 0; focusHead($('#t3f-l' + n));
  }
  function openList(from) { setStep(ls.get('t3f-listed') === ROUND ? 3 : 1); showOv(L, from); focusHead($('#t3f-l' + L.dataset.step)); }
  $('[data-back]', L).addEventListener('click', function () { var n = +L.dataset.step; if (n > 1) setStep(n - 1); else hideOv(); });
  $('[data-next]', L).addEventListener('click', function () { setStep(2); });
  var opts = $$('[data-want]', L);
  var pick = function (b) { opts.forEach(function (o) { var on = o === b; o.setAttribute('aria-checked', on ? 'true' : 'false'); o.tabIndex = on ? 0 : -1; }); want = b.dataset.want; };
  opts.forEach(function (b, i) {
    b.addEventListener('click', function () { pick(b); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); var nb = opts[(i + d + opts.length) % opts.length]; pick(nb); nb.focus();
    });
  });
  var lf = $('[data-listform]', L), saving = false;
  lf.addEventListener('submit', function (e) {
    e.preventDefault(); if (saving) return;
    var nm = lf.elements.name, em = lf.elements.email, name = nm.value.trim(), email = em.value.trim();
    [nm, em].forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (name.length < 2) { nm.setAttribute('aria-invalid', 'true'); toast('Add your name to save your seat'); nm.focus(); return; }
    if (!EMAIL.test(email)) { em.setAttribute('aria-invalid', 'true'); toast('Add an email we can write to, like you@studio.com'); em.focus(); return; }
    var btn = $('[data-save]', lf); saving = true; btn.disabled = true; btn.textContent = 'Saving…';
    // the Meta Lead, only if the visitor accepted cookies (public/consent.js), with the same event id as the server one
    var eid = 'lead_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var ads = !!(window.omnyaTrack && window.omnyaTrack('Lead', { content_name: 'waitlist-3d-future' }, eid));
    var fbp = (document.cookie.match(/(?:^|; )_fbp=([^;]+)/) || [])[1] || '';
    // api/optin.js keeps page (40 characters) and k (the word, 20): the reel and the first build ride in page as a query,
    // so the Meta event URL stays a real address; k is the name variant
    var page = ('the-3d-future?ig=' + (ig || '-') + '&b=' + want).slice(0, 40);
    post('/api/optin', { free: 'waitlist-3d-future', name: name, email: email, page: page, k: T.v, company: lf.elements.company.value, cv: 'v3', nl: false, ads: ads, eid: eid, fbp: ads ? fbp : '' })
      .then(function (r) {
        if (!r.ok) throw new Error();
        ls.set('t3f-listed', ROUND); ss.set('t3f-who', { name: name, email: email });
        setStep(3);
      })
      .catch(function () { toast(FAIL); })
      .then(function () { saving = false; btn.disabled = false; btn.textContent = 'Save my seat'; });
  });

  /* step 3: put the early door in a calendar, share the page */
  var sheetBack = null;
  function closeSheet() { if (sheet.hidden) return; sheet.hidden = true; if (sheetBack) sheetBack.focus({ preventScroll: true }); }
  $$('[data-sheetx]').forEach(function (b) { b.addEventListener('click', closeSheet); });
  (function () {
    var sum = NAME + ' · your early door', det = 'Your door opens at 09:00 CET: ' + URL_;
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Omnya Lab//THE 3D FUTURE//EN', 'BEGIN:VEVENT', 'UID:t3f-round1-early@omnyalab.com', 'DTSTAMP:20261120T090000Z',
      'DTSTART:20261128T080000Z', 'DTEND:20261128T090000Z', 'SUMMARY:' + sum, 'DESCRIPTION:' + det, 'URL:' + URL_, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    $('[data-ics]').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    $('[data-gcal]').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(sum) + '&dates=20261128T080000Z/20261128T090000Z&details=' + encodeURIComponent(det);
    $('[data-ocal]').href = 'https://outlook.live.com/calendar/0/deeplink/compose?subject=' + encodeURIComponent(sum) + '&startdt=2026-11-28T08:00:00Z&enddt=2026-11-28T09:00:00Z&body=' + encodeURIComponent(det);
  })();
  $('[data-sched]', L).addEventListener('click', function (e) { sheetBack = e.currentTarget; sheet.hidden = false; focusHead($('[data-sheetx].x', sheet)); });
  $('[data-share]', L).addEventListener('click', function () {
    if (navigator.share) { navigator.share({ title: NAME, url: URL_ }).catch(function () {}); return; }
    var done = function () { toast('Link copied, send it to a friend'); };
    if (navigator.clipboard) navigator.clipboard.writeText(URL_).then(done, function () { toast(URL_); }); else toast(URL_);
  });

  /* ---------- the receipt: "#" + the number, or the email paid with (POST /api/club/verify) ---------- */
  var R = $('[data-rcpt]'), rin = $('[data-rinput]', R), mode = 'r';
  function setMode(m) {
    mode = m; $$('[data-mode]', R).forEach(function (x) { x.hidden = x.dataset.mode !== m; });
    rin.value = ''; rin.type = m === 'e' ? 'email' : 'text'; rin.inputMode = m === 'e' ? 'email' : 'numeric';
    rin.autocomplete = m === 'e' ? 'email' : 'off'; rin.placeholder = m === 'e' ? 'you@studio.com' : '1415-7362';
    rin.setAttribute('aria-label', m === 'e' ? 'Email you paid with' : 'Receipt number');
    $('[data-rno]', R).hidden = true; $('[data-rin]', R).removeAttribute('aria-invalid');
  }
  $('[data-rswitch]', R).addEventListener('click', function () { setMode(mode === 'r' ? 'e' : 'r'); rin.focus(); });
  var showOk = function () { $('[data-rok]', R).hidden = false; $('[data-rno]', R).hidden = true; };
  if (proof) { if (proof.email) { setMode('e'); rin.value = proof.email; } else rin.value = proof.receipt || ''; showOk(); }
  var checking = false;
  R.addEventListener('submit', function (e) {
    e.preventDefault(); if (checking) return;
    var v = rin.value.trim(), no = $('[data-rno]', R), box = $('[data-rin]', R);
    var bad = function (t) { box.setAttribute('aria-invalid', 'true'); no.textContent = t; no.hidden = false; $('[data-rok]', R).hidden = true; };
    box.removeAttribute('aria-invalid');
    if (mode === 'r' && !/^#?\s*\d{3,5}([-\s]\d{3,5}){1,2}$/.test(v)) return bad('The receipt number looks like 1415-7362');
    if (mode === 'e' && !EMAIL.test(v)) return bad('That email does not look right');
    checking = true; R.setAttribute('aria-busy', 'true');
    post('/api/club/verify', mode === 'r' ? { receipt: v } : { email: v })
      .then(function (r) {
        if (r.ok && r.d.buyer && r.d.token) {
          proof = { token: r.d.token, at: Date.now(), receipt: mode === 'r' ? v : '', email: mode === 'e' ? v : '' };
          ss.set('t3f-proof', proof); showOk(); renderSeats(); return;
        }
        if (r.ok) return bad(mode === 'r' ? 'We could not find that receipt, try the email you paid with' : 'We could not find a guide paid with that email');
        bad(r.status === 400 || r.status === 429 ? (r.d.error || FAIL) : FAIL);
      })
      .catch(function () { bad(FAIL); })
      .then(function () { checking = false; R.removeAttribute('aria-busy'); });
  });

  /* ---------- the join in four cards that change (25/11 Nico): 01-03 a question each, a tap answers and the next card
     comes in; 04 name and email, «Join», then the Stripe fields of api/club.js (ui 'elements') in the same card ---------- */
  var P = $('[data-ov="pay"]'), cardsJ = $$('.jc', P), bgs = $$('[data-bg]', P);
  var pf = $('[data-payform]', P), stage = $('[data-paystage]', P), pbox = $('[data-paybox]', P), perr = $('[data-perr]', P);
  var payBtn = $('[data-pay]', P), goBtn = $('[data-go]', P), actions = null, pel = null, cel = null, cbox = null, opening = false, step = 1, nextT = null;
  var DEMO = !!q.get('demo');
  var LOOK = { theme: 'night', labels: 'above', variables: { colorPrimary: '#0071e3', colorBackground: '#16234d', colorText: '#ffffff', colorTextSecondary: '#c9d4ea', colorTextPlaceholder: '#8e9bbb', colorDanger: '#ff8a7a', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif', fontSizeBase: '17px', borderRadius: '16px', spacingUnit: '4px' },
    rules: { '.Input': { border: '1px solid #44527a', boxShadow: 'none' }, '.Input:focus': { border: '1px solid #ffffff', boxShadow: 'none' }, '.Label': { color: '#c9d4ea', fontWeight: '600', fontSize: '13px' }, '.Tab': { border: '1px solid #44527a' } } };
  function loadStripe() { return window.Stripe ? Promise.resolve() : new Promise(function (ok, no) { var sc = document.createElement('script'); sc.src = 'https://js.stripe.com/endive/stripe.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }); }
  function go(n, focus) {
    clearTimeout(nextT); step = n; P.dataset.step = String(n);
    cardsJ.forEach(function (c) { var k = +c.dataset.c; c.classList.toggle('cur', k === n); c.classList.toggle('past', k < n); c.setAttribute('aria-hidden', k === n ? 'false' : 'true'); c.inert = k !== n; });
    bgs.forEach(function (b) { b.classList.toggle('on', +b.dataset.bg === n); });
    // 27/11 (Nico, board «Buddy»): seven cards, one green bar that fills
    var NC = cardsJ.length, bar = $('[data-jbar]', P); if (bar) bar.style.width = (n / NC * 100).toFixed(1) + '%';
    var pr = $('[data-jprog]', P); pr.setAttribute('aria-valuenow', String(n)); pr.setAttribute('aria-label', 'Card ' + n + ' of ' + NC);
    if (n === 5) plan();
    fleft();
    P.setAttribute('aria-labelledby', 't3f-c' + n); P.scrollTop = 0;
    if (focus !== false) focusHead($('#t3f-c' + n));
  }
  /* the answers: a tap picks and, a moment later, the next card comes in (nothing is required: every question has an
     answer for everyone) */
  var ans = { build: 'tower' };
  /* 27/11 (Nico, T2): card 4 is one big photo at a time; the one in front is the answer, the pills jump to the others */
  (function () {
    var t = $('[data-tbt]', P); if (!t) return;
    var cs = $$('[data-tbk]', t), ps = $$('[data-tbgo]', P);
    function mark(k) { ans.build = k; cs.forEach(function (x) { x.setAttribute('aria-checked', x.dataset.tbk === k ? 'true' : 'false'); }); ps.forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.tbgo === k ? 'true' : 'false'); }); }
    function front() { var w = cs[0].offsetWidth || 1, gap = cs.length > 1 ? cs[1].offsetLeft - cs[0].offsetLeft : w; return cs[Math.max(0, Math.min(cs.length - 1, Math.round(t.scrollLeft / gap)))]; }
    function to(k) { var el = cs.filter(function (x) { return x.dataset.tbk === k; })[0]; if (!el) return; t.scrollTo({ left: el.offsetLeft - cs[0].offsetLeft, behavior: RM ? 'auto' : 'smooth' }); mark(k); }
    t.addEventListener('scroll', function () { var f = front(); if (f && f.dataset.tbk !== ans.build) mark(f.dataset.tbk); }, { passive: true });
    ps.forEach(function (p) { p.addEventListener('click', function () { to(p.dataset.tbgo); }); });
    cs.forEach(function (x) { x.addEventListener('click', function () { if (ans.build === x.dataset.tbk) { go(Math.min(cardsJ.length, step + 1)); } else to(x.dataset.tbk); }); });
  })();
  $$('[data-ask]', P).forEach(function (g) {
    var bs = $$('[data-pick]', g);
    bs.forEach(function (b) { b.addEventListener('click', function () {
      bs.forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
      ans[g.dataset.ask] = b.dataset.pick;
      var n = +g.dataset.c; clearTimeout(nextT); nextT = setTimeout(function () { if (step === n) go(n + 1); }, RM ? 0 : 380);
    }); });
  });
  /* card 5: the plan, written from the answers (nothing invented: what the club has for that answer) */
  var PLAN = {
    build: { tower: 'SAMAR, floor by floor · the 11-step course', stadium: 'The Stadium · its build is in the Vault', house: 'The House Builder skill · yours to keep', own: 'SAMAR, floor by floor · the 11-step course' },
    use: { clients: 'A page developers pay for', projects: 'Your projects shown before they are built', service: 'A 3D service you can sell', learn: 'The 3D that sells, step by step' },
    now: { new: 'You start from step 01, nothing skipped', images: 'Your images become a page buyers use', sell: 'Faster builds, with Claude doing the work' }
  };
  function plan() { ['build'].forEach(function (k) { var el = $('[data-plan="' + k + '"]', P); if (el) el.textContent = PLAN[k][ans[k]] || PLAN[k][Object.keys(PLAN[k])[0]]; }); }
  /* card 6: the founders' price ends on Fri 4/12 23:59 Rome (FOUNDERS_END = Sat 5/12 00:00) */
  var FEND = Date.parse('2026-12-05T00:00:00+01:00'), fT = null;
  function fleft() {
    var el = $('[data-fleft]', P); if (!el) return;
    var s = Math.max(0, Math.floor((FEND - Date.now()) / 1000)), box = $('[data-fbox]', P);
    if (box) box.hidden = !s;
    el.textContent = Math.floor(s / 86400) + 'd ' + ('0' + Math.floor(s % 86400 / 3600)).slice(-2) + 'h ' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + 'm';
    if (!fT) fT = setInterval(fleft, 30000);
  }
  P.addEventListener('click', function (e) { if (e.target.closest('[data-jnext]')) { e.preventDefault(); go(Math.min(cardsJ.length, step + 1)); } });
  function setStage(st) { P.dataset.stage = st; pf.hidden = st !== 'ask'; stage.hidden = st !== 'card'; }
  function payReset() {
    if (pel) { try { pel.destroy(); } catch (e) {} pel = null; }
    if (cel) { try { cel.destroy(); } catch (e) {} cel = null; } if (cbox && cbox.parentNode) { cbox.parentNode.removeChild(cbox); } cbox = null;
    actions = null; setStage('ask'); pbox.className = 'paybox'; pbox.innerHTML = ''; perr.textContent = ''; $('[data-early]', P).hidden = true;
    goBtn.disabled = false; goBtn.textContent = 'Join the club';
    var eur = phase === 'after' && !proof ? '€19' : '€9';
    $$('[data-payeur],[data-payeur2]', P).forEach(function (x) { x.textContent = eur; });
    var th = $('.jthen b', P); if (th) th.textContent = eur + '/month';
  }
  /* 27/11 (Nico, E1): whoever arrives from a link (the sticker, a reel, a funnel) lands on Buddy's cards; «See the whole page»
     closes them. Once per visit, never for a member this phone knows, never with ?page=1 */
  setTimeout(function () {
    if (!P || !P.hidden) return;
    if (q.get('join') === '1') { openPay(); return; }
    var member = false; try { member = !!localStorage.getItem('t3f-m'); } catch (e) {}
    if (q.get('page') === '1' || member || ss.get('t3f-e1')) return;
    ss.set('t3f-e1', 1); openPay('auto');
  }, 300);
  function openPay(from) {
    payReset();
    $('[data-paid]', P).hidden = !proof;
    var who = ss.get('t3f-who') || {};
    if (!pf.elements.name.value && who.name) pf.elements.name.value = who.name;
    if (!pf.elements.email.value) pf.elements.email.value = (proof && proof.email) || who.email || '';
    showOv(P, from); go(1);
    if (!DEMO) loadStripe().catch(function () {});
  }
  $('[data-jback]', P).addEventListener('click', function () {
    if (step === cardsJ.length && P.dataset.stage === 'card') { payReset(); focusHead($('#t3f-c' + step)); return; }
    if (step > 1) go(step - 1); else hideOv();
  });
  $('[data-jedit]', P).addEventListener('click', function () { payReset(); pf.elements.name.focus(); });
  /* ?demo=1: the card step with a stand-in of the Stripe fields, for the board (no call to Stripe, nothing is charged) */
  function demoCard() {
    pbox.innerHTML = '<div class="demo"><label>Card number<span>1234 1234 1234 1234</span></label><div class="two2"><label>Expiry date<span>MM / YY</span></label><label>Security code<span>CVC</span></label></div><label>Country<span>Italy</span></label></div>';
  }
  pf.addEventListener('submit', function (e) {
    e.preventDefault(); if (opening) return;
    var nm = pf.elements.name, em = pf.elements.email, name = nm.value.trim(), email = em.value.trim();
    [nm, em].forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (name.length < 2) { nm.setAttribute('aria-invalid', 'true'); toast('Add your name'); nm.focus(); return; }
    if (!EMAIL.test(email)) { em.setAttribute('aria-invalid', 'true'); toast('Add an email we can write to, like you@studio.com'); em.focus(); return; }
    ss.set('t3f-who', { name: name, email: email });
    $('[data-me]', P).textContent = name + ' · ' + email;
    if (DEMO) { setStage('card'); demoCard(); return; }
    opening = true; goBtn.disabled = true; goBtn.textContent = 'Opening…'; perr.textContent = ''; $('[data-early]', P).hidden = true;
    var body = { name: name, email: email, plan: 'month', v: T.v, company: pf.elements.company.value, q: [ans.build || '', ans.use || '', ans.now || ''].join('|') };
    if (proof && proof.token) body.token = proof.token;
    if (/^[A-Za-z0-9._]{1,30}$/.test(ig)) body.ig = ig; // api/club.js takes an Instagram-like code only
    Promise.all([post('/api/club/checkout' + atQ, body), loadStripe().catch(function () { return null; })])
      .then(function (res) {
        var r = res[0], d = r.d;
        if (!r.ok) {
          if (d.code === 'early') { $('[data-early]', P).hidden = false; return; }
          if (d.code === 'closed') { perr.textContent = 'Reservations are not open yet, try again in a minute'; return; }
          throw new Error(r.status === 429 ? d.error : '');
        }
        if (!window.Stripe || !d.client_secret || !d.pk) throw new Error('');
        setStage('card'); pbox.className = 'paybox load';
        if (d.price) $$('[data-payeur],[data-payeur2]', P).forEach(function (x) { x.textContent = '€' + d.price; });
        var co = window.Stripe(d.pk).initCheckoutElementsSdk({ clientSecret: d.client_secret, adaptivePricing: { allowed: true }, elementsOptions: { appearance: LOOK } });
        return Promise.resolve(co).then(function (co) {
          return co.loadActions().then(function (a) {
            if (a.type !== 'success') throw new Error('');
            pel = co.createPaymentElement({ layout: 'tabs', wallets: { link: 'never' } });
            pbox.className = 'paybox'; pel.mount(pbox); actions = a.actions;
            // 26/11 (Nico: «fai che puoi pagare in dollari, in qualsiasi valuta»): who joins from abroad sees Stripe's
            // currency selector above the card (euro or their own money), and the monthly price on the card follows it
            // (Stripe's recurring.dueNext: for subscriptions the selector shows no amounts). In the euro area nothing changes
            try {
              var ses = a.actions.getSession(), opts = ses && ses.currencyOptions;
              if (opts && opts.length) {
                cbox = document.createElement('div'); cbox.className = 'cursel'; cbox.style.margin = '0 0 12px';
                pbox.parentNode.insertBefore(cbox, pbox); cel = co.createCurrencySelectorElement(); cel.mount(cbox);
                var month = function (s) { var v = s && s.recurring && s.recurring.dueNext && s.recurring.dueNext.total && s.recurring.dueNext.total.amount; if (!v) return; $$('[data-payeur],[data-payeur2]', P).forEach(function (x) { x.textContent = v; }); var th = $('.jthen b', P); if (th) th.textContent = v + '/month'; };
                month(ses); if (co.on) co.on('change', month);
              }
            } catch (e) { console.warn('[currency]', e); }
          });
        });
      })
      .catch(function (x) { payReset(); perr.textContent = (x && x.message) || FAIL; })
      .then(function () { opening = false; goBtn.disabled = false; goBtn.textContent = 'Join the club'; });
  });
  payBtn.addEventListener('click', function () {
    if (DEMO) { toast('Board preview: nothing is charged'); return; }
    if (!actions) return; payBtn.disabled = true; perr.textContent = '';
    Promise.resolve(actions.confirm())
      .then(function (r) { if (r && r.type === 'error') throw r.error; })
      .catch(function (x) { perr.textContent = (x && x.message) || 'The payment did not go through, try again'; })
      .then(function () { payBtn.disabled = false; });
  });
})();
