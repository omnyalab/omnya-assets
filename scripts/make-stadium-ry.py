# 18/11/2026 (Nico: P1 G1 D1 R1, C1 red, the skill at €14.99 like the Build one, the Full €5.99 starts chosen: "Hormozi
# says you always have to be honest"): the Stadium funnel in the format of the Build/Riyadh ones. The watch page is made
# from the Build page (src/pages/the-build-blueprint/watch.astro, made by scripts/make-build-ry.py), recoloured from the
# Build green to the red of the stadium seats (#ff3b30), with the words, pictures, products and links of the stadium.
# Usage (repo root): python3 scripts/make-stadium-ry.py      (run make-build-ry.py first if the Build page changed)
import re, colorsys

RED = 0.995                    # hue of #ff3b30
def rot(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if 0.25 <= h <= 0.47 and s > 0.15:       # the greens of the Build page
        r2, g2, b2 = colorsys.hls_to_rgb(RED, l, min(1, s)); return int(r2 * 255), int(g2 * 255), int(b2 * 255)
    return r, g, b
def hexsub(m):
    x = m.group(1); a = m.group(2) or ''
    if x.lower() == '#d4ff5a': return '#ffb066' + a          # the lime of the Build gradients becomes a warm orange
    return '#%02x%02x%02x' % rot(int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16)) + a
def recolor(t):
    t = re.sub(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b', hexsub, t)
    return re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])', lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + rot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)

def sub(s, a, b, n=None):
    if a not in s: raise SystemExit(f'not found: {a[:90]}')
    if n is not None and s.count(a) != n: raise SystemExit(f'expected {n} of: {a[:90]}, found {s.count(a)}')
    return s.replace(a, b)

w = open('src/pages/the-build-blueprint/watch.astro').read()
w = re.sub(r'^---\n.*?\n---', '''---
// the-stadium-blueprint/watch (18/11, Nico: the Build/Riyadh format for the Stadium funnel, in red): the free Stadium
// Blueprint as step 1 (no email, NO_MAIL), the face video with the stadium, our 1M views reel, then the Full Stadium Guide
// with the real Stripe Checkout inside the page (api/embed-checkout.js). Launch price for everyone until Sunday 22/11 23:59.
// Made by scripts/make-stadium-ry.py from the Build page: change the words there, not here.
---''', w, count=1, flags=re.S)
B = '/learn/bd_book_tight.webp'
for a, b in [
  ('omnya-lab-build-blueprint.pdf', 'omnya-lab-stadium-blueprint.pdf'),
  ('/learn/bd_cover_book.webp', '/learn/sd_cover_book.webp'),
  ('The Build Blueprint · PDF', 'The Stadium Blueprint · PDF'),
  ('Step 2: see how the free blueprint becomes a <u class="hb2">€1,990</u> client', 'Step 2: see how we sell it to teams for <u class="hb2">$50,000</u>'),
  ('vsl_build.mp4?v=1', 'vsl_stadium.mp4?v=1'),
  ('<b class="hb">Stop selling renders</b>clients pay for this now', '<b class="hb">1M views</b>in less than 24 hours'),
  ('r_house2.mp4', 'r_stadio.mp4'), ('p_house2.jpg', 'p_stadio.jpg'), ('</svg>Our reel</span>', '</svg>1M views</span>'),
  ('Comment “BUILD” and I’ll send you the free guide…', 'Comment “TICKET” and I’ll send you the free guide…'),
  ('the same house for your clients', 'the same stadium for your clients'),
  (f'<div class="bk"><img src="{B}" alt="The Full Build Guide">', '<div class="bk"><img src="/learn/sd_book_tight.webp" alt="The Full Stadium Guide">'),
  (f'<span class="duo"><img class="a" src="{B}" alt="">', '<span class="duo"><img class="a" src="/learn/sd_book_tight.webp" alt="">'),
  (f'<span class="ck">✓</span><img src="{B}" alt=""><span><b>The Full Guide</b>', '<span class="ck">✓</span><img src="/learn/sd_book_tight.webp" alt=""><span><b>The Full Guide</b>'),
  ('/learn/bd_3d_04.webp', '/learn/sd_scene_preview.webp'),
  ('<li>Every prompt for the nine build phases, word for word</li><li>The 3D house code</li><li>The hold to build page</li><li>The clips between the phases</li><li>How we hand it to a client</li><li>What to charge for it</li>',
   '<li>The 3D stadium code, every seat in it</li><li>Pick a stand, a block, then your seat</li><li>Every photo prompt, view by view</li><li>The clip prompts that fly you down</li><li>The ticket with the view from your seat</li><li>What to charge a club for it</li>'),
  ('<li>Everything in the Full Guide</li><li>The Claude skill that builds the house page for you</li><li>Drop in your photos, it writes the code</li><li>The hold to build page, ready to run</li><li>Your own phases in one file</li><li>Ready to show a client</li>',
   '<li>Everything in the Full Guide</li><li>The Claude skill that builds the stadium for you</li><li>Your club, colours and prices in one file</li><li>Every seat with the view from it</li><li>How we made this video viral</li><li>Ready to show a club</li>'),
  ('that builds the house page for you, ready to use', 'that builds this for you + how we made this video viral'),
  ('omnya_bd_first', 'omnya_sd_first'),
  # the products of the stadium: the Full (€5.99, from Monday €9.99) and the Stadium Builder skill + Full (€14.99, from Monday €19.99)
  ("'full': 'https://buy.stripe.com/5kQ3cuacR3bW2dwgGV8so0D'", "'full': 'https://buy.stripe.com/28EaEW3Ot7scdWeeyN8so0M'"),
  ("'skill': 'https://buy.stripe.com/8x2fZg84J3bW4lEgGV8so0Z'", "'skill': 'https://buy.stripe.com/8x2fZg84J13O2dw3U98so11'"),
  ("LINK.full = 'https://buy.stripe.com/6oUdR83Ot3bW9FY4Yd8so0V'", "LINK.full = 'https://buy.stripe.com/00w4gyckZfYI8BU76l8so13'"),
  ("LINK.skill = 'https://buy.stripe.com/3cI28q2Kp9Ak6tMfCR8so10'", "LINK.skill = 'https://buy.stripe.com/4gMcN44SxdQA5pI3U98so12'"),
  ("PID.full = 'full-build-9'", "PID.full = 'full-stadium-9'"), ("PID.skill = 'skill-build-19'", "PID.skill = 'skill-stadium-19'"),
  ("'full': 'full-build'", "'full': 'full-stadium'"), ("'skill': 'skill-build'", "'skill': 'skill-stadium-14'"),
]:
    w = sub(w, a, b)
