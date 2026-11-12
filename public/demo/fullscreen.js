/* /demo/fullscreen.js (12/11, Nico): on a phone turned sideways the 3D demos fill the whole screen.
   - Android (and any browser that lets a page go full screen): the first tap goes full screen and keeps the
     phone in landscape. The X leaves full screen.
   - iPhone (Safari and Chrome there): Apple gives full screen only to videos, so the bars go away the way they
     always do, with one swipe up. Board F1: "Swipe up for full screen" in the middle, gone as soon as the bars
     are gone, or after a few seconds if nobody swipes. Once the bars are gone the page stops scrolling, so the
     next swipes stay on the demo. The X goes back to the site.
   - The X: a plain round glass button, top left, past the notch. Only on a phone and only while full screen.
     Pages move whatever sits in that corner to the right with  html.ofs-on <selector> { margin-left: ... var(--ofs-x) }.
   <script defer src="/demo/fullscreen.js"></script> on pages whose content is fixed (tower, three towers);
   add data-scroll="page" on a page that scrolls by itself (the house): there the first scroll already hides the bars.
   Nothing is stored and nothing is sent. */
(function () {
  if (window.__omnyaFs) return;
  window.__omnyaFs = true;
  var ua = navigator.userAgent;
  var phone = /iPhone|Android.+Mobile/i.test(ua) || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600);
  if (!phone) return;
  if (navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return;

  var me = document.currentScript;
  var pageScrolls = !!(me && me.getAttribute('data-scroll') === 'page');
  var it = (document.documentElement.lang || '').slice(0, 2) === 'it';
  var S = it ? { hint: 'Scorri in su per lo schermo intero', close: 'Chiudi lo schermo intero' } : { hint: 'Swipe up for full screen', close: 'Close full screen' };
  var root = document.documentElement;
  var api = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen);

  var css =
    ':root{--ofs-x:calc(max(14px, env(safe-area-inset-left, 0px)) + 52px)}' +
    '.ofs-x{position:fixed;z-index:2147483001;top:max(12px, env(safe-area-inset-top, 0px));left:max(14px, env(safe-area-inset-left, 0px));width:40px;height:40px;margin:0;padding:0;border:0;border-radius:50%;display:grid;place-items:center;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
      'background:rgba(16,20,28,.38);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.5),inset 0 1px 1px rgba(255,255,255,.22),0 6px 18px rgba(0,0,0,.22);' +
      'opacity:0;visibility:hidden;transform:scale(.9);transition:opacity .35s ease,transform .35s ease,visibility 0s linear .35s}' +
    '.ofs-x::after{content:"";position:absolute;inset:-4px;border-radius:50%}' +
    '.ofs-x svg{display:block;width:16px;height:16px}' +
    '.ofs-x:active{transform:scale(.92)}' +
    'html.ofs-on .ofs-x{opacity:1;visibility:visible;transform:none;transition:opacity .35s ease,transform .35s ease}' +
    '.ofs-h{position:fixed;inset:0;z-index:2147482999;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .5s ease;' +
      'background:radial-gradient(ellipse 46% 42% at 50% 50%, rgba(0,0,0,.42), rgba(0,0,0,0) 100%)}' +
    '.ofs-h.on{opacity:1}' +
    '.ofs-h div{display:grid;justify-items:center;gap:12px;color:#fff;font:600 17px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:-.01em;text-shadow:0 1px 10px rgba(0,0,0,.5);-webkit-font-smoothing:antialiased}' +
    '.ofs-h i{position:relative;display:block;width:26px;height:42px;border:2px solid #fff;border-radius:999px}' +
    '.ofs-h i::after{content:"";position:absolute;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#fff;animation:ofsup 1.6s ease-in-out infinite}' +
    '@keyframes ofsup{0%{top:26px;opacity:0}20%{opacity:1}80%{top:6px;opacity:1}100%{top:4px;opacity:0}}' +
    // iPhone, a page whose content is fixed: a little room to scroll, so Safari can fold its bars away
    'html.ofs-ios,html.ofs-ios body{height:auto!important;overflow:visible!important;overscroll-behavior:none}' +
    'html.ofs-ios body{min-height:calc(100vh + 45vh)!important}' +
    '.ofs-p{position:fixed;left:0;top:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none}' +
    '@media (prefers-reduced-motion:reduce){.ofs-x,.ofs-h{transition:none}.ofs-h i::after{animation:none;top:6px}}';

  var X = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

  function start() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'ofs-x';
    x.setAttribute('aria-label', S.close);
    x.innerHTML = X;
    document.body.appendChild(x);
    var on = function (v) { root.classList.toggle('ofs-on', v); };
    var land = function () { return innerWidth > innerHeight; };

    if (api) {
      // Android: the first tap anywhere goes full screen (in portrait too: the phone then turns to landscape)
      var asked = false, left = false;
      var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
      document.addEventListener('click', function (e) {
        if (asked || left || fsEl() || e.target.closest('.ofs-x')) return;
        asked = true;
        var p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
        Promise.resolve(p).then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
        }).catch(function () { asked = false; });
      }, true);
      var sync = function () { on(!!fsEl()); };
      document.addEventListener('fullscreenchange', sync);
      document.addEventListener('webkitfullscreenchange', sync);
      x.addEventListener('click', function () {
        left = true;
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      });
      return;
    }

    // iPhone
    if (!pageScrolls) root.classList.add('ofs-ios');
    var probe = document.createElement('div');
    probe.className = 'ofs-p';
    document.body.appendChild(probe);
    var hint = document.createElement('div');
    hint.className = 'ofs-h';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<div><i></i>' + S.hint + '</div>';
    document.body.appendChild(hint);

    var hintDone = false, hintT = 0, hintOff = 0, locked = false;
    var stop = function (e) { e.preventDefault(); };
    var lock = function (v) {
      if (pageScrolls || v === locked) return;
      locked = v;
      if (v) document.addEventListener('touchmove', stop, { passive: false });
      else document.removeEventListener('touchmove', stop, { passive: false });
    };
    var endHint = function () {
      hintDone = true;
      clearTimeout(hintT); clearTimeout(hintOff);
      hint.classList.remove('on');
    };
    var update = function () {
      // the bars are gone when the page is as tall as the screen allows
      var full = land() && innerHeight >= probe.offsetHeight - 2;
      on(full);
      lock(full);
      if (full) { endHint(); return; }
      if (!land() || hintDone || hintT) return;
      hintT = setTimeout(function () {
        if (hintDone) return;
        hint.classList.add('on');
        hintOff = setTimeout(endHint, 6000);           // nobody swiped: it goes away on its own
      }, 900);
    };
    addEventListener('resize', update);
    addEventListener('scroll', update, { passive: true });
    addEventListener('orientationchange', function () { setTimeout(update, 400); });
    if (window.visualViewport) visualViewport.addEventListener('resize', update);
    update();
    // on iPhone the X goes back to the page of the site the demo was opened from
    x.addEventListener('click', function () {
      var same = false;
      try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
      if (same && history.length > 1) history.back();
      else location.href = it ? '/it/work/' : '/work/';
    });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
