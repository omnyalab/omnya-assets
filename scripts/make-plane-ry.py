# 18/11/2026 (Nico): the Plane funnel (the flight booking reels, word PLANE on Instant DM) in the Build/Riyadh format,
# copied from the Stadium one (scripts/make-stadium-ry.py): the watch page is made from the Build page
# (src/pages/the-build-blueprint/watch.astro), recoloured from the Build green to the colours of the plane, with the words,
# pictures, products and links of the plane.
# Usage (repo root): python3 scripts/make-plane-ry.py [palette] [out] [hook] [title] [cover prefix]
#   palette: sky (sky blue + cloud white) | gold (champagne of The Residence) | night (night blue + the orange of the classes)
import re, colorsys, sys

PAL = {
  # bright: (hue, sat x, light +), dark: (hue, sat x), lime of the Build gradients
  'sky':   dict(b=(0.555, 1.0, 0.03), d=(0.58, 1.0), lime='#d9f1ff'),
  'gold':  dict(b=(0.115, 0.55, 0.05), d=(0.10, 0.45), lime='#fff0c8'),
  'night': dict(b=(0.075, 1.0, 0.0), d=(0.62, 1.15), lime='#ffc37a'),
}
pal = sys.argv[1] if len(sys.argv) > 1 else 'sky'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/pages/the-plane-blueprint/watch.astro'
HOOK = sys.argv[3] if len(sys.argv) > 3 else 'G1'
# the Stripe links of the plane (18/11, created from Nico's Chrome): Full €5.99 / Kit €14.99, and from Monday €9.99 / €19.99
# prod_VeVeI4G7W68ojp price_1UdCdPATIF7pxfqfXgy7kpAj · prod_VeVfllW3fiwvGq price_1UdCePATIF7pxfqfeNtWSkX1 · prod_VeVgfL013AsZV5 price_1UdCfWATIF7pxfqfGqJ241Bn · prod_VeVh5vcebmiJU4 price_1UdCgEATIF7pxfqfby6001RM
L_FULL, L_KIT, L_FULL9, L_KIT19 = 'https://buy.stripe.com/14AaEWgBfdQAg4maix8so14', 'https://buy.stripe.com/cNi4gyacReUE4lEfCR8so15', 'https://buy.stripe.com/dRm00i5WBdQA9FY0HX8so16', 'https://buy.stripe.com/6oUdR83OtcMw3hAeyN8so17'
TITLE = sys.argv[4] if len(sys.argv) > 4 else 'T1'
CV = sys.argv[5] if len(sys.argv) > 5 else 'pl'
P = PAL[pal]
def rot(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if 0.25 <= h <= 0.47 and s > 0.15:       # the greens of the Build page
        if l < 0.3: hh, sx, lp = P['d'][0], P['d'][1], 0
        else: hh, sx, lp = P['b']
        r2, g2, b2 = colorsys.hls_to_rgb(hh, min(0.97, l + lp), min(1, s * sx)); return int(r2 * 255), int(g2 * 255), int(b2 * 255)
    return r, g, b
def hexsub(m):
    x = m.group(1); a = m.group(2) or ''
    if x.lower() == '#d4ff5a': return P['lime'] + a
    return '#%02x%02x%02x' % rot(int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16)) + a
def recolor(t):
    t = re.sub(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b', hexsub, t)
    return re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])', lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + rot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)

def sub(s, a, b, n=None):
    if a not in s: raise SystemExit(f'not found: {a[:90]}')
    if n is not None and s.count(a) != n: raise SystemExit(f'expected {n} of: {a[:90]}, found {s.count(a)}')
    return s.replace(a, b)

