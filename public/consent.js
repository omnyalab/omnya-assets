/* Omnya Lab: cookie banner + Meta Pixel (8/11/2026).
   The pixel loads ONLY after "Accept" (EU). The choice stays in localStorage "omnya-consent" ("yes"/"no").
   Events: PageView on every page, ViewContent on the product and funnel pages, InitiateCheckout on the
   click that opens Stripe (/go/<paid product>), Lead from the opt-in (window.omnyaTrack, see OptIn.astro).
   Purchase comes from the server (Conversions API, api/stripe-webhook.js).
   window.omnyaConsent.open() shows the banner again (privacy policy, "Cookie settings"). */
(function () {
  var PIXEL = '1793649065040225';  // Meta dataset "Omnya Lab website" (Events Manager, portfolio Omnya Lab | Renders & Films)
  if (window.omnyaConsent) return;
  var KEY = 'omnya-consent';
  var get = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var set = function (v) { try { localStorage.setItem(KEY, v); localStorage.setItem(KEY + '-at', new Date().toISOString()); } catch (e) {} };
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var VIEW = /^\/(it\/)?(the-tower-blueprint|the-tower-floors|the-full-tower|3d-to-film|the-city-blueprint|the-blueprint|casa-cresta-blueprint|learn)(\/|$)/;
  var FREE = /^\/go\/(free(-[a-z0-9]+)?|sample|community)(\/|\?|$)/;
  var on = false;

  function load() {
    if (on || !PIXEL) return;
    on = true;
    /* Meta's standard snippet */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL);
    fbq('track', 'PageView');
    if (VIEW.test(path)) fbq('track', 'ViewContent', { content_name: path, content_type: 'product' });
  }

  /* event: standard Meta event; params: object; id: event_id shared with the server (no double count) */
  window.omnyaTrack = function (event, params, id) {
    if (!on || !window.fbq) return false;
    fbq('track', event, params || {}, id ? { eventID: id } : undefined);
    return true;
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/go/"]');
    if (!a || !on) return;
    var href = a.getAttribute('href');
    if (FREE.test(href)) return;
    var id = href.replace(/^\/go\//, '').split(/[/?#]/)[0];
    fbq('track', 'InitiateCheckout', { content_ids: [id], content_type: 'product', currency: 'EUR' });
  }, true);

  /* 10/11 (Nico): a thin bar on the bottom edge (about 56 px), not a card over the page. While it shows, the page
     keeps the same space free at its end (body padding) and everything fixed to the bottom ends above it
     (the opt-in card, its loading screen, the buy bars, the WhatsApp button, the bottom sheet), so it never sits
     on a button or a price. Decline and Accept are the same button, side by side. */
  var pad = null;
  function room(d) {
    var root = document.documentElement, b = document.body;
    if (!d) {
      root.style.removeProperty('--ocb'); root.classList.remove('ocb-on');
      if (pad) { b.style.paddingBottom = pad.inline; pad = null; }
    } else {
      if (!pad) pad = { inline: b.style.paddingBottom, base: parseFloat(getComputedStyle(b).paddingBottom) || 0 };
      var h = d.offsetHeight;
      root.style.setProperty('--ocb', h + 'px'); root.classList.add('ocb-on'); b.style.paddingBottom = (pad.base + h) + 'px';
    }
    /* the opt-in card listens to this and fits itself above the bar (OptIn.astro) */
    try { window.dispatchEvent(new Event('omnya:ocb')); } catch (e) {}
    if (d) offer(d.offsetHeight);
  }

  /* The offer card (/…/sent, /the-full-tower): on a short screen the buy button of the first screen would end
     under the bar, so while the bar shows the card gets a little smaller (never under 78%) and the whole button
     stays above it. Only at the top of the page; after the choice the card keeps its size until the next page. */
  function offer(h) {
    var c = document.querySelector('.x3-deal .uc'), g = c && c.querySelector('#go');
    if (!g || (window.pageYOffset || 0) > 2) return;
    var end = window.innerHeight - h - 10;
    var ok = function (z) { c.style.zoom = z === 1 ? '' : z.toFixed(3); return g.getBoundingClientRect().bottom <= end; };
    if (ok(1)) return;
    /* the biggest size that fits: the lines wrap differently at each size, so it is looked for, not computed */
    var lo = 0.78, hi = 1;
    if (ok(lo)) for (var i = 0; i < 5; i++) { var m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    ok(lo);
  }

  function banner() {
    if (!PIXEL || document.getElementById('ocb')) return;
    var css = '#ocb{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;box-sizing:border-box;min-height:56px;display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(20,20,22,.96);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;font:11.5px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;border-top:1px solid rgba(255,255,255,.14)}'
      + '#ocb p{margin:0;min-width:0;color:rgba(255,255,255,.82);text-align:left}#ocb a{color:#fff;text-decoration:underline;text-underline-offset:2px}'
      + '#ocb .r{display:flex;gap:6px;flex:none}#ocb button{appearance:none;border:0;border-radius:999px;min-width:74px;height:38px;padding:0 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.16);color:#fff}'
      + '#ocb button:focus-visible{outline:2px solid #2997ff;outline-offset:2px}@media (min-width:700px){#ocb{gap:18px;font-size:13px}#ocb button{min-width:96px}}'
      + 'html.ocb-on .oidim,html.ocb-on .oil,html.ocb-on .sheet,html.ocb-on .mbar,html.ocb-on .ct-bar,html.ocb-on .ux.dim,html.ocb-on .ux .mbar{bottom:var(--ocb)}'
      + 'html.ocb-on .oidim{padding-bottom:12px}html.ocb-on .wa-fab{bottom:calc(var(--ocb) + 16px)}';
    if (!document.getElementById('ocb-css')) { var st = document.createElement('style'); st.id = 'ocb-css'; st.textContent = css; document.head.appendChild(st); }
    var d = document.createElement('div');
    d.id = 'ocb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookies');
    var it = /^\/it(\/|$)/.test(path);
    d.innerHTML = it
      ? '<p>Usiamo un cookie di Meta per le nostre inserzioni, solo se accetti. <a href="/it/privacy-policy#cookies">Privacy</a></p><div class="r"><button type="button" data-v="no">Rifiuta</button><button type="button" data-v="yes">Accetta</button></div>'
      : '<p>We use a Meta cookie for our ads, only if you accept. <a href="/privacy-policy#cookies">Privacy</a></p><div class="r"><button type="button" data-v="no">Decline</button><button type="button" data-v="yes">Accept</button></div>';
    var fit = function () { if (d.isConnected) room(d); };
    d.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      set(v); d.remove(); room(null);
      window.removeEventListener('resize', fit);
      if (v === 'yes') load();
    });
    document.body.appendChild(d);
    room(d);
    window.addEventListener('resize', fit);
    /* the pictures and the fonts of the page come after this script: measure again once they are in */
    if (document.readyState !== 'complete') window.addEventListener('load', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    /* choosing the other option changes the height of the offer card */
    document.addEventListener('click', function (e) { if (d.isConnected && e.target.closest && e.target.closest('.pick')) setTimeout(fit, 0); });
  }

  window.omnyaConsent = {
    get: get,
    open: function () { var o = document.getElementById('ocb'); if (o) { o.remove(); room(null); } banner(); },
  };

  /* the main site changes page without a reload (Astro ClientRouter) and the new page comes without the bar:
     it goes back in until the visitor has chosen */
  document.addEventListener('astro:after-swap', function () {
    pad = null;
    var o = document.getElementById('ocb'), v = get();
    if (o) room(o); else if (v !== 'yes' && v !== 'no') banner(); else room(null);
  });

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
  }
})();
