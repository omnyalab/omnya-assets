# The funnel generator (20/11/2026, Nico: "copia tutto, ma adattalo": a copy is IDENTICAL to the funnel it is copied
# from, only the words, pictures, links and colours change). One file funnels/<id>.json → the opt-in page, the watch
# page, the opt-in colours, the thanks page colours, and the funnel added to every shared file of the site (free PDF,
# Stripe embed, file delivery, learn.ts, /go, thanks page, redirects). Every change is checked: a text that is not found
# where it should be stops everything before a single file is written.
import json
import os
import re

from . import colors

STD_PRICES = {'full': '5.99', 'kit': '14.99', 'full9': '9.99', 'kit19': '19.99'}   # the Riyadh format ladder


CONF = None   # the folder of the funnels/*.json files (the generator's own repo, also when it rebuilds an old commit)


class Stop(Exception):
    pass


def load(repo, ref):
    p = ref if ref.endswith('.json') else os.path.join(CONF or os.path.join(repo, 'funnels'), ref + '.json')
    if not os.path.exists(p):
        raise Stop(f'manca il file del funnel: {p}')
    with open(p, encoding='utf-8') as f:
        c = json.load(f)
    c['_path'] = p
    return c


def rd(repo, rel):
    with open(os.path.join(repo, rel), encoding='utf-8') as f:
        return f.read()


def sub(s, a, b, n=None, where=''):
    """Replace a with b; a must be there (n times when n is given)."""
    if a == b:
        if a not in s:
            raise Stop(f'{where}: non trovo «{a[:110]}»')
        return s
    k = s.count(a)
    if not k:
        raise Stop(f'{where}: non trovo «{a[:110]}»')
    if n is not None and k != n:
        raise Stop(f'{where}: «{a[:90]}» c\'è {k} volte, attese {n}')
    return s.replace(a, b)


def link(c, k):
    p = (c.get('products') or {}).get(k) or {}
    return p.get('link') or f'STRIPE-DA-CREARE-{p.get("pid", k)}'


def pid(c, k):
    return ((c.get('products') or {}).get(k) or {}).get('pid', '')


def lis(items):
    return ''.join(f'<li>{x}</li>' for x in items)


# ---------- the watch page, Riyadh format (the Build page is the clean green copy of it) ----------

def watch_slots(c):
    """Every place of the Riyadh-format watch page that belongs to one funnel, as (text, how many times or None).
    The same list as scripts/make-plane-ry.py and make-stadium-ry.py, written once for every funnel."""
    w, k = c['watch'], c.get('kit')
    kk = k or {}
    book = f"/learn/{c['prefix']}_book_tight.webp"
    out = [
        (c['free']['pdf'], 2),
        (f"/learn/{c['prefix']}_cover_book.webp", None),
        (f"{c['free']['name']} · PDF", 1),
        (f"<h1>{w['title']}</h1>", 1),
        (f'src="/learn/watch/{w["vsl"]}"', 1),
        (f'poster="{w["vsl_poster"]}"', 1),
        (f'<p class="b2h">{w["hook"]}</p>', 1),
        (f'src="/learn/watch/{w["reel"]}" poster="/learn/watch/{w["reel_poster"]}"', 1),
        (f'</svg>{w.get("reel_label", "Our reel")}</span><div class="who">', 1),
        (f'Comment “{c["word"]}” and I’ll send you the free guide…', 1),
        (f'build {w["join"]} for your clients', 1),
        (f'<div class="bk"><img src="{book}" alt="{w["book_alt"]}">', 2),
        (f'<span class="duo"><img class="a" src="{book}" alt="">', 1),
        (f'<span class="ck">✓</span><img src="{book}" alt=""><span><b>The Full Guide</b>', 1),
        (f'<ul>{lis(w["full_list"])}</ul>', 1),
        (f'<img class="b" src="{kk.get("image", book)}" alt="">', 1),
        (f'<ul>{lis(kk.get("list") or w["full_list"])}</ul>', None),
        (f'<small>{kk.get("small", "")}</small>', 1),
        (f'+ {kk.get("short", "The Full Guide")}', None),
        (f"omnya_{c['prefix']}_first", 2),
        (f"Date.parse('{w['launch_end']}')", 2),
        (f"Launch price · from {w['day2']} €9.99", 1),
        (f"'full': '{link(c, 'full')}'", 1),
        (f"'skill': '{link(c, 'kit') if k else link(c, 'full')}'", 1),
        (f"LINK.full = '{link(c, 'full9')}'", 1),
        (f"LINK.skill = '{link(c, 'kit19') if k else link(c, 'full9')}'", 1),
        (f"PID.full = '{pid(c, 'full9')}'", 1),
        (f"PID.skill = '{pid(c, 'kit19') if k else pid(c, 'full9')}'", 1),
        (f"'full': '{pid(c, 'full')}'", 1),
        (f"'skill': '{pid(c, 'kit') if k else pid(c, 'full')}'", 1),
    ]
    return out


