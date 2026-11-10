/* /demo/cta.js (10/11, Nico): the demos collect contacts.
   1. A discreet fixed label, "Get this for your project", that opens WhatsApp with the message already written.
   2. After 20 seconds on the demo, once per visit, a small card with the pilot offer (your building, one floor
      clickable, in 7 days, €490, fully credited if you go ahead within 30 days) and its own WhatsApp button; it closes
      with the ×, and then the label is back.
   One file for every demo (the English pages load it, the Italian ones are made from them by scripts/make-demo-it.py
   and read the words from the page language). No cookies and nothing sent anywhere: sessionStorage only remembers
   that the card was already shown in this visit. */
(function () {
  if (window.__omnyaDemoCta) return;
  window.__omnyaDemoCta = true;
  var it = (document.documentElement.lang || '').slice(0, 2) === 'it';
  var WA = 'https://wa.me/393792220465?text=';
  var S = it
    ? {
        label: 'Lo voglio per il mio progetto',
        msg: 'ciao nico, ho visto la demo e la voglio per il mio progetto',
        kick: 'Offerta pilota',
        title: 'Il tuo edificio, un piano cliccabile, in 7 giorni',
        price: '490 €',
        note: 'scalati per intero se vai avanti entro 30 giorni',
        btn: 'Scrivici su WhatsApp',
        pilot: 'ciao nico, ho visto la demo e voglio il pilota da 490 € per il mio edificio',
        close: 'Chiudi',
      }
    : {
        label: 'Get this for your project',
        msg: 'hi nico, i saw the demo and i want this for my project',
        kick: 'Pilot offer',
        title: 'Your building, one floor clickable, in 7 days',
        price: '€490',
        note: 'fully credited if you go ahead within 30 days',
        btn: 'Ask on WhatsApp',
        pilot: 'hi nico, i saw the demo and i want the €490 pilot for my building',
        close: 'Close',
      };
  var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.23 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>';
  var css =
    '.oc{position:fixed;z-index:2147483000;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));display:grid;justify-items:end;gap:10px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;pointer-events:none;max-width:calc(100vw - 28px)}' +
    '.oc *{box-sizing:border-box;margin:0}' +
    '.oc a,.oc button{pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.oc-l{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 14px 0 11px;border-radius:999px;background:rgba(12,14,16,.62);border:1px solid rgba(255,255,255,.2);color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:-.005em;line-height:1;white-space:nowrap;-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);box-shadow:0 10px 24px -12px rgba(0,0,0,.7);opacity:0;transform:translateY(6px);transition:opacity .5s ease,transform .5s ease,background .2s}' +
    '.oc-l svg{color:#25d366;flex:none}' +
    '.oc.on .oc-l{opacity:1;transform:none}' +
    '.oc.card .oc-l{display:none}' +
    '@media (hover:hover){.oc-l:hover{background:rgba(12,14,16,.82)}}' +
    '.oc-c{pointer-events:auto;position:relative;width:320px;max-width:100%;padding:16px 16px 14px;border-radius:20px;background:rgba(12,14,16,.8);border:1px solid rgba(255,255,255,.18);color:#fff;text-align:left;-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 24px 50px -20px rgba(0,0,0,.8);animation:ocin .5s cubic-bezier(.16,1,.3,1) both}' +
    '@keyframes ocin{from{opacity:0;transform:translateY(14px)}}' +
    '.oc-k{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62)}' +
    '.oc-t{margin-top:6px;padding-right:26px;font-size:19px;font-weight:650;line-height:1.18;letter-spacing:-.02em;text-wrap:balance}' +
    '.oc-p{display:flex;align-items:center;gap:10px;margin-top:10px}' +
    '.oc-p b{font-size:28px;font-weight:700;letter-spacing:-.03em;line-height:1;white-space:nowrap}' +
    '.oc-p span{font-size:12.5px;line-height:1.3;color:rgba(255,255,255,.75)}' +
    '.oc-b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin-top:14px;border-radius:999px;background:#fff;color:#0c0e10;text-decoration:none;font-size:14px;font-weight:650;line-height:1}' +
    '.oc-b svg{color:#128c4b}' +
    '.oc-x{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font:400 20px/1 -apple-system,sans-serif}' +
    // a phone held in landscape (both demos ask for it): the card is a low bar along the bottom, so it never covers the floor panel
    '@media (max-height:480px) and (min-width:560px){.oc-c{width:auto;max-width:min(640px,100%);display:grid;grid-template-columns:1fr auto auto;grid-template-areas:"t b x" "p b x";align-items:center;gap:1px 12px;padding:9px 9px 9px 16px;border-radius:18px}.oc-k{display:none}.oc-t{grid-area:t;margin:0;padding:0;font-size:14.5px;line-height:1.2}.oc-p{grid-area:p;margin:0;gap:6px}.oc-p b{font-size:13px;letter-spacing:0}.oc-p span{font-size:12px}.oc-b{grid-area:b;margin:0;min-height:38px;padding:0 14px;font-size:13px;white-space:nowrap}.oc-x{grid-area:x;position:static}}' +
    // a small phone in landscape (667 wide): narrower still, the WhatsApp button is its icon alone, so the bar stays clear of the floor panel
    '@media (max-height:480px) and (min-width:560px) and (max-width:760px){.oc-c{max-width:380px}.oc-b{width:40px;min-height:40px;padding:0}.oc-b span{display:none}.oc-b svg{width:20px;height:20px}}' +
    '@media (prefers-reduced-motion:reduce){.oc-l{transition:none}.oc-c{animation:none}}';
  var start = function () {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var box = document.createElement('div');
    box.className = 'oc';
    box.innerHTML = '<a class="oc-l" href="' + WA + encodeURIComponent(S.msg) + '" target="_blank" rel="noopener">' + ICON + '<span>' + S.label + '</span></a>';
    document.body.appendChild(box);
    // a tap on the label or the card is not a tap on the demo under it
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'wheel'].forEach(function (ev) {
      box.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });
    setTimeout(function () { box.classList.add('on'); }, 1200);
    var KEY = 'omnya-demo-pilot';
    var seen = false;
    try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
    if (seen) return;
    setTimeout(function () {
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      var c = document.createElement('div');
      c.className = 'oc-c';
      c.setAttribute('role', 'dialog');
      c.setAttribute('aria-label', S.kick);
      c.innerHTML =
        '<button type="button" class="oc-x" aria-label="' + S.close + '">×</button>' +
        '<p class="oc-k">' + S.kick + '</p><p class="oc-t">' + S.title + '</p>' +
        '<p class="oc-p"><b>' + S.price + '</b><span>' + S.note + '</span></p>' +
        '<a class="oc-b" href="' + WA + encodeURIComponent(S.pilot) + '" target="_blank" rel="noopener" aria-label="' + S.btn + '">' + ICON + '<span>' + S.btn + '</span></a>';
      box.insertBefore(c, box.firstChild);
      box.classList.add('card');
      c.querySelector('.oc-x').addEventListener('click', function () { c.remove(); box.classList.remove('card'); });
    }, 20000);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
