#!/usr/bin/env python3
# The Rome watch page after `scripts/new-funnel make rome` (25/11/2026), copied from scripts/villa-post.py: the Rome gold
# #f5b83d is light like the villa yellow, so the same fix (near-black text on the gold) and the same blue €59 card under the Full.
# (from the villa:) The Build page has white text on its green buttons
# and badges; on the bright yellow #ffd60a white text cannot be read, so every CSS rule (and inline style) that paints a
# yellow background and white text gets near-black text instead (#111, like the yellow Black Friday button).
# The generator runs it by itself (funnels/rome.json → "post_script").
import colorsys
import re

HEX = re.compile(r'#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b')
WHITE = re.compile(r'(?<![-\w])color:\s*#(?:fff|ffffff)\b(\s*!important)?', re.I)


def yellow(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return 0.10 <= hh <= 0.17 and s > 0.6 and 0.45 <= l <= 0.8


def has_yellow_bg(decls):
    for m in re.finditer(r'background(?:-color|-image)?\s*:([^;]*)', decls, re.I):
        # only solid yellow: a see-through glow (#ffd60a22 on the free guide card) is not the ground under the text
        if any(yellow(x) and (not a or int(a, 16) >= 0xaa) for x, a in HEX.findall(m.group(1))):
            return True
    return False


def fix(decls):
    if has_yellow_bg(decls) and WHITE.search(decls):
        return WHITE.sub(lambda m: 'color:#111' + (m.group(1) or ''), decls), 1
    return decls, 0


def post(text, C):
    if 'rome-post.py' in text:
        return text
    text = bf59(text)
    n = 0

    def rule(m):
        nonlocal n
        d, k = fix(m.group(2))
        n += k
        return m.group(1) + '{' + d + '}'

    def style_block(m):
        return m.group(1) + re.sub(r'([^{}]+)\{([^{}]*)\}', rule, m.group(2)) + m.group(3)
    text = re.sub(r'(<style[^>]*>)(.*?)(</style>)', style_block, text, flags=re.S)

    def inline(m):
        nonlocal n
        d, k = fix(m.group(2))
        n += k
        return m.group(1) + d + m.group(3)
    text = re.sub(r'(style=")([^"]*)(")', inline, text)
    # «Your video is playing / Tap to unmute»: white text on the dark yellow glass (#ccaa00cc) is hard to read, so the glass
    # goes black with a yellow edge and the text stays white
    old = 'background:#ccaa00cc;backdrop-filter:blur(8px);border:1.5px solid #ffffff66'
    if text.count(old) == 1:
        text = text.replace(old, 'background:#0b0a05d9;backdrop-filter:blur(8px);border:1.5px solid #f5b83daa')
        n += 1
    if n == 0:
        raise SystemExit('FERMO: rome-post.py non trova testi bianchi su fondo giallo (è cambiata la pagina del Build?)')
    note = f'/* rome-post.py (25/11, oro di Roma come la villa): {n} testi bianchi su fondo giallo portati a #111 */\n'
    return text.replace('</style></head><body>', note + '</style></head><body>', 1)


def bf59(text):
    """25/11 (Nico: «manca sotto la full guide in blu bello il pack da 59 euro… mettilo con card bella grande»): under the Full
    Guide, in the choice column, a big blue card of the €59 pack (the Everything we teach link, with the Dubai Villa guide and
    its skill inside), like the €59 card under the course on 3D AI Mastery (scripts/mastery-post.py). A tap chooses it and the
    payment becomes the €59 pack; the Full stays the one already chosen. Shown until Friday 27/11 23:59 like the other cards."""
    def rep(t, old, new):
        if t.count(old) != 1:
            raise SystemExit(f'FERMO rome-post.py: «{old[:80]}» trovato {t.count(old)} volte invece di 1')
        return t.replace(old, new)
    m = re.search(r'<label class="opt opt-fu on" data-o="full">.*?</label>', text)
    if not m:
        raise SystemExit('FERMO rome-post.py: riga del Full non trovata')
    card = ('<label class="opt bfc bfc59" data-o="bf"><span class="rib"><i></i>BLACK FRIDAY OFFER</span>'
            '<span class="fan fan--front"><img src="/learn/pk_pb01.webp" alt=""><img src="/learn/pk_pb02.webp" alt=""><img src="/learn/pk_pb03.webp" alt=""><img src="/learn/ro_book_tight.webp" alt=""></span>'
            '<span class="bh">Get everything</span><span class="inc">Every Full guide, the Rome one too, the 3 playbooks, the skills and every new guide</span>'
            '<span class="pz"><s>€260</s><b>€59</b><span>-77%</span></span><span class="go" data-bfgo>Get everything · €59</span><span class="end">Ends Friday 27 November at 23:59</span></label>')
    text = text.replace(m.group(0), m.group(0) + card, 1)
    # the pane on the left when the pack is chosen: the Dubai Villa book first and its line on top
    text = rep(text, '<div class="fbr"><img src="/learn/3d_book.webp" alt="The Full 3D Guide">', '<div class="fbr"><img src="/learn/ro_book_tight.webp" alt="The Full Rome Guide">')
    text = rep(text, '<ul><li>The Full Towers Guide</li><li>The Full Tower Guide</li><li>The Full 3D Guide</li>', '<ul><li>The Full Rome Guide</li><li>The Full Towers Guide</li><li>The Full Tower Guide</li><li>The Full 3D Guide</li>')
    # the script: the card is the new one, its button chooses it and goes to the email (no countdown boxes on this card)
    old = re.search(r"\{ const bfEnd = Date\.parse\('2026-11-27T23:59:59\+01:00'\), bfCard = document\.querySelector\('\[data-bft\]'\).*?bt\(\); setInterval\(bt, 1000\) \}\n", text, re.S)
    if not old:
        raise SystemExit('FERMO rome-post.py: script del Black Friday non trovato')
    new = ("{ const bfEnd = Date.parse('2026-11-27T23:59:59+01:00'), bfCard = document.querySelector('.opt.bfc59')\n"
           "  if (bfCard && Date.now() < bfEnd) { document.documentElement.classList.add('bf')\n"
           "    document.querySelectorAll('.p-all .pr b').forEach(b => b.textContent = '€59'); document.querySelectorAll('.p-all .fanstk b').forEach(b => b.textContent = '-77%'); document.querySelectorAll('.p-all .fanstk small').forEach(b => b.textContent = 'BLACK FRIDAY')\n"
           "    const go = bfCard.querySelector('[data-bfgo]'); if (go) go.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); bfCard.click(); setTimeout(() => { const t = document.querySelector('[data-em]') || document.querySelector('[data-pay]'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 50) }) }\n")
    text = text.replace(old.group(0), new, 1)
    # blue and big (Nico), on the yellow page: the light, the ribbon, the price and the button in the blue of the €59 card
    css = ('.opt.bfc59{margin:18px 0 18px;padding:22px 18px 18px;border-radius:22px;background:radial-gradient(120% 80% at 50% 0%,#0d2a66 0%,#071027 55%,#04070f 100%)!important;border:2px solid #3d8bff!important;box-shadow:0 0 0 6px #3d8bff22,0 28px 70px -22px #3d8bffcc!important}'
           '.opt.bfc59.on{box-shadow:0 0 0 6px #5fb4ff55,0 28px 70px -16px #3d8bffee!important}'
           '.bfc59 .rib{background:linear-gradient(180deg,#3d8bff,#1f5bff)!important;color:#fff!important;font-size:12.5px!important;padding:7px 14px!important}'
           '.bfc59 .fan.fan--front{height:190px;width:300px;margin:14px auto 8px}'
           '.bfc59 .fan.fan--front img{bottom:8px;width:70px;filter:brightness(.72)!important;box-shadow:0 10px 20px #000c,0 0 0 1px #ffffff14!important}'
           '.bfc59 .fan.fan--front img:nth-child(1){left:30px;transform:rotate(-18deg) translateY(2px);z-index:1}'
           '.bfc59 .fan.fan--front img:nth-child(2){left:115px;transform:translateY(-70px);z-index:0}'
           '.bfc59 .fan.fan--front img:nth-child(3){left:200px;transform:rotate(18deg) translateY(2px);z-index:1}'
           '.bfc59 .fan.fan--front img:nth-child(4){left:102px;width:96px;bottom:0;z-index:3;filter:none!important;transform:none;box-shadow:0 0 0 2px #5fb4ff,0 0 34px #3d8bffaa,0 14px 26px #000c!important}'
           '.bfc59 .bh{font-size:34px!important;margin-top:10px!important}'
           '.bfc59 .inc{font-size:14px!important;color:#cfe3ff!important;max-width:330px;margin-left:auto!important;margin-right:auto!important}'
           '.bfc59 .pz{margin-top:12px!important}.bfc59 .pz s{color:#8ea3c8!important;font-size:22px!important}'
           '.bfc59 .pz b{color:#5fb4ff!important;font-size:60px!important;text-shadow:0 0 30px #3d8bff88!important}'
           '.bfc59 .go{height:62px!important;font-size:18px!important;color:#fff!important;background:linear-gradient(180deg,#3d8bff,#1f5bff)!important;box-shadow:inset 0 0 0 1px #9fd8ff40,0 16px 36px -12px #3d8bffcc!important}'
           '.bfc59 .end{color:#9fd8ff!important;font-size:12.5px!important}'
           '.bfc59 .ck{display:none}'
           # 25/11 (Nico: «attento che quello sopra sborda fuori a destra in alto»): the -80% badge of the Full row inside the column
           '.right .opt .off{right:6px!important}'
           # 25/11 (Nico: «metti che c'è anche skill included… con una pill e tipo stellina prima»)
           '.bfc59 .skp{display:inline-flex;align-items:center;gap:8px;margin:12px auto 2px;padding:8px 14px 8px 11px;border-radius:999px;background:#ffd60a1f;border:1.5px solid #ffd60a;color:#fff;font:800 13.5px/1.25 Inter,sans-serif;text-align:left;box-shadow:0 0 22px -6px #ffd60a88}'
           '.bfc59 .skp b{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:50%;background:#ffd60a;color:#111;font:900 13px/1 Inter,sans-serif}'
           '@media (min-width:821px){.bfc59 .fan.fan--front{transform:scale(1.1);transform-origin:50% 100%}}\n')
    return rep(text, '</style></head><body>', css + '</style></head><body>')