# 20/11 (Nico): the card brand marks over the Stripe field keep their real colours on every funnel (the Visa blue
# #1434cb and the JCB green were moved with the funnel colour on the Build, Stadium and Plane pages)
BRANDS = {'.b-visa': '.b-visa{background:#1434cb;font-size:8.5px;font-style:italic;letter-spacing:.02em}',
          '.b-amex': '.b-amex{background:#1f72cd;font-size:7.5px;letter-spacing:.03em}',
          '.b-jcb b:nth-child(1)': '.b-jcb b:nth-child(1){background:#0b4ea2}',
          '.b-jcb b:nth-child(2)': '.b-jcb b:nth-child(2){background:#e60012}',
          '.b-jcb b:nth-child(3)': '.b-jcb b:nth-child(3){background:#009944}',
          '.b-up': '.b-up{font-size:5.4px;color:#fff;background:linear-gradient(100deg,#e21836 0 34%,#00447c 34% 67%,#007b84 67%)}',
          '.b-din em': '.b-din em{width:12px;height:12px;border-radius:50%;border:2.4px solid #0079be;box-sizing:border-box}'}


def brands(w):
    for sel, rule in BRANDS.items():
        w = re.sub(re.escape(sel) + r'\{[^}]*\}', lambda m: rule, w)
    return w


FREE_CARD_GREEN = [   # 18/11 (Nico, plane): the page is blue, so the free guide card is green (make-plane-ry.py)
    ('rgb(41 151 255', 'rgb(34 211 94'), ('#9fd0ff', '#a6f3c0'), ('#2997ff,#5ab8ff', '#1fc458,#3ddc74'), ('#2997ff', '#22d35e')]
FC_MARK = '/* 18/11 (Nico): the page is all green, so the free guide card has its own colour (f1) */'


def head_watch(c):
    w = c['watch']
    kit = c.get('kit')
    return ('---\n'
            f"// {c['slug']}/watch ({c['date']}, Nico: the Riyadh format for the {c['name']} funnel): the free {c['name']} Blueprint as\n"
            f"// step 1{' (no email, NO_MAIL)' if c['optin'].get('noMail', True) else ''}, {w.get('about', 'the face video, our reel')}, then the Full {c['name']} Guide"
            f"{' (and ' + kit['row'] + ')' if kit else ''} with the real Stripe\n"
            f"// Checkout inside the page (api/embed-checkout.js). Launch price for everyone until {w['launch_end'][:10]} 23:59.\n"
            f"// Made by scripts/new-funnel from funnels/{c['id']}.json (copy of the {c['_from_watch']} page): change the words there, not here.\n"
            '---')


def make_watch(repo, c, ref, build_text):
    w = rd(repo, f"src/pages/{ref['slug']}/watch.astro")
    w = re.sub(r'^---\n.*?\n---', lambda m: head_watch(c), w, count=1, flags=re.S)
    # the reference page back in the Build green (a no-op when it is the Build page itself)
    w, kept = colors.watch_back_to_build(w, build_text, ref['colors'].get('watch'))
    rs, ts = watch_slots(ref), watch_slots(c)
    for (a, n), (b, _) in zip(rs, ts):
        w = sub(w, a, b, n, where=f"watch di {ref['id']}")
    w = brands(colors.watch(w, c['colors'].get('watch')))
    # the free guide card (Step 1): blue as on the Build page, or green when the page itself is blue
    if FC_MARK in w and c['colors'].get('free_card', 'blue') == 'green':
        a = w.index(FC_MARK)
        b = w.index('</style>', a)
        blk = w[a:b].replace('the page is all green, so the free guide card has its own colour (f1)',
                             f"the page is {c['colors'].get('name', 'blue')}, so the free guide card is green (Nico, {c['id']} funnel)")
        for x, y in FREE_CARD_GREEN:
            blk = blk.replace(x, y)
        w = w[:a] + blk + w[b:]
    if not c.get('kit'):
        w = sub(w, '</style></head><body>', f"/* {c['id']}: no kit yet, only the Full Guide is on sale */\n.opt-sk,.p-kit{{display:none!important}}\n</style></head><body>", 1, 'watch')
    return w, kept


# ---------- the opt-in page ----------

