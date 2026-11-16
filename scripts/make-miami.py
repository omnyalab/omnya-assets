# The Miami funnel (16/11/2026, reels GTA 6 of 17/11, word GTA) made from the Stadium funnel that is live and selling:
# the same opt-in page and the same watch page, only the words, the pictures, the products and the colours change.
# Usage (repo root): python3 scripts/make-miami.py p1 [out_optin out_watch theme title]
import sys, re, importlib.util
sp = importlib.util.spec_from_file_location('rc', 'scripts/recolor-miami.py'); rc = importlib.util.module_from_spec(sp); sp.loader.exec_module(rc)
PK = sys.argv[1] if len(sys.argv) > 1 else 'p1'; P = rc.PAL[PK]
OUT_O = sys.argv[2] if len(sys.argv) > 2 else 'src/pages/the-miami-blueprint.astro'
OUT_W = sys.argv[3] if len(sys.argv) > 3 else 'src/pages/the-miami-blueprint/watch.astro'
THEME = sys.argv[4] if len(sys.argv) > 4 else 'vc'
TITLE = sys.argv[5] if len(sys.argv) > 5 else 'Step 2: see how we built Miami for <u class="hb2">$2</u>'

def sub(s, a, b, n=1):
    c = s.count(a)
    if c < n: raise SystemExit(f'not found ({c}): {a[:90]}')
    return s.replace(a, b)

# ---------- the opt-in page ----------
o = open('src/pages/the-stadium-blueprint.astro').read()
head, style = o.split('<style is:global>')
head = re.sub(r'^---\n.*?\nimport', '''---
// /the-miami-blueprint (16/11/2026, Nico): the funnel of the GTA 6 reels where Claude builds Miami from the real map
// (word GTA, also MIAMI and VICE), a copy of /the-stadium-blueprint: only the opt-in card over the blurred city at night,
// it never closes, no email (the free PDF is on the next page, NO_MAIL), then /the-miami-blueprint/watch.
// Colours: the night of our own Miami flight (scripts/recolor-miami.py). Images mi_* and PDFs:
// ~/Desktop/Studio Assets/06 Documents/Blueprint/Omnya Miami Blueprint.
import''', head, count=1, flags=re.S)
head = sub(head, 'title="How to build a stadium where you pick your own seat"', 'title="How to build Miami from the real map with Claude"')
head = sub(head, 'description="Steal our stadium method: the free blueprint in five steps, and the Full Stadium Blueprint with every prompt, the 3D stadium code and the page where you pick your seat."',
           'description="Steal our Miami method: the free blueprint in five steps, and the Full Miami Blueprint with the real map, every prompt, the 3D city code and the page you build with one click."')
head = re.sub(r'<OptIn [^>]*/>', f'<OptIn slug="the-miami-blueprint" free="free-miami" noMail word="Miami" book noClose fade theme="{THEME}" allset proof="From the team behind a 1M+ views reel" watch="/the-miami-blueprint/watch" cover="/learn/mi_cover_book.webp" hero="/learn/mi_hero.webp" heroMobile="/learn/mi_hero_mobile.webp" />', head)
style = rc.recolor(style, P).replace('#05070a', '#07050f')
open(OUT_O, 'w').write(head + '<style is:global>' + style)