HOOKS = {
  'G1': '<b class="hb">Stop selling renders</b>airlines pay for this now',
  'G2': '<b class="hb">The future</b>of booking a flight',
  'G3': '<b class="hb">Pick your seat</b>above the clouds',
}
TITLES = {
  'T1': 'Step 2: see how we built a <u class="hb2">$100,000</u> booking site with Claude',
  'T2': 'Step 2: see how to sell this to an <u class="hb2">airline</u>',
  'T3': 'Step 2: see how one page lets you pick your seat <u class="hb2">above the clouds</u>',
}
w = open('src/pages/the-build-blueprint/watch.astro').read()
w = re.sub(r'^---\n.*?\n---', '''---
// the-plane-blueprint/watch (18/11, Nico: the Build/Riyadh format for the Plane funnel): the free Plane Blueprint as
// step 1 (no email, NO_MAIL), the face video with the plane, our reel, then the Full Plane Guide with the real Stripe
// Checkout inside the page (api/embed-checkout.js). Launch price for everyone until Sunday 22/11 23:59.
// Made by scripts/make-plane-ry.py from the Build page: change the words there, not here.
---''', w, count=1, flags=re.S)
B = '/learn/bd_book_tight.webp'
BK = f'/learn/{CV}_book_tight.webp'
for a, b in [
  ('omnya-lab-build-blueprint.pdf', 'omnya-lab-plane-blueprint.pdf'),
  ('/learn/bd_cover_book.webp', f'/learn/{CV}_cover_book.webp'),
  ('The Build Blueprint · PDF', 'The Plane Blueprint · PDF'),
  ('Step 2: see how the free blueprint becomes a <u class="hb2">€1,990</u> client', TITLES[TITLE]),
  ('vsl_build.mp4?v=1', 'vsl_plane.mp4?v=1'),
  ('<b class="hb">Stop selling renders</b>clients pay for this now', HOOKS[HOOK]),
  ('r_house2.mp4', 'r_plane.mp4'), ('p_house2.jpg', 'p_plane.jpg'),
  ('Comment “BUILD” and I’ll send you the free guide…', 'Comment “PLANE” and I’ll send you the free guide…'),
  ('the same house for your clients', 'the same booking site for your clients'),
  (f'<div class="bk"><img src="{B}" alt="The Full Build Guide">', f'<div class="bk"><img src="{BK}" alt="The Full Plane Guide">'),
  (f'<span class="duo"><img class="a" src="{B}" alt="">', f'<span class="duo"><img class="a" src="{BK}" alt="">'),
  (f'<span class="ck">✓</span><img src="{B}" alt=""><span><b>The Full Guide</b>', f'<span class="ck">✓</span><img src="{BK}" alt=""><span><b>The Full Guide</b>'),
  ('/learn/bd_3d_04.webp', '/learn/pl_scene_preview.webp'),
  ('<li>Every prompt for the nine build phases, word for word</li><li>The 3D house code</li><li>The hold to build page</li><li>The clips between the phases</li><li>How we hand it to a client</li><li>What to charge for it</li>',
   '<li>The 3D plane code, all 334 seats</li><li>Pick a class, then your seat</li><li>The window view from every seat</li><li>Every photo prompt, view by view</li><li>The clip prompts, from the clouds to the suite</li><li>What to charge an airline for it</li>'),
  ('<li>Everything in the Full Guide</li><li>The Claude skill that builds the house page for you</li><li>Drop in your photos, it writes the code</li><li>The hold to build page, ready to run</li><li>Your own phases in one file</li><li>Ready to show a client</li>',
   '<li>Everything in the Full Guide</li><li>The 3D plane where you pick any seat</li><li>Every seat clickable, with its view</li><li>The real clips and photos inside</li><li>Your flight, classes and prices in one file</li><li>Ready to show an airline</li>'),
  ('The guide + the <strong class="sk">skill</strong> that builds the house page for you, ready to use', 'The guide + the <strong class="sk">3D plane</strong> where you pick any seat, ready to run'),
  ('+ Claude Skill', '+ 3D Plane'),
  ('omnya_bd_first', 'omnya_pl_first'),
  # the products of the plane: the Full (€5.99, from Monday €9.99) and the 3D Plane kit + Full (€14.99, from Monday €19.99)
  ("'full': 'https://buy.stripe.com/5kQ3cuacR3bW2dwgGV8so0D'", f"'full': '{L_FULL}'"),
  ("'skill': 'https://buy.stripe.com/8x2fZg84J3bW4lEgGV8so0Z'", f"'skill': '{L_KIT}'"),
  ("LINK.full = 'https://buy.stripe.com/6oUdR83Ot3bW9FY4Yd8so0V'", f"LINK.full = '{L_FULL9}'"),
  ("LINK.skill = 'https://buy.stripe.com/3cI28q2Kp9Ak6tMfCR8so10'", f"LINK.skill = '{L_KIT19}'"),
  ("PID.full = 'full-build-9'", "PID.full = 'full-plane-9'"), ("PID.skill = 'skill-build-19'", "PID.skill = 'kit-plane-19'"),
  ("'full': 'full-build'", "'full': 'full-plane'"), ("'skill': 'skill-build'", "'skill': 'kit-plane'"),
]:
    w = sub(w, a, b)