def optin_tag(c):
    o = c['optin']
    extra = (' ' + o['extra'].strip()) if o.get('extra') else ''
    return (f'<OptIn slug="{c["slug"]}" free="free-{c["id"]}"{" noMail" if o.get("noMail", True) else ""} word="{o["word"]}"{extra} '
            f'book noClose fade theme="{c["theme"]}" allset proof="{o.get("proof", "Steal it before your competitors do")}" '
            f'watch="/{c["slug"]}/watch" cover="/learn/{c["prefix"]}_cover_book.webp" hero="/learn/{c["prefix"]}_hero.webp" '
            f'heroMobile="/learn/{c["prefix"]}_hero_mobile.webp" />')


def make_optin(repo, c, ref):
    s = rd(repo, f"src/pages/{ref['slug']}.astro")
    i = s.index('<style is:global>')
    head, style = s[:i], s[i:]
    o = c['optin']
    head = re.sub(r'^---\n(?://[^\n]*\n)+', lambda m: (
        '---\n'
        f"// /{c['slug']} ({c['date']}/2026, Nico): the funnel for {c.get('what', 'the ' + c['name'] + ' reels')} (word {c['word']}),\n"
        f"// copied from /{ref['slug']}: only the opt-in card over the blurred {c['name'].lower()}, it never closes, nothing behind it;\n"
        f"// after the form {'the free blueprint downloads (no email)' if o.get('noMail', True) else 'the free blueprint goes by email'} and the page moves on to /{c['slug']}/watch.\n"
        f"// Images {c['prefix']}_* and PDFs: {c.get('kit_folder', '~/Desktop/Studio Assets/06 Documents/Blueprint/Omnya ' + c['name'] + ' Blueprint')}. Made by scripts/new-funnel from funnels/{c['id']}.json.\n"),
        head, count=1)
    head = re.sub(r'title="[^"]*" description="[^"]*"', lambda m: f'title="{o["title"]}" description="{o["description"]}"', head, count=1)
    if not re.search(r'<OptIn [^>]*/>', head):
        raise Stop(f"opt-in di {ref['id']}: non trovo <OptIn …/>")
    head = re.sub(r'<OptIn [^>]*/>', lambda m: optin_tag(c), head, count=1)
    P = dict(c['colors']['optin'])
    bg = P.pop('bg')
    style = colors.optin_page_style(repo, style, ref['colors'].get('optin_uncolor'), P, bg)
    extra = c['optin'].get('css')
    if extra:   # a few lines only for this page (e.g. the plane skill card a little lower)
        style = style.replace('<style is:global>', '<style is:global>\n' + extra.strip(), 1)
    return head + style


def make_optin_css(repo, c):
    P = dict(c['colors']['optin'])
    bg = P.pop('bg')
    base = rd(repo, 'src/styles/optin.css')
    parts = colors.optin_css(repo, P, c['theme'], bg, base)
    return '\n'.join([f"/* Generated by scripts/new-funnel from funnels/{c['id']}.json ({c['date']}): the opt-in in the colours of the {c['name'].lower()}, only with theme=\"{c['theme']}\" */"] + parts) + '\n'


def make_thanks_colors(repo, c):
    t = rd(repo, 'src/views/Thanks.astro')
    a = t.index("{Astro.props.id === 'full-riyadh' && (\n<style is:global>")
    a = t.index('<style is:global>', a) + len('<style is:global>')
    b = t.index('</style>', a)
    tc = c['colors']['thanks']
    block = colors.thanks(t[a:b], tc['hue'], tc['main'])
    block = block.replace('Riyadh guide', f"{c['name']} guide").replace('violet night', tc.get('name', c['name'].lower()))
    return ('---\n'
            f"// {c['date']} (Nico): the {c['name']} thanks page (/learn/thanks/full-{c['id']}) in the colours of its funnel.\n"
            f"// Made by scripts/new-funnel from the Riyadh violet block of views/Thanks.astro. is:inline: only on that page.\n"
            '---\n<style is:inline>' + block + '\n</style>\n')


def code(text):
    """The text without its comment lines: two files with the same code but other comments are the same funnel."""
    return '\n'.join(l for l in text.splitlines() if not re.match(r'\s*(//|/\*.*\*/\s*$)', l))


def comp(c):
    return c['name'].replace(' ', '') + 'ThanksColors'


# ---------- the shared files: the funnel added next to the others ----------

def before_line(s, needle, ins, where):
    """Insert ins (whole lines) before the line that holds needle (and before the comment line right above it)."""
    i = s.find(needle)
    if i < 0:
        raise Stop(f'{where}: non trovo il punto «{needle[:80]}»')
    ls = s.rfind('\n', 0, i) + 1
    return s[:ls] + ins + s[ls:]