# ---------- the watch page ----------
w = open('src/pages/the-stadium-blueprint/watch.astro').read()
w = re.sub(r'^---\n.*?\n---', '''---
// the-miami-blueprint/watch (16/11, copied from the Stadium one that is live and selling): the free Miami Blueprint as
// step 1 (no email, NO_MAIL), the face video with Miami, the proof of our last viral reel, then the Full Miami Guide with the
// real Stripe Checkout inside the page (api/embed-checkout.js) and the one-tap offer on the thanks page.
// Made by scripts/make-miami.py: change the words there, not here.
---''', w, count=1, flags=re.S)
a = w.index('<style is:global>'); b = w.index('</style></head>')
w = w[:a] + rc.recolor(w[a:b], P) + w[b:]
R = [
  ('href="/learn/free/omnya-lab-stadium-blueprint.pdf" download="omnya-lab-stadium-blueprint.pdf"', 'href="/learn/free/omnya-lab-miami-blueprint.pdf" download="omnya-lab-miami-blueprint.pdf"'),
  ('<img src="/learn/sd_cover_book.webp" alt="" width="44" height="60">', '<img src="/learn/mi_cover_book.webp" alt="" width="44" height="60">'),
  ('<span>The Stadium Blueprint · PDF</span>', '<span>The Miami Blueprint · PDF</span>'),
  ('<h1>Step 2: see how we sell it to teams for <u class="hb2">$50,000</u></h1>', f'<h1>{TITLE}</h1>'),
  ('src="/learn/watch/vsl_stadium.mp4?v=1" poster="/learn/watch/vsl_poster.jpg"', 'src="/learn/watch/vsl_miami.mp4?v=1" poster="/learn/watch/vsl_poster_miami.jpg"'),
  ('<p class="b2h"><b class="hb">1M views</b>in less than 24 hours</p>', '<p class="b2h"><b class="hb">1M views</b>on our last reel, in 24 hours</p>'),
  ('<span class="inc">Every Full guide, the 3 playbooks, the stadium skill and every new guide</span>', '<span class="inc">Every Full guide, Miami too, the 3 playbooks, the skills and every new guide</span>'),
  ('<img src="/learn/sd_book_tight.webp" alt="The Full Stadium Guide">', '<img src="/learn/mi_book_tight.webp" alt="The Full Miami Guide">'),
  ('<ul><li>The 3D stadium code, every seat in it</li><li>Pick a stand, a block, then your seat</li><li>Every photo prompt, view by view</li><li>The clip prompts that fly you down</li><li>The ticket with the view from your seat</li><li>What to charge a club for it</li></ul>',
   '<ul><li>The real map of Miami, street by street</li><li>The 3D city code in three.js</li><li>Every photo prompt, day and night</li><li>The clip prompts that build the city</li><li>The glass panel with the 7 buttons</li><li>What to charge a client for it</li></ul>'),
  ('<li>The Full Stadium and City Guides</li><li>The Stadium Builder skill</li>', '<li>The Full Stadium, City and Miami Guides</li><li>The Claude skills</li>'),
  ('<img class="a" src="/learn/sd_book_tight.webp" alt=""><img class="b" src="/learn/sd_scene_preview.webp" alt="">', '<img class="a" src="/learn/mi_book_tight.webp" alt=""><img class="b" src="/learn/mi_scene_preview.webp" alt="">'),
  ('<label class="opt opt-fu" data-o="full"><span class="ck">✓</span><img src="/learn/sd_book_tight.webp" alt="">', '<label class="opt opt-fu" data-o="full"><span class="ck">✓</span><img src="/learn/mi_book_tight.webp" alt="">'),
  ('<span class="jc"><img src="/learn/sd_book_tight.webp" alt="">', '<span class="jc"><img src="/learn/mi_book_tight.webp" alt="">'),
]
for x, y in R: w = sub(w, x, y)
w = w.replace('<img src="/learn/sd_book_tight.webp" alt=""><img src="/learn/tw_book.webp" alt=""><img src="/learn/pk_pb02.webp" alt=""></span><span class="bh">', '<img src="/learn/mi_book_tight.webp" alt=""><img src="/learn/sd_book_tight.webp" alt=""><img src="/learn/pk_pb02.webp" alt=""></span><span class="bh">')
w = sub(w, "PID = {'full': 'full-stadium', 'all': 'everything', 'bf': 'everything', 'skill': 'skill-stadium'}", "PID = {'full': 'full-miami', 'all': 'everything', 'bf': 'everything', 'skill': 'skill-miami'}")
w = re.sub(r"const LINK = \{'full': '[^']*',", "const LINK = {'full': 'https://buy.stripe.com/00w28qet713O8BUbmB8so0P',", w)
w = re.sub(r"'skill': 'https://buy\.stripe\.com/[^']*'\}", "'skill': 'https://buy.stripe.com/6oU00i0Ch7sc2dw1M18so0Q'}", w)

# 16/11 (Nico, board P1): behind "Get the full guide now" the same Miami colours, brighter, with turquoise instead of the gold
BG = {
  'b1': ("radial-gradient(115% 36% at 50% 12%,#ff3d8bcc,transparent 70%),radial-gradient(85% 34% at 0% 58%,#36ecdeaa,transparent 70%),radial-gradient(75% 32% at 100% 80%,#a24dffaa,transparent 70%),radial-gradient(60% 24% at 30% 96%,#ff9a6e77,transparent 70%),#12061f", "#1a0b24b8", "#ff6fb0aa"),
  'b2': ("radial-gradient(115% 36% at 50% 12%,#36ecdecc,transparent 70%),radial-gradient(85% 34% at 0% 58%,#ff2f9abb,transparent 70%),radial-gradient(75% 32% at 100% 80%,#ff9a6e99,transparent 70%),radial-gradient(60% 24% at 30% 96%,#8b5cff88,transparent 70%),#061420", "#071a26b8", "#36ecdeaa"),
}
OBG = sys.argv[6] if len(sys.argv) > 6 else 'b1'
g, boxbg, boxline = BG[OBG]
w = re.sub(r'(html\.bf \.offer\{background:linear-gradient\(180deg,var\(--bg\) 0,#[0-9a-f]+ 40px,#0000 150px\),linear-gradient\(0deg,var\(--bg\),#0000 140px\),)[^;}]*', lambda m: m.group(1) + g, w, count=1)
w = sub(w, 'html.bf .offer .box{background:#120f07d9;border-color:#ffd60a55}', f'html.bf .offer .box{{background:{boxbg};border-color:{boxline}}}')
left = [m.start() for m in re.finditer(r'stadium|Stadium|sd_', w)]
open(OUT_W, 'w').write(w)
print('ok', OUT_O, OUT_W, 'stadium words left:', len(left))
for i in left: print('  ', w[max(0, i - 70):i + 50].replace('\n', ' '))
