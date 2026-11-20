# The full test of a funnel (20/11/2026): opt-in → watch → checkout → thanks page with the files, in Chromium (Google
# Chrome) and WebKit (the engine of Safari, so iPhone), on a phone and on a computer. Run it on the local dev server
# before the push (the api/ functions are not there, so the opt-in answer, the Stripe session and the files of the
# payment are given by the test, the last ones made by the real learn-files.js) and on www.omnyalab.com after the push
# (--live: real opt-in with a check+<id>@omnyalab.com contact, real Stripe session, short links).
# A real payment is never made: who pays is a person.
import json
import os
import re
import subprocess
import time
import urllib.request

from . import make as M

SIZES = {'telefono': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True),
         'computer': dict(viewport={'width': 1280, 'height': 860})}


class Log:
    def __init__(self):
        self.bad = []

    def ok(self, cond, what):
        print(('  ok  ' if cond else '  NO  ') + what, flush=True)
        if not cond:
            self.bad.append(what)
        return cond


def node():
    for p in (os.path.expanduser('~/.local/node/bin/node'), '/usr/local/bin/node', '/opt/homebrew/bin/node'):
        if os.path.exists(p):
            return p
    return 'node'


def files_for(repo, names):
    """What the real api/_lib/learn-files.js gives for these Stripe names, signed with a test key (only for this test)."""
    js = ("import('%s').then(m=>console.log(JSON.stringify(m.filesForProduct(%s,{ttl:600}).map(f=>({name:f.name,href:f.href,"
          "...(f.kind?{kind:f.kind}:{}),...(f.note?{note:f.note}:{})})))))") % (os.path.join(repo, 'api/_lib/learn-files.js'), json.dumps(names))
    r = subprocess.run([node(), '--input-type=module', '-e', js], capture_output=True, text=True,
                       env=dict(os.environ, FILES_SECRET='prova-locale-new-funnel'))
    return json.loads(r.stdout.strip() or '[]')


def file_served(repo, href):
    """api/file.js asked for a signed link, with the same test key: the real file comes back (status, bytes)."""
    js = ("import('%s').then(async m=>{const r=await m.GET(new Request('https://www.omnyalab.com%s'));"
          "const b=await r.arrayBuffer();console.log(r.status+' '+b.byteLength)}).catch(e=>console.log('0 '+e.message))") % (os.path.join(repo, 'api/file.js'), href)
    r = subprocess.run([node(), '--input-type=module', '-e', js], capture_output=True, text=True, cwd=repo,
                       env=dict(os.environ, FILES_SECRET='prova-locale-new-funnel'))
    out = (r.stdout.strip().splitlines() or ['0 ' + r.stderr[-200:]])[-1]
    st, n = out.split(' ', 1)
    return int(st) if st.isdigit() else 0, n