def at(s, needle, ins, where, after=False, n=1):
    k = s.count(needle)
    if k != n:
        raise Stop(f'{where}: il punto «{needle[:80]}» c\'è {k} volte, atteso {n}')
    i = s.index(needle) + (len(needle) if after else 0)
    return s[:i] + ins + s[i:]


def esc_re(name):
    """The exact Stripe product name as a rule: every word, in order, any case and any spaces (never generic words)."""
    return r'\s+'.join(re.sub(r'([.^$*+?()[\]{}|\\/])', r'\\\1', w) for w in name.split())


def first_rule(s, name):
    """The files the RULES of learn-files.js give today to a Stripe product name (the first rule that matches), or None."""
    i = s.index('const RULES = [')
    j = s.index('\n];', i)
    for m in re.finditer(r"^\s*\[/((?:[^/\\\n]|\\.)+)/([a-z]*), (\[[^\]]*\]|PACK)\],", s[i:j], re.M):
        flags = re.I if 'i' in m.group(2) else 0
        if re.search(m.group(1), name, flags):
            return [x.strip() for x in m.group(3).strip('[]').split(',')] if m.group(3) != 'PACK' else ['PACK']
    return None


def patches(repo, c):
    """[(file, new text, what changed)] for every shared file; a file is only listed when something changes."""
    out = []
    X, N, slug = c['id'], c['name'], c['slug']
    prods = c.get('products') or {}
    have = lambda k: bool(prods.get(k, {}).get('price') and prods.get(k, {}).get('link'))
    kit = c.get('kit')
    kf = c.get('kit_file')
    FULLC = 'FULL_' + re.sub(r'\W', '_', X.upper())
    KITC = kf['const'] if kf else ''
    note = []

    # api/optin.js: the free PDF and no email
    s0 = s = rd(repo, 'api/optin.js')
    if f"'free-{X}':" not in s:
        s = before_line(s, "  free: { name: 'The Blueprint'", f"  'free-{X}': {{ name: '{c['free']['name']}', file: '/learn/free/{c['free']['pdf']}' }},\n", 'api/optin.js')
    if c['optin'].get('noMail', True) and f"'free-{X}', 'waitlist-3d-future'" not in s and re.search(r"NO_MAIL = new Set\(\[[^\]]*'free-%s'" % re.escape(X), s) is None:
        s = at(s, "'waitlist-3d-future']);", f"'free-{X}', ", 'api/optin.js NO_MAIL')
    if s != s0:
        out.append(('api/optin.js', s, 'free PDF + NO_MAIL'))

    # api/embed-checkout.js: the prices inside our checkout
    s0 = s = rd(repo, 'api/embed-checkout.js')
    lines = []
    for k in ('full', 'kit', 'full9', 'kit19', 'skill'):
        p = prods.get(k)
        if not p:
            continue
        if not have(k):
            note.append(f'Stripe {k} ({p.get("pid")}) non c\'è ancora: niente riga in embed-checkout.js')
            continue
        if f"'{p['pid']}':" in s:
            continue
        lines.append(f"  '{p['pid']}': {{ items: ['{p['price']}'], back: 'full-{X}' }}, // {p['link'].replace('https://buy.stripe.com/', '')} · {p['eur'].replace('.', ',')}")
    if lines:
        hdr = f"  // {c['date']} (Nico, {N} funnel, made by scripts/new-funnel): " + ', '.join(prods[k]['stripe_name'] + ' €' + prods[k]['eur'] for k in prods if have(k)) + '\n'
        bfc = '  // 16/11 (Nico): Black Friday, Everything we teach for €39'
        s = before_line(s, bfc if bfc in s else "  'black-friday': {", hdr + '\n'.join(lines) + '\n', 'api/embed-checkout.js')
    if s != s0:
        out.append(('api/embed-checkout.js', s, 'prezzi Stripe nel checkout'))

    # api/_lib/learn-files.js: what each Stripe product delivers
    s0 = s = rd(repo, 'api/_lib/learn-files.js')
    if f'const {FULLC} =' not in s:
        s = before_line(s, '// 10/11 (Nico): "The Towers Scene File" (€12), the one file that is not a PDF.',
                        f"// {c['date']}: {c['full']['title'][0].lower() + c['full']['title'][1:]} ({N} reels, word {c['word']}){', and ' + kf['name'] + ' sold with it at €' + prods['kit']['eur'] if kf and prods.get('kit') else ''}\n"
                        f"const {FULLC} = pdf('{c['full']['title']}', '{c['full']['pdf']}');\n", 'learn-files.js FULL')
    if kf and f'const {KITC} =' not in s:
        s = at(s, '\nconst EVERY = [', f"\nconst {KITC} = {{\n  name: '{kf['name']}', file: 'en/{kf['zip']}', kind: 'zip',\n  note: '{kf['note']}',\n}};\n", 'learn-files.js KIT')
    m = re.search(r'const EVERY = \[([^\]]*)\];', s)
    if not m:
        raise Stop('learn-files.js: non trovo const EVERY')
    ev = [x.strip() for x in m.group(1).split(',')]
    if FULLC not in ev or (kf and KITC not in ev):
        if FULLC not in ev:
            ev.insert(ev.index('SCENE') if 'SCENE' in ev else len(ev), FULLC)
        if kf and KITC not in ev:
            ev.append(KITC)
        s = s[:m.start(1)] + ', '.join(ev) + s[m.end(1):]
    m = re.search(r"(return pdfs\.length === 1 && \[)([^\]]*)(\]\.some)", s)
    if not m:
        raise Stop('learn-files.js: non trovo la lista di oneFullGuide')
    if FULLC not in [x.strip() for x in m.group(2).split(',')]:
        s = s[:m.end(2)] + f', {FULLC}' + s[m.end(2):]
    rules = []
    if kit and prods.get('kit') and first_rule(s, prods['kit']['stripe_name']) != [FULLC, KITC]:
        rules.append(f"  // {c['date']}: \"{prods['kit']['stripe_name']}\" (€{prods['kit']['eur']}" + (f" / €{prods['kit19']['eur']}" if prods.get('kit19') else '') + ') before the plain Full rule, exact Stripe name')
        rules.append(f"  [/{esc_re(prods['kit']['stripe_name'])}/i, [{FULLC}, {KITC}]],")
    if prods.get('full') and first_rule(s, prods['full']['stripe_name']) != [FULLC]:
        rules.append(f"  // {c['date']}: \"{prods['full']['stripe_name']}\" (€{prods['full']['eur']}" + (f" / €{prods['full9']['eur']}" if prods.get('full9') else '') + '), exact Stripe name')
        rules.append(f"  [/{esc_re(prods['full']['stripe_name'])}/i, [{FULLC}]],")
    if rules:
        s = before_line(s, '  // 10/11: "The Towers Scene File" BEFORE every rule with "tower" in it.', '\n'.join(rules) + '\n', 'learn-files.js RULES')
    if c.get('pack'):
        m = re.search(r'const PACK = \[([^\]]*)\];', s)
        if not m:
            raise Stop('learn-files.js: non trovo const PACK')
        pk = [x.strip() for x in m.group(1).split(',')]
        if FULLC not in pk or (kf and KITC not in pk):
            if FULLC not in pk:
                pk.insert(pk.index('WHITE_TO_REAL') if 'WHITE_TO_REAL' in pk else len(pk), FULLC)
            if kf and KITC not in pk:
                pk.append(KITC)
            s = s[:m.start(1)] + ', '.join(pk) + s[m.end(1):]
            s = at(s, '\nconst PACK = [', f"\n// {c['date']}: the {N} joined the pack (the Black Friday card says \"{N} too\"): its Full guide{' and kit' if kf else ''}", 'learn-files.js PACK')
    if s != s0:
        out.append(('api/_lib/learn-files.js', s, 'consegna dei file dopo il pagamento'))

    # src/lib/learn.ts: the product ids, the links, the thanks page
    s0 = s = rd(repo, 'src/lib/learn.ts')
    if f"| 'full-{X}'" not in s:
        m = re.search(r"export type ProductId[^;]*?(\n  \| '[a-z0-9-]+');", s, re.S)
        if not m:
            raise Stop('learn.ts: non trovo la fine di ProductId')
        s = s[:m.end(1)] + f"\n  // the free and the paid {N} PDFs, on /{slug} ({c['date']}, word {c['word']} on Instant DM)\n  | 'free-{X}'\n  | 'full-{X}'" + s[m.end(1):]
    i = s.index('export const products')
    j = s.index('\n];', i)
    blk = s[i:j]
    ins = ''
    if f"id: 'free-{X}'" not in blk:
        ins += f"\n  {{ id: 'free-{X}', checkout: '/learn/free/{c['free']['pdf']}' }},"
    if f"id: 'full-{X}'" not in blk and have('full'):
        f9 = f"; from {c['watch']['day2']} €{prods['full9']['eur']} {prods['full9']['link']}" if have('full9') else ''
        kt = f"; \"{prods['kit']['stripe_name']}\" €{prods['kit']['eur']} is {prods['kit'].get('prod', '')}, {prods['kit']['link']}" if kit and have('kit') else ''
        ins += (f"\n  // the Full {N} Blueprint at €{prods['full']['eur']} (€29 struck), Stripe product \"{prods['full']['stripe_name']}\", back to /learn/thanks/full-{X} ({c['date']})"
                f"\n  // {prods['full'].get('prod', '')}{kt}{f9}, used on the watch page"
                f"\n  {{ id: 'full-{X}', checkout: '{prods['full']['link']}' }},")
    elif not have('full'):
        note.append('learn.ts: il Full non ha ancora il link Stripe, la riga products arriva al prossimo giro')
    if ins:
        s = s[:j] + ins + s[j:]
    i = s.index('export const thanks')
    j = s.index('\n};', i)
    if f"'full-{X}':" not in s[i:j]:
        s = s[:j] + f"\n  'full-{X}': {{ kind: 'pdf', oto: 'community' }}," + s[j:]
    if s != s0:
        out.append(('src/lib/learn.ts', s, 'prodotti, link e pagina grazie'))

    # src/views/Go.astro: the name and the gate of the free PDF
    s0 = s = rd(repo, 'src/views/Go.astro')
    if f"id === 'full-{X}' ?" not in s:
        s = at(s, ' book ? `${book.a} ${book.b}`', f" id === 'free-{X}' ? 'the free {N} Blueprint (PDF)' : id === 'full-{X}' ? 'the Full {N} Blueprint, {c['full']['title']} (PDF)' :", 'Go.astro name')
    if f"'free-{X}': '/{slug}'" not in s:
        s = at(s, " };\nconst gate", f", 'free-{X}': '/{slug}'", 'Go.astro funnels')
    if s != s0:
        out.append(('src/views/Go.astro', s, 'nome e pagina del PDF gratis'))

    # src/views/Thanks.astro: Black Friday, The 3D Future, the colours
    s0 = s = rd(repo, 'src/views/Thanks.astro')
    C = comp(c)
    if f'import {C} from' not in s:
        last = list(re.finditer(r"\nimport \w+ThanksColors from '[^']+';", s))[-1]
        s = s[:last.end()] + f"\nimport {C} from '../components/{C}.astro';" + s[last.end():]
    m = re.search(r"const fulls: Record<string, string> = \{[^\n]*?( \};)", s)
    if not m:
        raise Stop('Thanks.astro: non trovo const fulls')
    if f"'full-{X}':" not in m.group(0):
        s = s[:m.start(1)] + f", 'full-{X}': 'Full {N} Blueprint'" + s[m.start(1):]
    bf = (c.get('thanks') or {}).get('bf')
    if bf and f"Astro.props.id === 'full-{X}' && <RiyadhBlackFriday" not in s:
        last = list(re.finditer(r"\n    \{Astro\.props\.id === 'full-[a-z0-9-]+' && <RiyadhBlackFriday [^\n]*\}", s))[-1]
        props = ' '.join(f'{k}="{v}"' for k, v in bf.items())
        s = s[:last.end()] + f"\n    {{Astro.props.id === 'full-{X}' && <RiyadhBlackFriday {props} />}}" + s[last.end():]
    if f"Astro.props.id === 'full-{X}' ? <RiyadhFuture" not in s:
        s = at(s, " (\n    <article class:list={['oto__card'", f" Astro.props.id === 'full-{X}' ? <RiyadhFuture kind=\"{X}\" /> :", 'Thanks.astro RiyadhFuture')
    if f"Astro.props.id === 'full-{X}' && <{C} />" not in s:
        last = list(re.finditer(r"\n\{Astro\.props\.id === 'full-[a-z0-9-]+' && <\w+ThanksColors />\}", s))[-1]
        s = s[:last.end()] + f"\n{{Astro.props.id === 'full-{X}' && <{C} />}}" + s[last.end():]
    if s != s0:
        out.append(('src/views/Thanks.astro', s, 'grazie: Black Friday, The 3D Future, colori'))

    # src/components/RiyadhFuture.astro: the words of the card
    s0 = s = rd(repo, 'src/components/RiyadhFuture.astro')
    m = re.search(r"kind\?: ([^;]+?); bg\?:", s)
    if not m:
        raise Stop('RiyadhFuture.astro: non trovo kind?:')
    if f"'{X}'" not in m.group(1):
        s = s[:m.end(1)] + f" | '{X}'" + s[m.end(1):]
    if f"kind === '{X}' ?" not in s:
        s = at(s, "'these 3D towers';", f"kind === '{X}' ? '{(c.get('thanks') or {}).get('future', 'these 3D ' + N.lower() + 's')}' : ", 'RiyadhFuture what')
    if s != s0:
        out.append(('src/components/RiyadhFuture.astro', s, 'testo di The 3D Future'))

    # src/components/AllSetOffer.astro + OptIn.astro: the theme and the screen after the form
    s0 = s = rd(repo, 'src/components/AllSetOffer.astro')
    m = re.search(r"kind\?: ([^;]+);", s)
    if m and f"'{X}'" not in m.group(1):
        s = s[:m.end(1)] + f" | '{X}'" + s[m.end(1):]
    if f"{X}: ['FREE " not in s and f"'{X}': ['FREE " not in s:
        s = at(s, 'const MAILS = { ', f"{X}: ['FREE {N} Blueprint', '{c['free']['pdf']}'], ", 'AllSetOffer MAILS', after=True)
    if f"\n  {X}: {{ book:" not in s:
        m = re.search(r"\n  towers: \{ book:[^\n]*", s)
        if not m:
            raise Stop('AllSetOffer.astro: non trovo towers: { book:')
        s = s[:m.end()] + f"\n  {X}: {{ book: '/learn/{c['prefix']}_book_tight.webp', alt: 'The Full {N} Blueprint', free: '/learn/{c['prefix']}_cover_book.webp', full: '/go/full-{X}', scene: '' }}," + s[m.end():]
    if s != s0:
        out.append(('src/components/AllSetOffer.astro', s, 'schermo dopo il modulo'))

    s0 = s = rd(repo, 'src/components/OptIn.astro')
    css = f"import '../styles/optin-{X}.css';"
    if css not in s:
        last = list(re.finditer(r"\nimport '\.\./styles/optin-[a-z0-9-]+\.css';", s))[-1]
        s = s[:last.end()] + '\n' + css + s[last.end():]
    m = re.search(r"theme\?: ([^;]+);", s)
    if f"'{c['theme']}'" not in m.group(1):
        s = s[:m.end(1)] + f" | '{c['theme']}'" + s[m.end(1):]
    if f"slug === '{slug}'" not in s:
        s = at(s, " 'towers'} />", f" slug === '{slug}' ? '{X}' :", 'OptIn AllSetOffer kind')
    m = re.search(r"oi--\(\(\?:([a-z0-9|]+)\)\\d\?\)", s)
    if not m:
        raise Stop('OptIn.astro: non trovo la regex della dissolvenza oi--((?:…)\\d?)')
    if c['theme'] not in m.group(1).split('|'):
        s = s[:m.end(1)] + '|' + c['theme'] + s[m.end(1):]
    if s != s0:
        out.append(('src/components/OptIn.astro', s, 'tema dei colori e dissolvenza'))

    # vercel.json: the short links of the DM and the Instagram tracking
    s0 = s = rd(repo, 'vercel.json')
    k = s.count('|fable)"')
    if f'|{slug}|' not in s and f'|{slug})' not in s:
        if k != 2:
            raise Stop(f'vercel.json: «|fable)» c\'è {k} volte, attese 2')
        s = s.replace('|fable)"', f'|{slug}|fable)"')
    add = ''
    for src, perm in (c.get('links') or {}).items():
        if f'"source": "{src}",' in s:
            continue
        add += f'    {{\n      "source": "{src}",\n      "destination": "/{slug}",\n      "permanent": {"true" if perm else "false"}\n    }},\n'
    if add:
        s = at(s, '    {\n      "source": "/riyadh",', add, 'vercel.json link corti')
    if s != s0:
        json.loads(s)
        out.append(('vercel.json', s, 'link corti ' + ', '.join(c.get('links') or {})))

    # docs/DM-INSTAGRAM.md: the Instant DM texts of the funnel, next to the others
    d = c.get('dm')
    if d:
        s0 = s = rd(repo, 'docs/DM-INSTAGRAM.md')
        mark = f'<!-- funnel:{X} -->'
        if mark not in s:
            rows = '\n'.join(f'- {k}: {v}' for k, v in d.items() if k != 'note')
            s = s.rstrip('\n') + f"\n\n## Reel {N}, parola {c['word']} (dal {c['date']}) {mark}\n\nInstant DM (app.instantdm.com, Chrome di Nico), copiata dall'ultima automazione buona. Pagina: https://www.omnyalab.com/{slug}{d.get('note') and (' · ' + d['note']) or ''}\n\n{rows}\n"
            out.append(('docs/DM-INSTAGRAM.md', s, 'testi di Instant DM'))

    return out, note


