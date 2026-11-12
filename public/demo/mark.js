/* /demo/mark.js (12/11, Nico, board A): the Omnya Lab logo, big and faint, fixed in the middle of the screen.
   The demos were screen-recorded and reposted with our corner logo cropped off: a mark in the middle can only be
   cut together with the tower or the house. It never takes a tap (pointer-events: none) and sits above the 3D
   but below the cards, the loading veil and "Turn your phone".
   <script defer src="/demo/mark.js"></script>   optional data-top="56%" to sit lower (the house). */
(function () {
  if (window.__omnyaMark) return;
  window.__omnyaMark = true;
  var me = document.currentScript;
  var top = (me && me.getAttribute('data-top')) || '50%';
  function start() {
    var st = document.createElement('style');
    st.textContent =
      '.omark{position:fixed;left:50%;top:' + top + ';z-index:2;width:clamp(180px,34vw,620px);aspect-ratio:831/175;' +
      'transform:translate(-50%,-50%);opacity:.34;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35)) drop-shadow(0 2px 14px rgba(0,0,0,.4));pointer-events:none;user-select:none;-webkit-user-select:none;' +
      'background:url(/brand/OmnyaLab_Logo_White.svg) center/contain no-repeat}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.className = 'omark';
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
