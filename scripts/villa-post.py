#!/usr/bin/env python3
# The Dubai Villa watch page after `scripts/new-funnel make villa` (25/11/2026, Nico: «sto arancione spento fa schifo…
# un bel giallo acceso che attira tutto il funnel… devi accenderlo»). The Build page has white text on its green buttons
# and badges; on the bright yellow #ffd60a white text cannot be read, so every CSS rule (and inline style) that paints a
# yellow background and white text gets near-black text instead (#111, like the yellow Black Friday button).
# The generator runs it by itself (funnels/villa.json → "post_script").
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
    if 'villa-post.py' in text:
        return text
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
        text = text.replace(old, 'background:#0b0a05d9;backdrop-filter:blur(8px);border:1.5px solid #ffd60aaa')
        n += 1
    if n == 0:
        raise SystemExit('FERMO: villa-post.py non trova testi bianchi su fondo giallo (è cambiata la pagina del Build?)')
    note = f'/* villa-post.py (25/11, Nico: giallo acceso): {n} testi bianchi su fondo giallo portati a #111 */\n'
    return text.replace('</style></head><body>', note + '</style></head><body>', 1)