# ---------- what the funnel needs on disk ----------

def assets(c):
    p, w = c['prefix'], c['watch']
    need = [f"public/learn/{p}_cover_book.webp", f"public/learn/{p}_book_tight.webp", f"public/learn/{p}_hero.webp",
            f"public/learn/{p}_hero_mobile.webp", f"public/learn/free/{c['free']['pdf']}", f"private/learn/en/{c['full']['pdf']}",
            'public/learn/watch/' + w['vsl'].split('?')[0], 'public' + w['vsl_poster'], 'public/learn/watch/' + w['reel'].split('?')[0],
            'public/learn/watch/' + w['reel_poster']]
    if c.get('kit'):
        need.append('public' + c['kit']['image'])
    if c.get('kit_file'):
        need.append('private/learn/en/' + c['kit_file']['zip'])
    return need


def leftovers(text, ref, c, allow):
    """Words, links and ids of the funnel it was copied from that are still in the new page (a copy that forgot something)."""
    if ref['id'] == c['id']:
        return []
    t = text
    for a in allow:
        t = t.replace(a, '')
    found = []
    words = [f"{ref['prefix']}_", f"-{ref['id']}-", f"'{ref['id']}'", f"free-{ref['id']}", f"full-{ref['id']}"] + list(ref.get('own_words', []))
    words += [p['link'] for p in (ref.get('products') or {}).values() if p.get('link')]
    for wd in words:
        for m in re.finditer(re.escape(wd), t, re.I):
            found.append(t[max(0, m.start() - 40):m.end() + 30].replace('\n', ' '))
    return found