w = w.replace('Full Guide + Claude Skill', 'Full Guide + 3D Plane').replace('the skill that builds', 'the 3D plane that')
w = recolor(w)
# 18/11 (Nico): the page is sky blue, so the free guide card is green
a = w.index('/* 18/11 (Nico): the page is all green, so the free guide card has its own colour (f1) */'); b = w.index('</style>', a)
blk = w[a:b].replace('the page is all green, so the free guide card has its own colour (f1)', 'the page is sky blue, so the free guide card is green (Nico, plane funnel)')
blk = blk.replace('rgb(41 151 255', 'rgb(34 211 94').replace('#9fd0ff', '#a6f3c0').replace('#2997ff,#5ab8ff', '#1fc458,#3ddc74').replace('#2997ff', '#22d35e')
w = w[:a] + blk + w[b:]
left = [m.start() for m in re.finditer(r'(?i)house|hold to build|bd_cover|Claude Skill', w)]
if left: print('note: Build words left at', [w[i - 30:i + 30] for i in left[:8]])
import os; os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(w)
print('ok watch', pal, OUT)

# ---------- the thanks page colours: the Riyadh violet block of views/Thanks.astro in the plane sky blue, only on
# /learn/thanks/full-plane. is:inline on purpose: a global style in a component goes into the CSS of every thanks page.
if OUT == 'src/pages/the-plane-blueprint/watch.astro':
    SKY = 0.555
    def vrot(r, g, b):
        h, l, s_ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.62 <= h <= 0.90 and s_ > 0.12:
            r2, g2, b2 = colorsys.hls_to_rgb(SKY, l * 0.95, min(1, s_)); return int(r2 * 255), int(g2 * 255), int(b2 * 255)
        return r, g, b
    def vrecolor(t):
        t = re.sub(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b', lambda m: ('#%02x%02x%02x' % vrot(int(m.group(1)[1:3], 16), int(m.group(1)[3:5], 16), int(m.group(1)[5:7], 16))) + (m.group(2) or ''), t)
        return re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])', lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + vrot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)
    t = open('src/views/Thanks.astro').read()
    a = t.index("{Astro.props.id === 'full-riyadh' && (\n<style is:global>"); a = t.index('<style is:global>', a) + len('<style is:global>')
    b = t.index('</style>', a)
    block = vrecolor(t[a:b].replace('#9d5cff', '#38b6ff')).replace('Riyadh guide', 'Plane guide').replace('violet night', 'plane sky blue').replace('#9d5cff', '#38b6ff')
    open('src/components/PlaneThanksColors.astro', 'w').write("""---
// 18/11 (Nico): the Plane thanks page (/learn/thanks/full-plane) in the sky blue of its funnel.
// Made by scripts/make-plane-ry.py from the Riyadh violet block of views/Thanks.astro. is:inline: only on that page.
---
<style is:inline>""" + block + '\n</style>\n')
    print('ok thanks colours')
