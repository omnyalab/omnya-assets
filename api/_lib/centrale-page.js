// The small script that sits at the top of the mirrored page (api/centrale.js puts it in the <head>, before the app's
// own app.js, as text: this function is never called on the server). The app's page is the one of Nico's Mac,
// untouched: it calls /api/oggi, /api/lead, /api/versione… as it does at home. Here those calls never reach the site:
//   GET   answered from the last pack the Mac pushed, kept in memory. The function is asked only "anything new?"
//         (one Redis read), at most every C.ogni ms and only while the page is visible, and the blocks that changed
//         are fetched then
//   POST  handed to the function as a command for the Mac; the answer of the Mac is waited for a few seconds and given
//         back to the page as if it were the real one. Mac off: a plain sentence, and the command stays in line
// It also draws the one honest line under the bar when the Mac is off, and reloads the page when the Mac pushed a new one.
// Written in old plain JavaScript on purpose (it runs on whatever phone opens the page) and with no backticks.
export function shim(C) {
  var vero = window.fetch.bind(window);
  var B = C.base;
  var FOTO = ['oggi', 'bot', 'app']; // the tabs with money in them travel together, inside "fotografia"
  var SCHEDE = ['oggi', 'bot', 'app', 'lead', 'stato', 'arrivo', 'social'];
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var dati = {}, impronte = {}, st = null;
  var pronto = null, inCorso = null, fuori = false;
  var ultimoControllo = 0, ultimaScheda = 'oggi', ultimoGuarda = 0;
  var aggiornaId = '', aggiornaDa = 0;

  function risposta(corpo, codice) {
    // the app reads 403 as "the phone lost its key": a refusal of the Mac is never that here
    return new Response(JSON.stringify(corpo), { status: codice === 403 ? 400 : codice || 200, headers: { 'Content-Type': 'application/json' } });
  }

  /** The pictures the Mac serves from its own root (/copertina/…, /zecca.png) live under the mirror's address here. */
  function sistema(o) {
    if (typeof o === 'string') {
      if (o.charAt(0) !== '/') return o;
      var nudo = o.slice(1).split('?')[0];
      return o.indexOf('/copertina/') === 0 || C.file.indexOf(nudo) >= 0 ? B + o : o;
    }
    if (o && typeof o === 'object') {
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = sistema(o[k]);
    }
    return o;
  }

  function chiusa() {
    if (fuori) return;
    fuori = true;
    var fai = function () {
      document.body.innerHTML = '<div style="padding:48px 24px;font:17px/1.45 -apple-system,system-ui,sans-serif;color:#1d1d1f">' +
        '<h1 style="font-size:30px;letter-spacing:-0.03em;margin:0 0 12px">Questa chiave non vale più</h1>' +
        '<p style="color:#62626a;margin:0">Fatti dare il link nuovo dal Mac e aprilo da qui</p></div>';
    };
    if (document.body) fai(); else document.addEventListener('DOMContentLoaded', fai);
  }

  /** One call to the function. 404 = the key is not good any more (changed on the Mac, or the mirror was switched off). */
  function chiedi(percorso, opzioni) {
    return vero(B + '/' + percorso, opzioni || { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (r.status === 404) { chiusa(); throw new Error('chiave'); }
      return r.json().then(function (j) { return { ok: r.ok, codice: r.status, j: j || {} }; });
    });
  }

  function occupato() {
    var a = document.activeElement, velo = document.getElementById('velo');
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || '')) || !!(velo && !velo.hidden);
  }

  function soldi(somme) {
    var pezzi = [];
    for (var c in somme) if (Object.prototype.hasOwnProperty.call(somme, c)) {
      var n = (somme[c] / 100).toFixed(2).replace('.', ',');
      pezzi.push('+' + n + (c === 'eur' ? ' €' : ' ' + c.toUpperCase()));
    }
    return pezzi.join(' e ');
  }

  function frase(s) {
    var d = new Date(s.battito), o = new Date(s.adesso);
    var ora = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var giorni = Math.round((new Date(o.getFullYear(), o.getMonth(), o.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    var da = giorni <= 0 ? 'dalle ' + ora : giorni === 1 ? 'da ieri alle ' + ora : 'dal ' + d.getDate() + ' ' + MESI[d.getMonth()] + ' alle ' + ora;
    var t = 'Mac spento ' + da + ', cifre ferme a quell\'ora';
    if (s.dopo && s.dopo.n) t += ' · dopo ' + (s.dopo.n === 1 ? 'è arrivato 1 pagamento' : 'sono arrivati ' + s.dopo.n + ' pagamenti') + ', ' + soldi(s.dopo.somme);
    return t;
  }

  /** The line under the bar: there only while the Mac is off. */
  function riga() {
    if (!document.body) return;
    var x = document.getElementById('specchio-riga');
    if (!st || !st.spento) { if (x) x.hidden = true; return; }
    var barra = document.querySelector('.barra');
    if (!x) {
      x = document.createElement('div');
      x.id = 'specchio-riga';
      x.setAttribute('role', 'status');
      x.style.cssText = 'position:sticky;z-index:19;padding:8px 20px;text-align:center;font-weight:500;font-size:0.875rem;line-height:1.3;background:var(--giallo-tenue,#fdf3d7);color:var(--giallo,#8a5a00)';
      if (barra && barra.parentNode) barra.parentNode.insertBefore(x, barra.nextSibling); else document.body.insertBefore(x, document.body.firstChild);
    }
    x.style.top = (barra ? barra.offsetHeight : 0) + 'px';
    x.textContent = frase(st);
    x.hidden = false;
  }

  function vistoStato(s) {
    st = s;
    riga();
    // the Mac pushed a new page (the app was updated): take it, once, and never while Nico is writing
    if (s.pagina && s.pagina !== C.pagina && !occupato()) {
      var gia = '';
      try { gia = sessionStorage.getItem('specchio-pagina') || ''; } catch (e) { gia = s.pagina; }
      if (gia !== s.pagina) {
        try { sessionStorage.setItem('specchio-pagina', s.pagina); } catch (e) { return; }
        location.reload();
      }
    }
  }

  /** Blocks and state in one answer (one Redis read on the other side). */
  function prendi(nomi) {
    return chiedi('dati?s=' + nomi.join(',')).then(function (r) {
      if (!r.ok) throw new Error('dati');
      ultimoControllo = Date.now(); // this answer carries the state too: no need to ask again for a while
      var h = (r.j.stato && r.j.stato.h) || {};
      var avuti = r.j.dati || {};
      for (var i = 0; i < nomi.length; i++) {
        var n = nomi[i];
        if (avuti[n] !== null && avuti[n] !== undefined) dati[n] = sistema(avuti[n]);
        impronte[n] = h[n]; // also for a block that is not there: it is not asked again until it changes
      }
      vistoStato(r.j.stato || {});
    });
  }

  function prima() {
    if (!pronto) pronto = prendi(C.blocchi).then(null, function (e) { pronto = null; throw e; });
    return pronto;
  }

  function bloccoDi(scheda) { return FOTO.indexOf(scheda) >= 0 ? 'fotografia' : scheda; }

  /** The tab Nico is looking at changed on the Mac: the page takes it again now, as when he comes back to the app. */
  function dopoCambio(cambiati) {
    if (cambiati.indexOf(bloccoDi(ultimaScheda)) < 0 || occupato() || document.hidden) return;
    try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) { /* an old phone: the page asks again by itself within a minute */ }
  }

  function controlla(forza) {
    if (fuori) return Promise.resolve();
    if (inCorso) return inCorso;
    if (!forza && Date.now() - ultimoControllo < C.ogni) return Promise.resolve();
    ultimoControllo = Date.now();
    inCorso = chiedi('stato').then(function (r) {
      if (!r.ok) return null;
      var cambiati = Object.keys(r.j.h || {}).filter(function (n) { return r.j.h[n] !== impronte[n]; });
      if (!cambiati.length) { vistoStato(r.j); return null; }
      return prendi(cambiati).then(function () { return cambiati; });
    }).then(function (cambiati) {
      inCorso = null;
      if (cambiati) dopoCambio(cambiati);
      // while the page stays open the Mac is told every few minutes that somebody is looking
      if (!document.hidden && Date.now() - ultimoGuarda > 150000) guardami(ultimaScheda, false);
    }).then(null, function () { inCorso = null; }); // a check that fails changes nothing: the numbers of before stay
    return inCorso;
  }

  function manda(percorso, d) {
    return chiedi('comando', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Centrale': '1' },
      body: JSON.stringify({ percorso: percorso, dati: d }),
    });
  }

  /** "Somebody is looking at this tab": the Mac re-reads what that tab re-reads at home, and pushes at once for a while. */
  function guardami(scheda, forza) {
    var ora = Date.now();
    if (fuori || !st || st.spento || document.hidden || ora - ultimoGuarda < (forza ? 5000 : 120000)) return;
    ultimoGuarda = ora;
    manda('/specchio/guarda', { scheda: scheda, forza: !!forza }).then(function (r) {
      if (!r.ok) return;
      setTimeout(function () { controlla(true); }, 4000);
      setTimeout(function () { controlla(true); }, 11000);
    }, function () {});
  }

  function aspetta(id, ms) {
    var fine = Date.now() + ms, giri = 0;
    return new Promise(function (ok) {
      (function giro() {
        setTimeout(function () {
          chiedi('esito?id=' + id).then(function (r) {
            if (r.ok && r.j.esito) return ok(r.j.esito);
            if (Date.now() > fine) return ok(null);
            giro();
          }, function () { if (fuori || Date.now() > fine) ok(null); else giro(); });
        }, giri++ < 5 ? 450 : 900);
      })();
    });
  }

  function comando(percorso, corpo) {
    var d;
    try { d = JSON.parse(corpo || '{}'); } catch (e) { d = {}; }
    return manda(percorso, d).then(function (r) {
      if (!r.ok) return risposta({ errore: r.j.errore || 'Qualcosa non ha funzionato' }, r.codice);
      if (!r.j.mac) return risposta({ errore: 'In coda: lo fa il Mac appena si riaccende' }, 503);
      return aspetta(r.j.id, r.j.coda ? 12000 : 30000).then(function (e) {
        if (!e) return risposta({ errore: r.j.coda ? 'Il Mac non risponde: resta in coda, lo fa appena torna' : 'Il Mac non ha risposto, riprova tra un attimo' }, 503);
        if (percorso === '/api/aggiorna' && e.codice === 200) { aggiornaId = r.j.id; aggiornaDa = Date.now(); }
        setTimeout(function () { controlla(true); }, 1500); // the fresh pack comes right behind the answer
        return risposta(sistema(e.corpo), e.codice);
      });
    }, function (err) {
      return risposta({ errore: err && err.message === 'chiave' ? 'Questa chiave non vale più' : 'Il telefono è senza rete, riprova tra un attimo' }, 503);
    });
  }

  /** "Aggiorna tutto": the page asks how far the Mac is every 0.7 s. It is "still going" until the Mac pushed the pack it re-read. */
  function statoAggiorna() {
    var a = dati.aggiorna || { in_corso: false, manca: [], detto: '' };
    if (!aggiornaId) return Promise.resolve(risposta(a));
    if (a._dopo === aggiornaId || Date.now() - aggiornaDa > 150000) { aggiornaId = ''; return Promise.resolve(risposta(a)); }
    var p = Date.now() - ultimoControllo > 2500 ? controlla(true) : Promise.resolve();
    return p.then(function () {
      var b = dati.aggiorna || a;
      if (b._dopo === aggiornaId) { aggiornaId = ''; return risposta(b); }
      return risposta({ in_corso: true, manca: [], detto: '' });
    });
  }

  function leggi(percorso, domanda) {
    var nome = percorso.slice(5);
    if (nome === 'ping') return Promise.resolve(risposta({ ok: true, app: 'centrale-omnya', specchio: true }));
    return prima().then(function () {
      if (nome === 'versione') {
        return controlla(false).then(function () {
          var f = dati.fotografia || {};
          return risposta({ v: f.versione || 0, letta: f.soldi_letti || '' });
        });
      }
      if (nome === 'aggiorna') return statoAggiorna();
      if (SCHEDE.indexOf(nome) >= 0) { ultimaScheda = nome; guardami(nome, domanda.indexOf('aggiorna=1') >= 0); }
      var blocco = dati[bloccoDi(nome)];
      if (blocco && blocco._errore) return risposta({ errore: blocco._errore[1] }, blocco._errore[0]);
      var d = FOTO.indexOf(nome) >= 0 ? blocco && blocco.schede && blocco.schede[nome] : blocco;
      if (d === undefined || d === null) return risposta({ errore: SCHEDE.indexOf(nome) >= 0 || nome === 'fotografia' ? 'Lo specchio non ha ancora questa scheda: serve il Mac acceso' : 'Non c\'è' }, SCHEDE.indexOf(nome) >= 0 || nome === 'fotografia' ? 503 : 404);
      return risposta(d);
    }, function () {
      return risposta({ errore: fuori ? 'Questa chiave non vale più' : 'Il telefono è senza rete, riprova tra un attimo' }, 503);
    });
  }

  window.fetch = function (input, init) {
    var indirizzo = typeof input === 'string' ? input : (input && input.url) || '';
    var u;
    try { u = new URL(indirizzo, location.href); } catch (e) { return vero(input, init); }
    if (u.origin !== location.origin || u.pathname.indexOf('/api/') !== 0) return vero(input, init);
    if (init && String(init.method || 'GET').toUpperCase() === 'POST') return comando(u.pathname, init.body);
    return leggi(u.pathname, u.search || '');
  };

  prima().then(null, function () {});
  document.addEventListener('DOMContentLoaded', riga);
  window.addEventListener('resize', riga);
}