def build_all(repo, c, out_root=None, shared=True):
    """Everything for one funnel → [(path, text, why)]. Nothing is written here."""
    fmt = c.get('format', 'riyadh')
    if fmt != 'riyadh':
        raise Stop(f'formato «{fmt}» non ancora nel generatore: per ora solo «riyadh» (watch dal Build, opt-in dallo stadio)')
    for k, v in STD_PRICES.items():
        p = (c.get('products') or {}).get(k)
        if p and p.get('eur') != v:
            raise Stop(f'prezzo {k} = €{p.get("eur")}: il formato Riyadh ha €{v} scritto in tutta la pagina (risparmi, -80%…). Prezzi diversi = a mano')
    for k in ('id', 'slug', 'name', 'word', 'prefix', 'theme', 'date', 'optin', 'free', 'full', 'watch', 'products', 'colors'):
        if not c.get(k):
            raise Stop(f'nel file manca «{k}»')
    if not re.fullmatch(r'[a-z0-9]+', c['id']) or not re.fullmatch(r'[a-z]{2,4}', c['theme']) or not re.fullmatch(r'[a-z0-9-]+', c['slug']):
        raise Stop('id solo lettere minuscole e numeri, theme 2-4 lettere, slug con trattini')
    if c['products'].get('full', {}).get('pid') != f"full-{c['id']}":
        raise Stop(f"products.full.pid deve essere full-{c['id']} (è anche l'indirizzo della pagina grazie)")
    if c['word'] != c['word'].upper():
        raise Stop('word = la parola del reel in maiuscolo, come in “Comment “PLANE””')
    fr = c.get('from') or {}
    refw = load(repo, fr.get('watch', 'build'))
    refo = load(repo, fr.get('optin', 'stadium'))
    c['_from_watch'] = refw['id']
    build_text = rd(repo, 'src/pages/the-build-blueprint/watch.astro')
    files = []
    w, kept = make_watch(repo, c, refw, build_text)
    files.append((f"src/pages/{c['slug']}/watch.astro", w, f"pagina video (copia di {refw['slug']}/watch)"))
    files.append((f"src/pages/{c['slug']}.astro", make_optin(repo, c, refo), f"opt-in (copia di /{refo['slug']})"))
    files.append((f"src/styles/optin-{c['id']}.css", make_optin_css(repo, c), 'colori della card'))
    files.append((f"src/components/{comp(c)}.astro", make_thanks_colors(repo, c), 'colori della pagina grazie'))
    notes = []
    if kept:
        notes.append(f"colori della pagina di {refw['id']} rimasti com'erano (non del Build): {', '.join(kept[:12])}")
    left = leftovers(w, refw, c, refw.get('allow', []))
    if left:
        raise Stop('nella pagina video restano pezzi di ' + refw['id'] + ':\n  ' + '\n  '.join(left[:10]))
    if shared:
        ps, pn = patches(repo, c)
        files += ps
        notes += pn
    return files, notes