def head(url):
    req = urllib.request.Request(url, method='GET', headers={'Range': 'bytes=0-0', 'User-Agent': 'omnya-funnel-test'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def redirect_of(url):
    op = urllib.request.build_opener(NoRedirect)
    try:
        op.open(urllib.request.Request(url, headers={'User-Agent': 'omnya-funnel-test'}), timeout=20)
        return 200, ''
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('Location', '')


def run(repo, c, url, live, only=''):
    from playwright.sync_api import sync_playwright
    url = url.rstrip('/')
    L = Log()
    X, slug = c['id'], c['slug']
    prods = c.get('products') or {}
    shots = os.path.join(os.environ.get('FUNNEL_SHOTS', '/tmp'), f'funnel-{X}-{"live" if live else "locale"}')
    os.makedirs(shots, exist_ok=True)
    print(f"PROVA {X} su {url} ({'sito vero' if live else 'in locale'}), screenshot in {shots}")

    # what the payment delivers, with the real rules (and, in local, the real api/file.js)
    print('· consegna dopo il pagamento')
    pay = {}
    for k in ('full', 'kit'):
        p = prods.get(k)
        if not p:
            continue
        fs = files_for(repo, [p['stripe_name']])
        pay[k] = fs
        L.ok(bool(fs), f"«{p['stripe_name']}» → {', '.join(f['name'] for f in fs) or 'NIENTE'}")
        if not live:
            for f in fs:
                st, n = file_served(repo, f['href'])
                L.ok(st == 200, f"  api/file.js dà {f['name']}: {st} ({n} byte)")

    if live:
        print('· link corti e Stripe')
        for src in (c.get('links') or {}):
            st, loc = redirect_of(url + src)
            L.ok(st in (301, 302, 307, 308) and loc.rstrip('/').endswith('/' + slug), f'{src} → {st} {loc}')
        import sys
        sys.path.insert(0, os.path.expanduser('~/Omnya Automazioni'))
        try:
            from controllo import prova_stripe   # the same test as the funnel check alarm (exists and not switched off)
        except Exception:
            prova_stripe = None
        for k, p in prods.items():
            if p.get('link'):
                st, why = prova_stripe(p['link'], None) if prova_stripe else (('ok' if head(p['link']) == 200 else 'rotto'), '')
                L.ok(st == 'ok', f"link Stripe {k} {p['link']}: {why or st}")

    with sync_playwright() as pw:
        engines = [('Chromium', pw.chromium, {'channel': 'chrome'}), ('WebKit', pw.webkit, {})]
        for ename, eng, opts in engines:
            if only and only.lower() not in ename.lower():
                continue
            b = eng.launch(**opts)
            for sname, size in SIZES.items():
                tag = f'{ename} {sname}'
                print(f'· {tag}')
                ctx = b.new_context(**size)
                pg = ctx.new_page()
                errors = []
                pg.on('pageerror', lambda e: errors.append(str(e)))
                bad_media = []
                pg.on('response', lambda r: bad_media.append(r.url) if r.status >= 400 and re.search(r'/learn/|\.(webp|jpg|png|mp4|pdf)(\?|$)', r.url) else None)
                if not live:
                    pg.route('**/api/optin', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true,"mail":false}'))
                    pg.route('**/api/embed-checkout', lambda r: r.fulfill(status=503, content_type='application/json', body='{"error":"not configured"}'))
                # 1. the opt-in card
                pg.goto(f'{url}/{slug}', wait_until='domcontentloaded')
                pg.wait_for_selector('[data-optin] form', timeout=20000)
                title = pg.inner_text('#oi-title')
                L.ok(c['optin']['word'].lower() in title.lower(), f"{tag}: card «{' '.join(title.split())}»")
                pg.screenshot(path=f'{shots}/{ename}-{sname}-1-optin.png')
                # 2. the form → the watch page
                email = f'check+{X}@omnyalab.com'
                pg.fill('[data-optin] form input[name=name]', 'Check')
                pg.fill('[data-optin] form input[name=email]', email)
                with pg.expect_navigation(url=re.compile(re.escape(f'/{slug}/watch')), timeout=25000):
                    pg.click('[data-optin] form .x3-btn')
                L.ok(True, f'{tag}: modulo inviato → /{slug}/watch')
                pg.wait_for_load_state('load')
                time.sleep(1.5)
                pg.screenshot(path=f'{shots}/{ename}-{sname}-2-watch.png')
                # 3. the watch page
                html = pg.content()
                L.ok(c['watch']['title'] in html, f'{tag}: titolo Step 2')
                L.ok(c['watch']['hook'] in html, f'{tag}: gancio')
                fg = pg.get_attribute('a.fg', 'href')
                L.ok(fg == f"/learn/free/{c['free']['pdf']}" and pg.request.get(url + fg).status == 200, f'{tag}: PDF gratis {fg}')
                for v in pg.query_selector_all('video'):
                    src = v.get_attribute('src')
                    if src:
                        L.ok(pg.request.get(url + src if src.startswith('/') else src, headers={'Range': 'bytes=0-0'}).status in (200, 206), f'{tag}: video {src}')
                visa = pg.evaluate("(() => { const e = document.querySelector('.b-visa'); return e ? getComputedStyle(e).backgroundColor : '' })()")
                L.ok(visa in ('rgb(20, 52, 203)', ''), f'{tag}: logo Visa nel suo blu ({visa or "assente"})')
                broken = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.offsetParent).map(i => i.src)")
                L.ok(not broken, f'{tag}: immagini visibili tutte caricate' + (f' (rotte: {broken[:3]})' if broken else ''))
                # the choices: the Full starts chosen, the kit changes the price, the Pay button follows
                pay_txt = ' '.join(pg.inner_text('[data-pay]').split())
                L.ok('€5.99' in pay_txt or '€9.99' in pay_txt, f'{tag}: Full già scelto · «{pay_txt}»')
                if c.get('kit'):
                    if live:   # like a person: the card of the payment first loads, then the tap
                        pg.wait_for_selector('.right.live', timeout=25000)
                    pg.click('.right .opt-sk')
                    time.sleep(2.5 if live else 0.4)
                    t2 = ' '.join(pg.inner_text('[data-pay]').split())
                    L.ok('€14.99' in t2 or '€19.99' in t2, f'{tag}: tocco il kit · «{t2}»')
                    if live:
                        pg.wait_for_selector('.right.live', timeout=25000)
                    pg.click('.right .opt-fu')
                    time.sleep(2.5 if live else 0.4)
                if live:
                    # the real Stripe Checkout inside the page (a session, no payment)
                    try:
                        pg.wait_for_selector('.right.live', timeout=25000)
                        fr = [f.url for f in pg.frames if 'js.stripe.com' in f.url]
                        L.ok(bool(fr), f'{tag}: carta Stripe nella pagina')
                    except Exception:
                        L.ok(False, f'{tag}: carta Stripe nella pagina')
                    pg.screenshot(path=f'{shots}/{ename}-{sname}-3-checkout.png', full_page=False)
                else:
                    # without our checkout the button opens the Stripe payment link of the product, with the email
                    pg.fill('[data-em]', email)
                    went = []
                    pg.route('https://buy.stripe.com/**', lambda r: (went.append(r.request.url), r.abort()))
                    try:
                        pg.click('[data-pay]')
                        pg.wait_for_timeout(1500)
                    except Exception:
                        pass
                    want = (prods.get('full') or {}).get('link', '')
                    L.ok(bool(went) and want and went[0].startswith(want), f"{tag}: Pay → {went[0] if went else 'niente'}")
                # 4. the thanks page, with the files of the payment
                sid = 'cs_test_newfunnel' + X.replace('-', '') + 'abcdefgh'
                if not live:
                    files = pay.get('kit') or pay.get('full') or []
                    body = json.dumps({'files': files, 'pack': False, 'paid': 1499, 'skill': False, 'email': email})
                    pg.route('**/api/files?**', lambda r: r.fulfill(status=200, content_type='application/json', body=body))
                pg.goto(f"{url}/learn/thanks/full-{X}" + ('' if live else f'?session_id={sid}'), wait_until='load')
                time.sleep(2)
                # the cards fade in while you scroll: scroll down like a person, then the picture of the whole page
                pg.evaluate("(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) } scrollTo(0, 0) })()")
                time.sleep(1.2)
                th = pg.content()
                pg.screenshot(path=f'{shots}/{ename}-{sname}-4-grazie.png', full_page=True)
                L.ok(f'{c["colors"]["thanks"]["main"]}' in th, f'{tag}: grazie nei colori del funnel ({c["colors"]["thanks"]["main"]})')
                bfp = (c.get('thanks') or {}).get('bf')
                if bfp:
                    L.ok('data-bft' in th, f'{tag}: card Black Friday')
                L.ok('ryfw' in th, f'{tag}: card The 3D Future')
                if not live:
                    btns = pg.evaluate("[...document.querySelectorAll('a[href*=\"/api/file?\"]')].map(a => a.textContent.trim())")
                    L.ok(len(btns) >= len(files) and files, f'{tag}: bottoni dei file · {btns[:4]}')
                L.ok(not errors, f'{tag}: nessun errore JavaScript' + (f' ({errors[:2]})' if errors else ''))
                L.ok(not bad_media, f'{tag}: nessun file della pagina mancante' + (f' ({bad_media[:3]})' if bad_media else ''))
                ctx.close()
            b.close()
    print(f"\n{'TUTTO OK' if not L.bad else str(len(L.bad)) + ' PROVE NON PASSATE'} · pagamento vero non fatto (lo fa una persona)")
    return 1 if L.bad else 0
