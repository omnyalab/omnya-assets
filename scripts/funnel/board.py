# The official board of a funnel (20/11/2026, Nico: "before publishing it sends me the official board of how the funnel
# comes out, and asks: is it fine like this, what would you change?"). Screenshots of the real pages from the dev server
# (phone and computer), the Instant DM texts, the Stripe products, what each buyer receives and the checks, each with a
# code (A1, B2…) so Nico answers with codes. Writes <out>/index.html + images; Claude publishes it as an Artifact.
import html
import json
import os
import subprocess
import time

from PIL import Image

from .test import files_for

PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
PC = dict(viewport={'width': 1280, 'height': 860}, device_scale_factor=1)
SCROLL = "(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)) } scrollTo(0, 0) })()"


def jpg(src, dst, width):
    im = Image.open(src).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=74, optimize=True, progressive=True)
    os.remove(src)
    return os.path.basename(dst)


def long_shot(pg, path):
    """The whole page as a person sees it scrolling: one screen at a time, stitched (the full-page capture of Chrome
    leaves the glass and blurred cards black). Bars fixed to the screen show only in the first screen."""
    pg.evaluate("scrollTo(0, 0)")
    vh = pg.evaluate("innerHeight")
    total = pg.evaluate("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
    tiles, y = [], 0
    while y < total:
        pg.evaluate(f"scrollTo(0, {y})")
        pg.wait_for_timeout(450)
        real = pg.evaluate("scrollY")
        t = path + f'.{len(tiles)}.png'
        pg.screenshot(path=t)
        tiles.append((t, real))
        if not len(tiles) - 1:
            pg.evaluate("for (const e of document.querySelectorAll('body *')) { const p = getComputedStyle(e).position; if ((p === 'fixed' || p === 'sticky') && e.getBoundingClientRect().height < innerHeight * 0.5) e.style.visibility = 'hidden' }")
        if real + vh >= total:
            break
        y += vh
    ims = [(Image.open(t), r) for t, r in tiles]
    k = ims[0][0].width / pg.evaluate("innerWidth")
    out = Image.new('RGB', (ims[0][0].width, round((ims[-1][1] + vh) * k)))
    for im, r in ims:
        out.paste(im, (0, round(r * k)))
    out.save(path)
    for t, _ in tiles:
        os.remove(t)


def no_cookies(pg):
    try:
        b = pg.get_by_role('button', name='Decline')
        if b.count() and b.first.is_visible():
            b.first.click()
            pg.wait_for_timeout(300)
    except Exception:
        pass


LIVE = 'https://www.omnyalab.com'


def real_checkout(route):
    """The board shows the REAL Stripe card (number, expiry, security code, name), never the empty box of a preview
    without Stripe (20/11, Nico). The local page asks the live /api/embed-checkout for a session (a session is not a
    payment, it expires by itself); a product that is not online yet borrows the session of the Full Build, which draws
    the very same card fields (the price on our Pay button is the page's own)."""
    body = route.request.post_data or '{}'
    resp = route.fetch(url=LIVE + '/api/embed-checkout')
    if resp.status == 400:
        d = json.loads(body)
        d['p'] = 'full-build'
        resp = route.fetch(url=LIVE + '/api/embed-checkout', post_data=json.dumps(d))
    route.fulfill(response=resp)


def card_ok(pg, where):
    """The outside check: the Stripe card frame is there and tall enough to show its fields (after a tap on another
    choice the card is mounted again: wait for the new one)."""
    h = 0
    for _ in range(60):
        h = pg.evaluate("document.querySelector('.right.live') ? Math.max(0, ...[...document.querySelectorAll('[data-ec] iframe')].map(f => f.getBoundingClientRect().height)) : 0")
        if h >= 120:
            pg.wait_for_timeout(800)
            return h
        pg.wait_for_timeout(500)
    raise RuntimeError(f'{where}: la carta Stripe non si è caricata (alta {h:.0f}px), la board non si fa così')


def shots(c, url, out, repo):
    from playwright.sync_api import sync_playwright
    X, slug = c['id'], c['slug']
    prods = c.get('products') or {}
    files = files_for(repo, [prods['kit']['stripe_name']]) if prods.get('kit') else files_for(repo, [prods['full']['stripe_name']])
    got = {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome')
        for dev, size, w in (('telefono', PHONE, 640), ('computer', PC, 1200)):
            ctx = b.new_context(**size)
            pg = ctx.new_page()
            pg.route('**/api/optin', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true,"mail":false}'))
            pg.route('**/api/embed-checkout', real_checkout)
            pg.route('**/api/files?**', lambda r: r.fulfill(status=200, content_type='application/json',
                                                            body=json.dumps({'files': files, 'pack': False, 'paid': 1499, 'skill': False, 'email': f'check+{X}@omnyalab.com'})))
            pg.goto(f'{url}/{slug}', wait_until='load')
            pg.wait_for_selector('[data-optin] form')
            time.sleep(2.5)
            no_cookies(pg)
            p = f'{out}/_a.png'; pg.screenshot(path=p); got[f'optin-{dev}'] = jpg(p, f'{out}/a-optin-{dev}.jpg', w)
            pg.fill('[data-optin] form input[name=name]', 'Nico')
            pg.fill('[data-optin] form input[name=email]', f'check+{X}@omnyalab.com')
            with pg.expect_navigation(url=lambda u: '/watch' in u, timeout=25000):
                pg.click('[data-optin] form .x3-btn')
            pg.wait_for_load_state('load')
            time.sleep(1.5)
            p = f'{out}/_b.png'; pg.screenshot(path=p); got[f'watch-top-{dev}'] = jpg(p, f'{out}/b-video-{dev}.jpg', w)
            pg.evaluate("document.body.classList.add('rv')")        # the prices as after the video says them
            no_cookies(pg)
            got[f'card-{dev}'] = card_ok(pg, f'pagina video {dev}')
            p = f'{out}/_b2.png'; long_shot(pg, p); got[f'watch-full-{dev}'] = jpg(p, f'{out}/b-video-intera-{dev}.jpg', w)
            pg.evaluate("for (const e of document.querySelectorAll('body *')) e.style.visibility = ''")
            if c.get('kit'):
                pg.click('.right .opt-sk'); time.sleep(0.8)
                card_ok(pg, f'kit {dev}')
                pg.locator('#offer').scroll_into_view_if_needed(); time.sleep(0.6)
                p = f'{out}/_c.png'; pg.locator('#offer').screenshot(path=p); got[f'kit-{dev}'] = jpg(p, f'{out}/c-kit-{dev}.jpg', w)
                pg.click('.right .opt-fu'); time.sleep(0.8)
                card_ok(pg, f'Full {dev}')
            p = f'{out}/_c2.png'; pg.locator('#offer').screenshot(path=p); got[f'full-{dev}'] = jpg(p, f'{out}/c-full-{dev}.jpg', w)
            pg.goto(f"{url}/learn/thanks/full-{X}?session_id=cs_test_board{X}abcdefgh", wait_until='load')
            time.sleep(2); no_cookies(pg); pg.evaluate(SCROLL); time.sleep(1.5)
            p = f'{out}/_d.png'; long_shot(pg, p); got[f'thanks-{dev}'] = jpg(p, f'{out}/d-grazie-{dev}.jpg', w)
            ctx.close()
        b.close()
    return got, files


CSS = """
:root{--bg:#f4f5f7;--card:#ffffff;--fg:#14161a;--mute:#5d6470;--line:#e1e4ea;--accent:ACCENT;--ok:#1f9d55;--no:#d33a2c;
--display:'Space Grotesk',system-ui,sans-serif;--text:'Inter',system-ui,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1013;--card:#16191e;--fg:#eef1f5;--mute:#9aa3b1;--line:#262b33;--ok:#3ccf7b;--no:#ff6b5e;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0e1013;--card:#16191e;--fg:#eef1f5;--mute:#9aa3b1;--line:#262b33;--ok:#3ccf7b;--no:#ff6b5e;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.55 var(--text);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1180px;margin:0 auto;padding-block:28px 64px;display:grid;gap:28px}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0}
h1{font-size:clamp(28px,4vw,42px);line-height:1.08}
h2{font-size:22px;display:flex;gap:10px;align-items:baseline}
h2 b{font:700 13px/1 var(--text);letter-spacing:.08em;color:#fff;background:var(--accent);padding:6px 9px;border-radius:7px}
.lead{color:var(--mute);max-width:70ch;margin:8px 0 0}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.facts span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 12px;font-size:13px}
.facts code{font-size:12.5px}
section{display:grid;gap:14px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:start}
.row.wide{grid-template-columns:minmax(0,1fr) minmax(0,2.2fr)}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px;display:grid;gap:8px;min-width:0}
figure img{display:block;width:100%;border-radius:8px;background:#000}
figure.tall img{max-height:1400px;object-fit:cover;object-position:top}
figcaption{font-size:13px;color:var(--mute)}
figcaption b{color:var(--fg);font-weight:700;margin-right:6px}
details summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.tbl{overflow-x:auto}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.n{font-variant-numeric:tabular-nums;white-space:nowrap}
.pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:600}
.pill.ok{color:var(--ok);border:1px solid var(--ok)}.pill.no{color:var(--no);border:1px solid var(--no)}
.chat{display:grid;gap:10px;max-width:520px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px}
.msg{padding:10px 14px;border-radius:16px;background:var(--bg);white-space:pre-wrap;font-size:14px;max-width:88%}
.msg.me{justify-self:end;background:var(--accent);color:#fff}
.msg small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin-bottom:3px}
.btn{justify-self:start;border:1px solid var(--line);border-radius:10px;padding:8px 14px;font-weight:600;font-size:14px}
.ask{background:var(--card);border:2px solid var(--accent);border-radius:16px;padding:20px;display:grid;gap:8px}
.ask h2{font-size:24px}
ul.checks{margin:0;padding-left:18px;display:grid;gap:4px}
"""


def page(c, got, files, checks, extra=''):
    e = html.escape
    acc = c['colors']['optin']['main']
    prods = c.get('products') or {}
    dm = c.get('dm') or {}

    def fig(code, key, cap, tall=False):
        if key not in got:
            return ''
        return f'<figure class="{"tall" if tall else ""}"><img src="{got[key]}" alt="{e(cap)}" loading="lazy"><figcaption><b>{code}</b>{e(cap)}</figcaption></figure>'

    def state(p):
        if p.get('link'):
            return '<span class="pill ok">creato</span> <code>' + e(p['link'].replace('https://', '')) + '</code>'
        return '<span class="pill no">da creare</span>'
    rows = ''.join(f"<tr><td><b>{k}</b></td><td>{e(p['stripe_name'])}</td><td class=n>{p['eur'].replace('.', ',')} €</td><td>{state(p)}</td></tr>"
                   for k, p in prods.items())
    reps = ''.join(f'<div class="msg"><small>risposta al commento</small>{e(r.strip())}</div>' for r in (dm.get('risposte') or '').split('|') if r.strip())
    chat = (f'<div class="chat"><div class="msg me"><small>commento</small>{e(c["word"])}</div>{reps}'
            f'<div class="msg"><small>DM di benvenuto</small>{e(dm.get("benvenuto", ""))}</div><div class="btn">{e(dm.get("bottone", ""))}</div>'
            f'<div class="msg"><small>DM col link</small>{e(dm.get("messaggio", ""))}</div></div>'
            f'<p class="lead">Trigger: {e(dm.get("trigger", "All comments"))} · ritardo {e(dm.get("ritardo", "10 sec"))} · {e(dm.get("dove", ""))}</p>') if dm else '<p class="lead">Testi di Instant DM non ancora scritti nel file del funnel.</p>'
    fl = ''.join(f'<li>{e(f["name"])}{" (zip)" if f.get("kind") else " (PDF)"}</li>' for f in files)
    ck = ''.join(f'<li>{e(x)}</li>' for x in checks)
    links = ' · '.join(f'omnyalab.com{k}' for k in (c.get('links') or {}))
    return f"""<title>Board {e(c['name'])} funnel</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap">
<style>{CSS.replace('ACCENT', acc)}</style>
<div class="wrap">
<header>
<h1>Funnel {e(c['name'])}, parola {e(c['word'])}</h1>
<p class="lead">Board ufficiale prima di pubblicare: com'è il funnel adesso, pagina per pagina, sul telefono e sul computer. Copia del formato {e(c.get('from', {}).get('watch', 'build'))} / opt-in {e(c.get('from', {}).get('optin', 'stadium'))}, cambiano solo testi, immagini, link e colori.</p>
<div class="facts"><span>Link per Instant DM: <code>{e(links or 'omnyalab.com/' + c['slug'])}</code></span><span>Pagina: <code>/{e(c['slug'])}</code></span><span>Grazie: <code>/learn/thanks/full-{e(c['id'])}</code></span><span>Prezzo di lancio fino al {e(c['watch']['launch_end'][:10])}</span></div>
</header>
<section><h2><b>A</b>La card dell'opt-in</h2><div class="row">{fig('A1', 'optin-telefono', 'Telefono')}{fig('A2', 'optin-computer', 'Computer')}</div></section>
<section><h2><b>B</b>La pagina video</h2><div class="row">{fig('B1', 'watch-top-telefono', 'Telefono, appena arriva')}{fig('B2', 'watch-top-computer', 'Computer, appena arriva')}</div>
<details><summary>Le pagine intere (B3 telefono, B4 computer)</summary><div class="row wide" style="margin-top:12px">{fig('B3', 'watch-full-telefono', 'Telefono, tutta la pagina (prezzi già visibili)', True)}{fig('B4', 'watch-full-computer', 'Computer, tutta la pagina', True)}</div></details></section>
<section><h2><b>C</b>La scelta e il pagamento</h2><div class="row">{fig('C1', 'full-telefono', 'Full già scelto, telefono')}{fig('C2', 'kit-telefono', 'Tocco il kit, telefono')}{fig('C3', 'full-computer', 'Full già scelto, computer')}</div>
<p class="lead">La carta è quella vera di Stripe (numero, scadenza, codice di sicurezza, nome): la board non si fa se non si carica.</p></section>
<section><h2><b>D</b>La pagina grazie</h2><div class="row wide">{fig('D1', 'thanks-telefono', 'Telefono, con i file di chi ha preso il kit', True)}{fig('D2', 'thanks-computer', 'Computer', True)}</div></section>
<section><h2><b>E</b>Instant DM</h2>{chat}</section>
<section><h2><b>F</b>Stripe</h2><div class="tbl"><table><tr><th></th><th>Prodotto (nome esatto)</th><th>Prezzo</th><th>Link</th></tr>{rows}</table></div>
<p class="lead">Dopo il pagamento tutti tornano su /learn/thanks/full-{e(c['id'])}. Il prezzo del giorno dopo parte da solo alla fine del lancio.</p></section>
<section><h2><b>G</b>Cosa riceve chi paga il kit</h2><ul class="checks">{fl}</ul></section>
<section><h2><b>H</b>Prove</h2><ul class="checks">{ck}</ul></section>
{extra}
<div class="ask"><h2>Va bene così? Cosa cambieresti?</h2><p class="lead">Scrivimi i codici con la correzione, per esempio «B1: gancio più corto» o «E: risposta con un'altra emoji». Quando mi dici che va bene, pubblico.</p></div>
</div>
"""


def run(repo, c, url, out, extra=''):
    os.makedirs(out, exist_ok=True)
    got, files = shots(c, url.rstrip('/'), out, repo)
    cards = {k[5:]: got.pop(k) for k in [k for k in got if k.startswith('card-')]}
    r = subprocess.run([os.path.join(repo, 'scripts', 'new-funnel'), 'check', c['_path'] if c['_path'].startswith('/') else c['id']],
                       capture_output=True, text=True, cwd=repo)
    checks = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith(('ok', 'NO', 'file', 'Pronto')) or 'cose da sistemare' in l]
    checks.insert(0, 'ok  carta Stripe vera nella pagina (numero, scadenza, codice di sicurezza, nome): ' + ', '.join(f'{k} {v:.0f}px' for k, v in cards.items()))
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page(c, got, files, checks, extra))
    print(f"board: {out}/index.html con {len(got)} screenshot")
    return 0
