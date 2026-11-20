# The colour engines of the funnels, the same maths as the hand scripts they replace (20/11/2026):
#  - watch():  the Build page green moved to the funnel colour (scripts/make-plane-ry.py, make-stadium-ry.py)
#  - optin():  the Omnya blue of src/styles/optin.css moved by role (scripts/recolor-burj.py, recolor-plane.py)
#  - thanks(): the Riyadh violet block of views/Thanks.astro moved to the funnel colour (make-plane-ry.py)
# Every function takes the palette of funnels/<id>.json ("colors"), so a new colour is a few numbers, not a new script.
import colorsys
import importlib.util
import os
import re

HEX = re.compile(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b')
RGBF = re.compile(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])')
ANYC = re.compile(r'#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+')


def _rb(repo):
    """scripts/recolor-burj.py, the role engine of the opt-in colours (imported, not copied: one engine for all)."""
    sp = importlib.util.spec_from_file_location('rb', os.path.join(repo, 'scripts', 'recolor-burj.py'))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m


# ---------- the watch page: from the Build green ----------

def _hexs(r, g, b):
    return '#%02x%02x%02x' % (r, g, b)


def make_rot(pal):
    """pal = colors.watch of a funnel: bright [hue, sat x, light +], dark [hue, sat x], map {build colour: new colour}.
    Same as rot() of make-plane-ry.py (light + capped at .97 only when it adds light) and make-stadium-ry.py."""
    bh, bs, bl = pal['bright']
    dh, ds = pal['dark']

    def rot(r, g, b):
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.25 <= h <= 0.47 and s > 0.15:       # the greens of the Build page
            if l < 0.3:
                hh, sx, lp = dh, ds, 0
            else:
                hh, sx, lp = bh, bs, bl
            r2, g2, b2 = colorsys.hls_to_rgb(hh, min(0.97, l + lp) if lp else l, min(1, s * sx))
            return int(r2 * 255), int(g2 * 255), int(b2 * 255)
        return r, g, b
    return rot


def watch(text, pal):
    """The Build page (green) in the colours of a funnel."""
    if not pal:                                  # the Build itself: nothing moves
        return text
    rot = make_rot(pal)
    special = {k.lower(): v for k, v in (pal.get('map') or {}).items()}

    def hexsub(m):
        x = m.group(1)
        a = m.group(2) or ''
        if x.lower() in special:
            return special[x.lower()] + a
        return _hexs(*rot(int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16))) + a
    text = HEX.sub(hexsub, text)
    return RGBF.sub(lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + rot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), text)


def watch_back_to_build(text, build_text, pal):
    """The page of another funnel (made from the Build) back in the Build green, so that it can be moved to the new colour:
    every colour that watch(build colour, pal) gives is turned back into that build colour. Colours that the Build page
    never had (added by hand on that funnel) stay as they are and are listed for the report."""
    if not pal:
        return text, []
    inv = {}
    for c in set(m.group(0)[:7].lower() for m in HEX.finditer(build_text)):
        inv.setdefault(watch(c, pal).lower(), c)
    for m in RGBF.finditer(build_text):
        c = _hexs(int(m.group(2)), int(m.group(3)), int(m.group(4)))
        inv.setdefault(watch(c, pal).lower(), c)
    kept = set()

    def hexsub(m):
        x = m.group(1).lower()
        if x in inv:
            return inv[x] + (m.group(2) or '')
        kept.add(x)
        return m.group(0)

    def rgbsub(m):
        x = _hexs(int(m.group(2)), int(m.group(3)), int(m.group(4)))
        if x in inv:
            y = inv[x]
            return '%s(%d,%d,%d%s' % (m.group(1), int(y[1:3], 16), int(y[3:5], 16), int(y[5:7], 16), m.group(5))
        return m.group(0)
    text = HEX.sub(hexsub, text)
    text = RGBF.sub(rgbsub, text)
    # only report colours in the funnel's own hue that did not go back (the yellow Black Friday etc. are not the funnel's)
    return text, sorted(kept)


# ---------- the opt-in: the Omnya blue moved by role ----------

def optin_css(repo, P, cls, bg, base_css):
    """src/styles/optin-<cls>.css: every rule of optin.css that carries a blue, recoloured and scoped to .oi--<cls>."""
    rb = _rb(repo)
    return [rb.scoped(base_css, P, cls),
            f".oi-fade.oi-fade--{cls}{{background:radial-gradient(120% 90% at 50% 35%,{rb.move('#163266', P)} 0%,{rb.move('#0b1630', P)} 45%,{bg} 100%)}}"]


def optin_page_style(repo, style, uncolor, P, bg):
    """The <style> of the opt-in page: the colours of the funnel it is copied from back to the Omnya blue (uncolor pairs,
    the same as recolor-plane.py did for the stadium red), then moved by role into the new palette."""
    for a, b in uncolor or []:
        style = style.replace(a, b)
    return _rb(repo).recolor(style, P).replace('#05070a', bg)


# ---------- the thanks page: from the Riyadh violet ----------

def thanks(block, hue, main):
    """The Riyadh violet block of views/Thanks.astro in the colour of a funnel (vrecolor of make-plane-ry.py)."""
    def vrot(r, g, b):
        h, l, s_ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.62 <= h <= 0.90 and s_ > 0.12:
            r2, g2, b2 = colorsys.hls_to_rgb(hue, l * 0.95, min(1, s_))
            return int(r2 * 255), int(g2 * 255), int(b2 * 255)
        return r, g, b
    t = block.replace('#9d5cff', main)
    t = HEX.sub(lambda m: _hexs(*vrot(int(m.group(1)[1:3], 16), int(m.group(1)[3:5], 16), int(m.group(1)[5:7], 16))) + (m.group(2) or ''), t)
    t = RGBF.sub(lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + vrot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)
    return t.replace('#9d5cff', main)
