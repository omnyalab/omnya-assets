# 18/11/2026 (Nico: "confermo tutto"): the Build funnel (the house that builds itself, word BUILD) in the Riyadh format,
# the one Nico calls the standard for every funnel (memory omnya-funnel-format-riyadh). The watch page is the Riyadh one
# that is live, recoloured from the Ballur violet to the Build green (#22d35e) and with the words, pictures and products
# of the house. Board choices: G1 hook, T1 title, K2 (the skill row stays hidden until the Build skill exists: KIT=False),
# D1 launch price until Sunday 22/11 23:59 then €9.99, M1 no email for the free PDF, R1 green thanks page.
# Usage (repo root): python3 scripts/make-build-ry.py [f1|f2|f3|f4]   (f = colour of the free guide card, Nico's choice)
import sys, re, colorsys
FC = (sys.argv + ['f1'])[1]
KIT = True   # 18/11: the House Builder skill exists (private/learn/en/house-builder-skill.zip)
LINK_FULL = 'https://buy.stripe.com/5kQ3cuacR3bW2dwgGV8so0D'      # The Full Build Blueprint €5.99 (full-build)
LINK_FULL9 = 'https://buy.stripe.com/6oUdR83Ot3bW9FY4Yd8so0V'     # €9.99 from Monday 23/11 (full-build-9), prod_VeP1v5W4TvpNi7
END = '2026-11-22T23:59:59+01:00'
LINK_SKILL = 'https://buy.stripe.com/8x2fZg84J3bW4lEgGV8so0Z'    # House Builder Skill + The Full Build Blueprint €14.99 (skill-build)
LINK_SKILL19 = 'https://buy.stripe.com/3cI28q2Kp9Ak6tMfCR8so10'  # the same from Monday 23/11, €19.99 (skill-build-19)

EX = {'#9d5cff': '#22d35e', '#7c5cff': '#1fc458', '#c08cff': '#7be8a0', '#6b3be0': '#13a544', '#372b50': '#24402e', '#140d22': '#0a160e',
      '#130b24': '#08130c', '#948ba5': '#8b93a5', '#d3c7ea': '#cde9d6', '#b3a9c6': '#9aa3b2', '#a29ab2': '#9aa3b2', '#ffb066': '#d4ff5a',
      '#1f0c44': '#0c2c16', '#311666': '#0f3d1f', '#170b30': '#0a2413', '#0b0714': '#06100a', '#b48cff': '#7be8a0', '#2a2240': '#1f3326',
      '#b6a9d4': '#a9c7b4', '#9a8fb8': '#8fb39b', '#cfc4e6': '#c4e6cf', '#2a1650': '#123a20', '#0f0d12': '#0d120f', '#17141d': '#141a16'}
GH = 142 / 360
def rot(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if 0.62 <= h <= 0.90 and s > 0.12:
        r2, g2, b2 = colorsys.hls_to_rgb(GH, l * 0.92, min(1, s)); return int(r2 * 255), int(g2 * 255), int(b2 * 255)
    return r, g, b
def hexsub(m):
    x = m.group(1).lower(); a = m.group(2) or ''
    if x in EX: return EX[x] + a
    return '#%02x%02x%02x' % rot(int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16)) + a
