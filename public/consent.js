/* Omnya Lab: cookie banner + Meta Pixel (8/11/2026).
   The pixel loads ONLY after "Accept" (EU). The choice stays in localStorage "omnya-consent" ("yes"/"no").
   Events: PageView on every page, ViewContent on the product and funnel pages, InitiateCheckout on the
   click that opens Stripe (/go/<paid product>), Lead from the opt-in (window.omnyaTrack, see OptIn.astro).
   Purchase comes from the server (Conversions API, api/stripe-webhook.js).
   window.omnyaConsent.open() shows the banner again (privacy policy, "Cookie settings"). */
(function () {
  var PIXEL = window.OMNYA_PIXEL_TEST || '';  // Meta dataset ID of omnyalab.com (Events Manager)
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

  function banner() {
    if (!PIXEL || document.getElementById('ocb')) return;
    var css = '#ocb{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:12px;margin:0 auto;max-width:420px;box-sizing:border-box;padding:14px 14px 12px;border-radius:16px;background:rgba(20,20,22,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;font:13px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;box-shadow:0 12px 40px -12px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12)}'
      + '#ocb p{margin:0 0 10px;color:rgba(255,255,255,.82)}#ocb a{color:#fff;text-decoration:underline;text-underline-offset:2px}'
      + '#ocb .r{display:grid;grid-template-columns:1fr 1fr;gap:8px}#ocb button{appearance:none;border:0;border-radius:999px;padding:10px 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.14);color:#fff}'
      + '#ocb button:focus-visible{outline:2px solid #2997ff;outline-offset:2px}@media (min-width:700px){#ocb{left:20px;right:auto;bottom:20px}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div');
    d.id = 'ocb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookies');
    var it = /^\/it(\/|$)/.test(path);
    d.innerHTML = it
      ? '<p>Usiamo un cookie di Meta per misurare le inserzioni e mostrarle a chi ci conosce già. Solo se dici sì. <a href="/it/privacy-policy#cookies">Privacy</a></p><div class="r"><button type="button" data-v="no">Rifiuta</button><button type="button" data-v="yes">Accetta</button></div>'
      : '<p>We use a Meta cookie to measure our ads and show them to people who already know us. Only if you say yes. <a href="/privacy-policy#cookies">Privacy</a></p><div class="r"><button type="button" data-v="no">Reject</button><button type="button" data-v="yes">Accept</button></div>';
    d.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      set(v); d.remove();
      if (v === 'yes') load();
    });
    document.body.appendChild(d);
  }

  window.omnyaConsent = {
    get: get,
    open: function () { var o = document.getElementById('ocb'); if (o) o.remove(); banner(); },
  };

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
  }
})();
