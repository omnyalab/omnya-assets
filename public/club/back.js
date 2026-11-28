/* 28/11 (Nico: «su club terms e altre pagine, se sono nell'app non posso più uscire»): in the club's Home Screen app there is no
   back button, so every other page of the site gets a round X top right that goes back to the club. Only in the app (or ?from=club). */
(function () {
  if (window.__clubBack) return; window.__clubBack = true;
  var app = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (!app && !/[?&]from=club\b/.test(location.search)) return;
  if (/^\/the-3d-future\/inside/.test(location.pathname)) return;
  function back() { if (history.length > 1) { history.back(); setTimeout(function () { location.href = '/the-3d-future/inside'; }, 500); } else location.href = '/the-3d-future/inside'; }
  function add() {
    var st = document.createElement('style');
    st.textContent = '.club-back{position:fixed;z-index:2147483646;top:calc(env(safe-area-inset-top, 0px) + 12px);right:max(14px, env(safe-area-inset-right, 0px));width:44px;height:44px;margin:0;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:50%;display:grid;place-items:center;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;background:#16224a;box-shadow:0 6px 18px rgba(0,0,0,.3)}.club-back svg{width:18px;height:18px}.club-back:active{transform:scale(.92)}';
    document.head.appendChild(st);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'club-back'; b.setAttribute('aria-label', 'Back to the club');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
    b.addEventListener('click', function (e) { e.preventDefault(); back(); });
    document.body.appendChild(b);
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