def recolor(t):
    t = re.sub(r'(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b', hexsub, t)
    t = re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*[,)])', lambda m: '%s(%d,%d,%d%s' % ((m.group(1),) + rot(int(m.group(2)), int(m.group(3)), int(m.group(4))) + (m.group(5),)), t)
    return re.sub(r'(--fc:)(\d+) (\d+) (\d+)', lambda m: m.group(1) + '%d %d %d' % rot(int(m.group(2)), int(m.group(3)), int(m.group(4))), t)

def sub(s, a, b):
    if a not in s: raise SystemExit(f'not found: {a[:90]}')
    return s.replace(a, b)

w = open('src/pages/the-riyadh-blueprint/watch.astro').read()
w = re.sub(r'^---\n.*?\n---', '''---
// the-build-blueprint/watch (18/11, Nico: the Riyadh format for the Build funnel): the free Build Blueprint as step 1
// (no email, NO_MAIL), the face video with the house, our reel of the house, then the Full Build Guide with the real
// Stripe Checkout inside the page (api/embed-checkout.js). Launch price for everyone until Sunday 22/11 23:59.
// Made by scripts/make-build-ry.py from the Riyadh page: change the words there, not here.
---''', w, count=1, flags=re.S)
for a, b in [
  ('omnya-lab-riyadh-blueprint.pdf', 'omnya-lab-build-blueprint.pdf'),
  ('/learn/ry_cover_book.webp', '/learn/bd_cover_book.webp'),
  ('The Riyadh Blueprint · PDF', 'The Build Blueprint · PDF'),
  ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too', 'Step 2: see how the free blueprint becomes a <u class="hb2">€1,990</u> client'),
  ('vsl_riyadh.mp4?v=1', 'vsl_build.mp4?v=1'), ('vsl_poster_riyadh.jpg', 'vsl_poster.jpg'),
  ('developers pay for this now', 'clients pay for this now'),
  ('r_riyadh.mp4?v=2', 'r_house2.mp4'), ('</svg>New reel</span>', '</svg>Our reel</span>'), ('p_riyadh.jpg', 'p_house2.jpg'),
  ('Comment “3D” and I’ll send you the free guide…', 'Comment “BUILD” and I’ll send you the free guide…'),
  ('the same tower for your clients', 'the same house for your clients'),
  ('/learn/ry_book_tight.webp', '/learn/bd_book_tight.webp'), ('The Full Riyadh Guide', 'The Full Build Guide'),
  ('<li>The 3D tower code in three.js</li><li>Every photo prompt, night to sunset</li><li>The clip prompts that fly you inside</li><li>How the remote and the slider work</li><li>Every step, from the 3D to the client</li><li>What to charge a developer for it</li>',
   '<li>Every prompt for the nine build phases, word for word</li><li>The 3D house code</li><li>The hold to build page</li><li>The clips between the phases</li><li>How we hand it to a client</li><li>What to charge for it</li>'),
  ('<div class="t">The Full Guide <i class="hb2">+ Remote Kit</i></div>', '<div class="t">The Full Guide <i class="hb2">+ Claude Skill</i></div>'),
  ('<li>Everything in the Full Guide</li><li>The remote code, ready to run</li><li>The big-screen page of the tower</li><li>Phone and screen on the same Wi-Fi</li><li>Your own clips in one file</li><li>Ready to show a developer</li>',
   '<li>Everything in the Full Guide</li><li>The Claude skill that builds the house page for you</li><li>Drop in your photos, it writes the code</li><li>The hold to build page, ready to run</li><li>Your own phases in one file</li><li>Ready to show a client</li>'),
  ('/learn/ry_scene_preview.webp', '/learn/bd_3d_04.webp'),
  ('<b>Full Guide + Remote Kit<em>NEW</em></b>', '<b>Full Guide + Claude Skill<em>NEW</em></b>'),
  ('that drives the tower from your phone, ready to use', 'that builds the house page for you, ready to use'),
  ('the <strong class="sk">remote</strong>', 'the <strong class="sk">skill</strong>'),
  ("'Guide + Remote Kit'", "'Guide + Claude Skill'"),
  ('2026-11-19T23:59:59+01:00', END), ('from Friday €9.99', 'from Monday €9.99'),
  ("omnya_ry_first", "omnya_bd_first"),
  ("'full': 'https://buy.stripe.com/4gM00i3Ot9AkdWeduJ8so0R'", f"'full': '{LINK_FULL}'"),
  ("'full': 'full-riyadh'", "'full': 'full-build'"),
  ("LINK.full = 'https://buy.stripe.com/28EbJ0dp3bIs6tMbmB8so0U'", f"LINK.full = '{LINK_FULL9}'"),
  ("PID.full = 'full-riyadh-9'", "PID.full = 'full-build-9'"),
  # the skill row: the House Builder skill + the Full Build Blueprint (18/11)
  ("'skill': 'https://buy.stripe.com/dRmaEWckZ6o83hA76l8so0S'", f"'skill': '{LINK_SKILL}'"), ("'skill': 'kit-riyadh'", "'skill': 'skill-build'"),
  ("LINK.skill = 'https://buy.stripe.com/aFa4gy98NcMwaK2duJ8so0T'", f"LINK.skill = '{LINK_SKILL19}'"), ("PID.skill = 'kit-riyadh-19'", "PID.skill = 'skill-build-19'"),
]:
    w = sub(w, a, b)
if 'remote' in w.lower().replace('remote kit', '') and 'Remote' in w:
    print('note: "remote" still in the page:', [m.start() for m in re.finditer('emote', w)][:5])
w = recolor(w)

# the free guide card in its own colour, so it stands out from the green page (18/11, Nico)
FREE = {
  'f1': ('#2997ff', '#5ab8ff', '#ffffff', '#9fd0ff', '41 151 255'),   # Omnya blue
  'f2': ('#ffd60a', '#ffb000', '#111111', '#ffe27a', '255 214 10'),   # yellow
  'f3': ('#ffffff', '#e9eef0', '#0a160e', '#ffffff', '255 255 255'),  # white
  'f4': ('#9d5cff', '#c08cff', '#ffffff', '#cdb2ff', '157 92 255'),   # Riyadh violet
}[FC]
c1, c2, ink, lab, rgb = FREE
css = f'''
/* 18/11 (Nico): the page is all green, so the free guide card has its own colour ({FC}) */
.fg{{background:linear-gradient(180deg,rgb({rgb} / .14),rgb({rgb} / .04))!important;border-color:rgb({rgb} / .7)!important;box-shadow:0 16px 40px -20px rgb({rgb} / .8)!important}}
.fg::before{{background:radial-gradient(80% 120% at 0% 0%,rgb({rgb} / .22),transparent 60%)!important}}
.fg img{{box-shadow:6px 8px 0 #0008,0 0 30px rgb({rgb} / .35)!important}}
.fgt small{{color:{lab}!important}}
.fgd{{background:linear-gradient(90deg,{c1},{c2})!important;color:{ink}!important;box-shadow:0 10px 24px -10px {c1}!important}}
.fg:focus-visible{{outline-color:{c1}!important}}
'''
if not KIT: css += '/* the Build skill is not ready yet: only the Full Guide is on sale (K2 comes back with KIT = True) */\n.opt-sk,.p-kit{display:none!important}\n'
w = w.replace('</style></head><body>', css + '</style></head><body>', 1)
open('src/pages/the-build-blueprint/watch.astro', 'w').write(w)
print('ok', FC, 'kit' if KIT else 'no kit')

# ---------- the thanks page colours (board R1): the Riyadh violet block of views/Thanks.astro and the style of
# components/RiyadhFuture.astro, recoloured to the Build green, only on /learn/thanks/full-build ----------
t = open('src/views/Thanks.astro').read()
a = t.index("{Astro.props.id === 'full-riyadh' && (\n<style is:global>") ; a = t.index('<style is:global>', a) + len('<style is:global>')
b = t.index('</style>', a)
block = recolor(t[a:b]).replace('Riyadh guide', 'Build guide').replace('violet night', 'green night')
f = open('src/components/RiyadhFuture.astro').read()
fa = f.index('<style is:global>') + len('<style is:global>'); fb = f.index('</style>', fa)
rules = []
for r in re.findall(r'([^{}]+)\{([^{}]*)\}', f[fa:fb]):
    sel = ','.join("html[data-page='thanks'] " + s.strip() for s in r[0].split(','))
    rules.append(f'{sel}{{{recolor(r[1])}}}')
open('src/components/BuildThanksColors.astro', 'w').write('''---
// 18/11 (Nico, board R1): the Build thanks page (/learn/thanks/full-build) in the colours of its funnel, the Build green.
// Made by scripts/make-build-ry.py from the Riyadh violet block of views/Thanks.astro and components/RiyadhFuture.astro.
---
<style is:global>''' + block + '\n</style>\n')  # 18/11: The 3D Future keeps its own blue, no green rules
print('thanks colours ok')
