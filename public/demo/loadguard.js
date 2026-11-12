/* /demo/loadguard.js (12/11, Nico: "the loading gets stuck at 99%, I want a real 0 to 100, and if it breaks it
   says to reload"). Loaded in the <head> of the three demos, before their own script.
   - OmnyaLoad.ready(video): resolves when a video can really show its first frame. iPhone Safari often never
     sends "loadeddata" for a video that is not playing (that was the 99% of the three towers): there the video
     is played muted for an instant and paused, which makes it decode.
   - OmnyaLoad.watch(): from then on, if the number does not move for 25 seconds, or a page calls
     OmnyaLoad.fail(), the number goes and a card says the 3D did not load, with a button that reloads the page.
   - OmnyaLoad.done(): the page calls it once the number is at 100 and the demo is on screen.
   Nothing is stored and nothing is sent. */
(function () {
  if (window.OmnyaLoad) return;
  var it = (document.documentElement.lang || '').slice(0, 2) === 'it';
  var S = it
    ? { t: 'Il 3D non si è caricato', p: 'La connessione si è fermata a metà. Ricarica la pagina e riparte da capo.', b: 'Ricarica la pagina' }
    : { t: 'The 3D didn’t load', p: 'The connection stopped halfway. Reload the page and it starts again.', b: 'Reload the page' };
  var STALL = 25000;
  var finished = false, failed = false, last = '', since = Date.now(), timer = 0;

  function card() {
    if (failed || finished) return;
    failed = true;
    clearInterval(timer);
    var st = document.createElement('style');
    st.textContent =
      '.olg{position:fixed;inset:0;z-index:2147483002;display:grid;place-items:center;padding:20px;background:rgba(8,10,14,.5);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;animation:olgin .4s ease both}' +
      '@keyframes olgin{from{opacity:0}}' +
      '.olg div{width:min(360px,100%);padding:24px 22px 20px;border-radius:26px;color:#fff;text-align:center;background:rgba(18,24,32,.55);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.45),inset 0 1px 1px rgba(255,255,255,.3),0 18px 44px -18px rgba(0,0,0,.55)}' +
      '.olg b{display:block;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;text-wrap:balance}' +
      '.olg p{margin:10px 0 0;font-size:15px;line-height:1.4;color:rgba(255,255,255,.82);text-wrap:pretty}' +
      '.olg button{margin-top:18px;width:100%;min-height:46px;border:0;border-radius:999px;background:#0a84ff;color:#fff;font-family:inherit;font-size:16px;font-weight:600;line-height:1;letter-spacing:-.01em;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.olg button:active{transform:scale(.97)}';
    document.head.appendChild(st);
    var l = document.getElementById('loader');
    if (l) l.style.display = 'none';
    var box = document.createElement('div');
    box.className = 'olg';
    box.setAttribute('role', 'alertdialog');
    box.innerHTML = '<div><b>' + S.t + '</b><p>' + S.p + '</p><button type="button">' + S.b + '</button></div>';
    box.querySelector('button').addEventListener('click', function () { location.reload(); });
    document.body.appendChild(box);
  }

  window.OmnyaLoad = {
    watch: function () {
      clearInterval(timer);
      since = Date.now();
      timer = setInterval(function () {
        if (finished) return clearInterval(timer);
        var p = document.getElementById('pct');
        var now = p ? p.textContent : '';
        if (now !== last) { last = now; since = Date.now(); return; }
        if (Date.now() - since > STALL) card();
      }, 1000);
    },
    done: function () { finished = true; clearInterval(timer); },
    fail: card,
    ready: function (v) {
      return new Promise(function (res) {
        var ok = false;
        var go = function () { if (ok) return; ok = true; res(); };
        if (v.readyState >= 2) return go();
        ['loadeddata', 'canplay', 'playing'].forEach(function (e) { v.addEventListener(e, go, { once: true }); });
        // iPhone: only the metadata comes unless the video plays; a muted instant of play makes it decode
        var nudge = function () {
          if (ok) return;
          v.muted = true;
          var p = v.play();
          if (p && p.then) p.then(function () { v.pause(); try { v.currentTime = 0; } catch (e) {} go(); }).catch(function () {});
        };
        v.addEventListener('loadedmetadata', function () { setTimeout(nudge, 300); }, { once: true });
        setTimeout(nudge, 4000);
        v.addEventListener('error', function () { card(); }, { once: true });
      });
    },
  };
})();
