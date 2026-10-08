# Preloader del sito attuale (Squarespace), da rifare nel nuovo stile

Comportamento da mantenere: una volta per visita, minimo 1100ms, massimo 3000ms, barra finta fino all'85% poi chiusura sul load vero, la hero aspetta la fine.

```html
<div class="om-preload" id="omPreload">
  <div class="om-preload__grain"></div>
  <div class="om-preload__logo">
    <img class="om-preload__mark" src="(vecchio simbolo, NON usare)" alt="">
    <img class="om-preload__word" src="(vecchio logo, sostituire con public/brand/OmnyaLab_Logo_Black.svg)" alt="Omnya Lab">
  </div>
  <div class="om-preload__bar"><span id="omPreBar"></span></div>
</div>
```

```css
.om-preload{position:fixed;inset:0;z-index:99999;background:#0f0c08;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;opacity:1;transition:opacity .8s cubic-bezier(.16,1,.3,1)}
.om-preload.is-done{opacity:0;pointer-events:none}
.om-preload.is-gone{display:none}
.om-preload__grain{position:absolute;inset:0;pointer-events:none;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:128px 128px}
.om-preload__logo{display:flex;align-items:flex-start;gap:8px;position:relative}
.om-preload__mark{height:52px;animation:omPreSpin 1.6s cubic-bezier(.65,0,.35,1) infinite}
.om-preload__word{height:52px;opacity:0;transform:translateX(-14px);animation:omPreWord 1s cubic-bezier(.16,1,.3,1) .35s forwards}
.om-preload__bar{position:relative;width:140px;height:1px;background:rgba(255,255,255,.14);overflow:hidden}
.om-preload__bar span{position:absolute;top:0;left:0;bottom:0;width:0%;background:#d4a060;transition:width .35s ease-out}
@keyframes omPreSpin{to{transform:rotate(360deg)}}
@keyframes omPreWord{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:768px){.om-preload__mark,.om-preload__word{height:42px}.om-preload__bar{width:120px}}
@media(max-width:480px){.om-preload__mark,.om-preload__word{height:36px}}
```

```js
(function(){
  var pre=document.getElementById('omPreload'); if(!pre) return;
  var seen=false; try{ seen=sessionStorage.getItem('omSeenIntro')==='1'; }catch(e){}
  if(seen){ pre.classList.add('is-done','is-gone'); return; }
  var bar=document.getElementById('omPreBar'), html=document.documentElement;
  var started=Date.now(), MIN=1100, MAX=3000, closed=false;
  html.classList.add('om-preload-active');
  var prev=document.body.style.overflow; document.body.style.overflow='hidden';
  var pct=0, tick=setInterval(function(){ pct+=Math.random()*11+4; if(pct>85) pct=85; if(bar) bar.style.width=pct+'%'; },170);
  function close(){
    if(closed) return; closed=true; clearInterval(tick);
    if(bar) bar.style.width='100%';
    var wait=Math.max(0,MIN-(Date.now()-started));
    setTimeout(function(){
      pre.classList.add('is-done'); html.classList.remove('om-preload-active');
      document.body.style.overflow=prev||'';
      try{ sessionStorage.setItem('omSeenIntro','1'); }catch(e){}
      setTimeout(function(){ pre.classList.add('is-gone'); },900);
    },wait+220);
  }
  if(document.readyState==='complete') close(); else window.addEventListener('load',close);
  setTimeout(close,MAX);
})();
```

Nel nuovo sito: fondo #EDEAE4 invece di #0f0c08, niente simbolo che ruota, logo nuovo in due toni, linea #111111 su base #D6D1C8, uscita a sipario verso l'alto invece della dissolvenza.