w = recolor(w)
left = [m.start() for m in re.finditer(r'(?i)house|hold to build|full-build|skill-build|bd_cover', w)]
if left: print('note: Build words left at', [w[i - 20:i + 30] for i in left[:5]])
open('src/pages/the-stadium-blueprint/watch.astro', 'w').write(w)
print('ok watch')

# ---------- the thanks page colours (board R1): the Riyadh violet block of views/Thanks.astro in the stadium red, only on
# /learn/thanks/full-stadium. is:inline on purpose: a global style in a component goes into the CSS of every thanks page.
def vrot(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if 0.62 <= h <= 0.90 and s > 0.12:
        r2, g2, b2 = colorsys.hls_to_rgb(RED, l * 0.95, min(1, s)); return int(r2 * 255), int(g2 * 255), int(b2 * 255)
    return r, g, b
def vrecolor(t):
    t = re.sub(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b', lambda m: ('#%02x%02x%02x' % vrot(int(m.group(1)[1:3], 16), int(m.group(1)[3:5], 16), int(m.group(1)[5:7], 16))) + (m.group(2) or ''), t)
    return re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])', lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + vrot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)
t = open('src/views/Thanks.astro').read()
a = t.index("{Astro.props.id === 'full-riyadh' && (\n<style is:global>"); a = t.index('<style is:global>', a) + len('<style is:global>')
b = t.index('</style>', a)
block = vrecolor(t[a:b].replace('#9d5cff', '#ff3b30')).replace('Riyadh guide', 'Stadium guide').replace('violet night', 'stadium red').replace('#9d5cff', '#ff3b30')
open('src/components/StadiumThanksColors.astro', 'w').write('''---
// 18/11 (Nico, board R1 + C1): the Stadium thanks page (/learn/thanks/full-stadium) in the red of its funnel.
// Made by scripts/make-stadium-ry.py from the Riyadh violet block of views/Thanks.astro. is:inline: only on that page.
---
<style is:inline>''' + block + '\n</style>\n')
print('ok thanks colours')
