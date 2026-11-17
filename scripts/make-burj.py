# The Riyadh funnel (17/11/2026, Burj Al Ballur reels of 17-19/11, word 3D) made like scripts/make-miami.py from the Stadium
# funnel that is live and selling: the same opt-in page and the same watch page, only the words, the pictures, the products
# and the colours change. Usage (repo root):
#   python3 scripts/make-burj.py <p1|p2|p3> <k1|k2> <t1|t2|t3> [name slug theme out_optin out_watch]
#   k1 = the Full guide alone (€5.99), k2 = the Full guide + the Remote kit (€9.99) as the first choice, like the stadium skill
import sys, re, importlib.util
sp = importlib.util.spec_from_file_location('rc', 'scripts/recolor-burj.py'); rc = importlib.util.module_from_spec(sp); sp.loader.exec_module(rc)
A = sys.argv + [None] * 12
PK = A[1] or 'p1'; P = rc.PAL[PK]
K = A[2] or 'k2'
T = A[3] or 't4'
NAME = A[4] or 'Riyadh'
SLUG = A[5] or 'the-riyadh-blueprint'
THEME = A[6] or 'ry'
OUT_O = A[7] or f'src/pages/{SLUG}.astro'
OUT_W = A[8] or f'src/pages/{SLUG}/watch.astro'
ID = NAME.lower()
IMG = '/learn/ry_'
TITLES = {
  # 17/11 (Nico): "più cattivo", learn to get paid $30K by a developer too
  't4': 'Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
  't1': 'Step 2: see how a Riyadh developer paid us <u class="hb2">$30,000</u> for it',
  't2': 'Step 2: see how we sold this tower for <u class="hb2">$30,000</u>',
  't3': 'Step 2: see how we built a <u class="hb2">$2B</u> tower with Claude',
}
TITLE = TITLES[T]
LINK_FULL = A[9] or 'https://buy.stripe.com/TODO-full'
LINK_KIT = A[10] or 'https://buy.stripe.com/TODO-kit'

def sub(s, a, b):
    if a not in s: raise SystemExit(f'not found: {a[:90]}')
    return s.replace(a, b)

# ---------- the opt-in page ----------
o = open('src/pages/the-stadium-blueprint.astro').read()
head, style = o.split('<style is:global>')
head = re.sub(r'^---\n.*?\nimport', f'''---
// /{SLUG} (17/11/2026, Nico): the funnel of the Burj Al Ballur reels (the tower driven from a phone, the Riyadh $2B
// mega project; word 3D, set by hand on Instant DM), a copy of /the-stadium-blueprint: only the opt-in card over the
// blurred tower at night, it never closes, no email (the free PDF is on the next page, NO_MAIL), then /{SLUG}/watch.
// Colours: the real Burj Al Ballur photos (scripts/recolor-burj.py). Made by scripts/make-burj.py, change the words there.
// Images ry_* and PDFs: ~/Desktop/Studio Assets/06 Documents/Blueprint/Omnya {NAME} Blueprint.
import''', head, count=1, flags=re.S)
head = sub(head, 'title="How to build a stadium where you pick your own seat"', 'title="How to build a Riyadh mega tower you drive from your phone"')
head = sub(head, 'description="Steal our stadium method: the free blueprint in five steps, and the Full Stadium Blueprint with every prompt, the 3D stadium code and the page where you pick your seat."',
           f'description="Steal our {NAME} method: the free blueprint in five steps, and the Full {NAME} Blueprint with every prompt, the 3D tower code and the remote that drives it from your phone."')
head = re.sub(r'<OptIn [^>]*/>', f'<OptIn slug="{SLUG}" free="free-{ID}" noMail word="{NAME}" book noClose fade theme="{THEME}" allset proof="Steal it before your competitors do" watch="/{SLUG}/watch" cover="{IMG}cover_book.webp" hero="{IMG}hero.webp" heroMobile="{IMG}hero_mobile.webp" />', head)
style = rc.recolor(style, P).replace('#05070a', '#06050f')
open(OUT_O, 'w').write(head + '<style is:global>' + style)

# ---------- the watch page ----------
w = open('src/pages/the-stadium-blueprint/watch.astro').read()
w = re.sub(r'^---\n.*?\n---', f'''---
// {SLUG}/watch (17/11, copied from the Stadium one that is live and selling): the free {NAME} Blueprint as step 1
// (no email, NO_MAIL), the face video with the Burj Al Ballur, the proof of our last viral reel, then the Full {NAME} Guide
// with the real Stripe Checkout inside the page (api/embed-checkout.js).
// Made by scripts/make-burj.py: change the words there, not here.
---''', w, count=1, flags=re.S)
a = w.index('<style is:global>'); b = w.index('</style></head>')
w = w[:a] + rc.recolor(w[a:b], P) + w[b:]
R = [
  ('href="/learn/free/omnya-lab-stadium-blueprint.pdf" download="omnya-lab-stadium-blueprint.pdf"', f'href="/learn/free/omnya-lab-{ID}-blueprint.pdf" download="omnya-lab-{ID}-blueprint.pdf"'),
  ('<img src="/learn/sd_cover_book.webp" alt="" width="44" height="60">', f'<img src="{IMG}cover_book.webp" alt="" width="44" height="60">'),
  ('<span>The Stadium Blueprint · PDF</span>', f'<span>The {NAME} Blueprint · PDF</span>'),
  ('<h1>Step 2: see how we sell it to teams for <u class="hb2">$50,000</u></h1>', f'<h1>{TITLE}</h1>'),
  ('src="/learn/watch/vsl_stadium.mp4?v=1" poster="/learn/watch/vsl_poster.jpg"', f'src="/learn/watch/vsl_{ID}.mp4?v=1" poster="/learn/watch/vsl_poster_{ID}.jpg"'),
  ('<p class="b2h"><b class="hb">1M views</b>in less than 24 hours</p>', '<p class="b2h"><b class="hb">1M views</b>on our last reel, in 24 hours</p>'),
  ('<span class="inc">Every Full guide, the 3 playbooks, the Claude skills and every new guide</span>', f'<span class="inc">Every Full guide, {NAME} too, the 3 playbooks, the skills and every new guide</span>'),
  ('<img src="/learn/sd_book_tight.webp" alt="The Full Stadium Guide">', f'<img src="{IMG}book_tight.webp" alt="The Full {NAME} Guide">'),
  ('<ul><li>The 3D stadium code, every seat in it</li><li>Pick a stand, a block, then your seat</li><li>Every photo prompt, view by view</li><li>The clip prompts that fly you down</li><li>The ticket with the view from your seat</li><li>What to charge a club for it</li></ul>',
   '<ul><li>The 3D tower code in three.js</li><li>Every photo prompt, night to sunset</li><li>The clip prompts that fly you inside</li><li>The remote that drives it from a phone</li><li>The sunrise-to-night slider</li><li>What to charge a developer for it</li></ul>'),
  ('<img class="a" src="/learn/sd_book_tight.webp" alt=""><img class="b" src="/learn/sd_scene_preview.webp" alt="">', f'<img class="a" src="{IMG}book_tight.webp" alt=""><img class="b" src="{IMG}scene_preview.webp" alt="">'),
  ('<label class="opt opt-fu" data-o="full"><span class="ck">✓</span><img src="/learn/sd_book_tight.webp" alt="">', f'<label class="opt opt-fu" data-o="full"><span class="ck">✓</span><img src="{IMG}book_tight.webp" alt="">'),
  ('<span class="jc"><img src="/learn/sd_book_tight.webp" alt="">', f'<span class="jc"><img src="{IMG}book_tight.webp" alt="">'),
  ('<p>Comment “TICKET” and I’ll send you the free guide…</p>', '<p>Comment “TICKET” and I’ll send you the free guide…</p>'),
]
for x, y in R: w = sub(w, x, y)
w = w.replace('<img src="/learn/sd_book_tight.webp" alt=""><img src="/learn/tw_book.webp" alt=""><img src="/learn/pk_pb02.webp" alt=""></span><span class="bh">', f'<img src="{IMG}book_tight.webp" alt=""><img src="/learn/sd_book_tight.webp" alt=""><img src="/learn/pk_pb02.webp" alt=""></span><span class="bh">')
w = sub(w, "PID = {'full': 'full-stadium', 'all': 'everything', 'bf': 'everything', 'skill': 'skill-stadium'}", f"PID = {{'full': 'full-{ID}', 'all': 'everything', 'bf': 'everything', 'skill': 'kit-{ID}'}}")
w = re.sub(r"const LINK = \{'full': '[^']*',", f"const LINK = {{'full': '{LINK_FULL}',", w)
w = re.sub(r"'skill': 'https://buy\.stripe\.com/[^']*'\}", f"'skill': '{LINK_KIT}'}}", w)

# the first choice: k2 = the Full guide + the Remote kit (the code of the phone remote and the big-screen page), €9.99,
# in the place of the stadium skill; k1 = no first choice, the Full guide alone and already chosen
SK = re.search(r'<label class="opt opt-sk on" data-o="skill">.*?</label>', w, flags=re.S).group(0)
if K == 'k2':
    nk = re.sub(r'<b>Full Guide \+ Claude Skill(<em>NEW</em>)?</b><small>.*?</small>',
                '<b>Full Guide + Remote Kit<em>NEW</em></b><small>The guide + the <strong class="sk">remote</strong> that drives the tower from your phone, ready to use</small>', SK, flags=re.S)
    w = w.replace(SK, nk)
    # 17/11 (Nico): the kit at €14.99
    nk2 = nk.replace('<strong>€9.99</strong><s>€49.99</s>', '<strong>€14.99</strong><s>€69.99</s>')
    if nk2 == nk: raise SystemExit('kit price not found')
    w = w.replace(nk, nk2)
    w = sub(w, "skill: ['€9.99', '', 'Guide + Claude Skill']", "skill: ['€14.99', '', 'Guide + Remote Kit']")
    w = sub(w, '<button class="pay" type="button" data-pay>Pay €9.99<small>Get Guide + Claude Skill</small></button>', '<button class="pay" type="button" data-pay>Pay €14.99<small>Get Guide + Remote Kit</small></button>')
    w = sub(w, '<b data-pr>€9.99</b>', '<b data-pr>€14.99</b>')
    w = sub(w, '<span data-gnp>€9.99</span>', '<span data-gnp>€14.99</span>')
else:
    w = w.replace(SK, '<span id="buy"></span>' if '<span id="buy"></span>' + SK in w else '')
    w = w.replace('<span id="buy"></span><span id="buy"></span>', '<span id="buy"></span>')
    w = sub(w, '<label class="opt opt-fu" data-o="full">', '<label class="opt opt-fu on" data-o="full">')
    w = sub(w, "let cur = 'skill'", "let cur = 'full'")
    w = sub(w, '<button class="pay" type="button" data-pay>Pay €9.99<small>Get Guide + Claude Skill</small></button>', '<button class="pay" type="button" data-pay>Pay €5.99 · Get The Full Guide</button>')
    w = sub(w, '<b data-pr>€9.99</b>', '<b data-pr>€5.99</b>')
    w = sub(w, '<span data-gnp>€9.99</span>', '<span data-gnp>€5.99</span>')

# behind "Get the full guide now": the colours of the tower at night, brighter (like the Miami G1)
BG = {
  'p1': ("radial-gradient(115% 36% at 50% 12%,#9d5cffcc,transparent 70%),radial-gradient(85% 34% at 0% 58%,#ffb066aa,transparent 70%),radial-gradient(75% 32% at 100% 80%,#5b7bffaa,transparent 70%),radial-gradient(60% 24% at 30% 96%,#c08cff77,transparent 70%),#0e0820", "#140b26b8", "#b48cffaa"),
  'p2': ("radial-gradient(115% 36% at 50% 12%,#ff9a3ccc,transparent 70%),radial-gradient(85% 34% at 0% 58%,#9d5cffaa,transparent 70%),radial-gradient(75% 32% at 100% 80%,#ffbd70aa,transparent 70%),radial-gradient(60% 24% at 30% 96%,#3a4fffaa,transparent 70%),#0a0c20", "#0d1026b8", "#ffb066aa"),
  'p3': ("radial-gradient(115% 36% at 50% 12%,#f5b640cc,transparent 70%),radial-gradient(85% 34% at 0% 58%,#ff9a6aaa,transparent 70%),radial-gradient(75% 32% at 100% 80%,#6f8cffaa,transparent 70%),radial-gradient(60% 24% at 30% 96%,#ffcfa077,transparent 70%),#0a0d1c", "#0e1226b8", "#f5b640aa"),
}
g, boxbg, boxline = BG[PK]
w = re.sub(r'(html\.bf \.offer\{background:linear-gradient\(180deg,var\(--bg\) 0,#[0-9a-f]+ 40px,#0000 150px\),linear-gradient\(0deg,var\(--bg\),#0000 140px\),)[^;}]*', lambda m: m.group(1) + g, w, count=1)
w = sub(w, 'html.bf .offer .box{background:#120f07d9;border-color:#ffd60a55}', f'html.bf .offer .box{{background:{boxbg};border-color:{boxline}}}')
# 17/11 (Nico, Y2 on the big card): the Full Guide + Remote Kit card turns gold when chosen, the Full Guide stays violet
if K == 'k2':
    Y = ('.right .opt.opt-sk.on{background:linear-gradient(#241c06,#241c06) padding-box,linear-gradient(120deg,#ffe24a,#ffb000) border-box!important;'
         'box-shadow:0 0 0 3px #ffd60a55,0 0 46px -4px #ffd60acc!important}.right .opt.opt-sk.on .ck{background:linear-gradient(135deg,#ffe24a,#ffb000)!important;color:#111!important}')
    w = w.replace('</style></head>', Y + '</style></head>', 1)
# 17/11 (Nico, H1): the Higgsfield line says to tap the blue link
w = sub(w, 'The photos and clips in our guides are made on Higgsfield, and right now new users get unlimited generations inside Claude with Higgsfield MCP: <a',
        'The photos and clips in our guides are made on Higgsfield. Tap the blue link to get unlimited generations inside Claude: <a')
# ---- 17/11 afternoon (Nico + the SalesStart review, Hormozi): set by environment variables while Nico picks the codes ----
import os
LINE = os.environ.get('LINE', 'L3C')  # 17/11 Nico: L3 with 2,570, only the line, no books
LINES = {
  'L1': 'The same prompts we used, <b class="hb2">word for word</b>, so you skip the weeks of trial and error',
  'L2': 'Every prompt and every file of this tower, so your first one takes <b class="hb2">days, not weeks</b>',
  'L3': 'We burned <b class="hb2">257 credits</b> of tests on this tower. You get only the prompts that worked',
  # 17/11 (Nico): "spara su in alto", only the line, bigger, no books
  'L3B': 'We burned <b class="hb2">2,570 credits</b> of tests on this tower. You get only the prompts that worked',
  # 17/11 (Nico): a bridge from the 2M reel to the guides, "now you can do it too, with these guides"
  'L3C': '<span class="jk">Now you can do it too</span>We burned <b class="hb2">2,570 credits</b> of tests on this tower. The guide gives you only the prompts that worked<span class="ja">↓</span>',
}
if LINE:
    w, n = re.subn(r'(<div class="join">.*?</span>)<p>.*?</p>', lambda m: m.group(1) + '<p>' + LINES[LINE] + '</p>', w, count=1, flags=re.S)
    if not n: raise SystemExit('join line not found')
    if LINE in ('L3B', 'L3C'):
        w = re.sub(r'<div class="join"><span class="jc">.*?</span>', '<div class="join">', w, count=1, flags=re.S)
        w = w.replace('</style></head>', '.join{padding:56px 16px 0}.join p{max-width:640px;font:900 clamp(26px,4.6vw,40px)/1.15 Poppins;text-wrap:balance}.join .jk{display:block;margin:0 0 14px;font:800 clamp(14px,1.6vw,16px)/1 Poppins;letter-spacing:.16em;text-transform:uppercase;color:#ffb066}.join p:has(.jk){font-size:clamp(22px,3.8vw,34px)}.join .ja{display:block;margin:14px auto 0;font:900 26px/1 Poppins;color:#ffb066;animation:bdn 1.4s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.join .ja{animation:none}}</style></head>', 1)
TIMER = os.environ.get('TIMER', 'D2')  # 17/11 Nico: D2 without the prices in the line
if TIMER:
    END = {'D1': "Date.parse('2026-11-19T23:59:59+01:00')", 'D2': "(() => { const d = new Date(); d.setHours(24, 0, 0, 0); return +d })()", 'D3': '0'}[TIMER]
    LBL = {'D1': 'Launch price ends in', 'D2': 'Today’s price ends in', 'D3': 'Launch price'}[TIMER]
    RV = {'D1': '<s>€29</s> <b>€5.99</b> · launch price until Thu 19 Nov · <b class="rvt2" data-tx>00:00:00</b>',
          'D2': 'Today’s price · tomorrow €9.99 · <b class="rvt2" data-tx>00:00:00</b>',
          'D3': '<s>€29</s> <b>€5.99</b> · launch price for the Riyadh reels'}[TIMER]
    w = re.sub(r'<p class="rvl"><span class="rvs">-80%</span><span>.*?</span></p>', '<p class="rvl"><span class="rvs">-80%</span><span>' + RV + '</span></p>', w, count=1, flags=re.S)
    w = sub(w, '<span class="lbl">Closes forever in</span>', f'<span class="lbl">{LBL}</span>')
    w = sub(w, '<div class="right"><div class="tm" data-t3>00:14:59</div>', f'<div class="right"><p class="tml">{LBL}</p><div class="tm" data-t3>00:14:59</div>')
    old_a = "let end; try { end = +localStorage.getItem('omnya_end') } catch (e) {}\nif (!end || end < Date.now() - 864e5) { end = Date.now() + 15 * 60e3; try { localStorage.setItem('omnya_end', end) } catch (e) {} }"
    w = sub(w, old_a, f"let end = {END}")
    w = sub(w, "  if (end - Date.now() <= 0) { end = Date.now() + 15 * 60e3; try { localStorage.setItem('omnya_end', end) } catch (e) {} }\n", '')
    w = sub(w, "const ms = Math.max(0, end - Date.now()), h = Math.floor(ms / 36e5),", "const ms = Math.max(0, end - Date.now()), dd = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24,")
    w = sub(w, "  document.querySelector('[data-t3]').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`\n",
            "  const tx = (dd ? dd + 'd ' : '') + `${pad(h)}:${pad(m)}:${pad(s)}`\n  document.querySelector('[data-t3]').textContent = tx; const t4 = document.querySelector('[data-tx]'); if (t4) t4.textContent = tx\n  if (dd) document.querySelector('[data-h]').textContent = pad(dd * 24 + h)\n")
    css = '.right .tml{margin:0 0 2px;font:800 12px Poppins,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#ffb066;text-align:center}.rvl .rvt2{color:#ff4d4d;font-variant-numeric:tabular-nums}'
    if TIMER == 'D3':
        css += '.bar .tm,.right [data-t3],.ctop{display:none!important}body.rv .bar .lbl{display:inline}'
    w = w.replace('</style></head>', css + '</style></head>', 1)
if TIMER == 'D2':
    # 17/11 (Nico, D2): the price of the day ends at midnight, and for this visitor it really goes up the day after:
    # the first day is kept in localStorage; from the next day the page shows €9.99 / €19.99 and pays the day-2 prices.
    D2A = '''const __ryDay = (() => { const d = new Date(); return d.getFullYear() * 1e4 + (d.getMonth() + 1) * 100 + d.getDate() })()
let __ryFirst = 0; try { __ryFirst = +localStorage.getItem('omnya_ry_first') || 0; if (!__ryFirst) localStorage.setItem('omnya_ry_first', __ryDay) } catch (e) {}
window.__ry2 = !!__ryFirst && __ryFirst < __ryDay
if (window.__ry2) {
  document.documentElement.classList.add('ry2')
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n; (n = walk.nextNode());) n.nodeValue = n.nodeValue.replace(/€5\.99/g, '€9.99').replace(/€14\.99/g, '€19.99').replace(/save €23/g, 'save €19').replace(/^-80%$/, '-66%')
  const r = document.querySelector('.rvl span:last-child'); if (r) r.innerHTML = 'The launch price is over'
  const ks = document.querySelector('.p-kit .stk b'); if (ks) ks.textContent = '-71%'
}
'''
    w = sub(w, "let end = (() =>", D2A + "let end = (() =>")
    w = sub(w, "const P = { full: ['€5.99', '-80%', 'The Full Guide'],", "const P = { full: window.__ry2 ? ['€9.99', '-66%', 'The Full Guide'] : ['€5.99', '-80%', 'The Full Guide'],")
    w = sub(w, "skill: ['€14.99', '', 'Guide + Remote Kit']", "skill: [window.__ry2 ? '€19.99' : '€14.99', '', 'Guide + Remote Kit']")
    w = re.sub(r"(const LINK = \{[^}]*\}, PID = \{[^}]*\})", lambda m: m.group(1) + "\nif (window.__ry2) { LINK.full = '" + os.environ.get('LINK9', 'https://buy.stripe.com/28EbJ0dp3bIs6tMbmB8so0U') + "'; LINK.skill = '" + os.environ.get('LINK19', 'https://buy.stripe.com/aFa4gy98NcMwaK2duJ8so0T') + "'; PID.full = 'full-riyadh-9'; PID.skill = 'kit-riyadh-19' }", w, count=1)
    if "PID.full = 'full-riyadh-9'" not in w: raise SystemExit('day-2 links not placed')
    w = w.replace('</style></head>', 'html.ry2 .bar .tm,html.ry2 .right [data-t3],html.ry2 .right .tml{display:none!important}</style></head>', 1)
# 17/11 (Nico): no "Our other reels that went viral" under the proof, the 2,570 line comes right after it
if os.environ.get('REELS', 'off') == 'off':
    w, n = re.subn(r'\s*<section class="reels reels2">.*?</section>', '', w, count=1, flags=re.S)
    if not n: raise SystemExit('reels not found')
    w = sub(w, "setInterval(() => { if (innerWidth < 820) return; reels[ri]", "setInterval(() => { if (innerWidth < 820 || !reels.length) return; reels[ri]")
    w = sub(w, "tr.addEventListener('scroll',", "if (tr) tr.addEventListener('scroll',")
# 17/11 (Nico): the proof line without the comma
w = w.replace('on our last reel, in 24 hours', 'on our last reel in 24 hours')
# 17/11 16:22 (Nico, Instagram insights of the stadium reel): 2,097,694 views, 63.9K likes, 4.8K comments; 2M was not in
# 24 hours, so the line says only "on our last reel"
w = sub(w, '<p class="b2h"><b class="hb">1M views</b>on our last reel in 24 hours</p>', '<p class="b2h"><b class="hb">2M views</b>on our last reel</p>')
w = sub(w, '</svg>1M views</span>', '</svg>2M views</span>')
w = sub(w, '</svg>35.8K</span>', '</svg>63.9K</span>')
w = sub(w, '</svg>2,509</span>', '</svg>4.8K</span>')
# 17/11 ~16:30 (Nico): the proof must be ours, not the old stadium reel. PROOF=r1 keeps the 2M stadium reel with the bridge,
# r2/r3 show our own preview (the Burj from night to day and back, public/learn/watch/r_riyadh.mp4) with a hook above it and
# no view counts (the reel is new, there are no numbers to show yet)
PROOF = os.environ.get('PROOF', 'r2')
# 17/11 ~16:45 (Nico): one story from top to bottom. STORY sets the three lines: the title above the face video (what the
# video tells you: the guide, today's price), the hook above our preview ("$30,000 is what a developer paid us for this")
# and the bridge under it (how you get paid like this too, with this guide) down to the prices.
STORIES = {
  's1': ('Step 2: watch how we built it, then get the guide at <u class="hb2">today’s price</u>',
         '<p class="b2h"><b class="hb">$30,000</b>is what a developer paid us for this</p>',
         '<span class="jk">Your turn</span>Get paid like this too: the guide shows you every prompt, step by step<span class="ja">↓</span>'),
  's2': ('Step 2: this video opens the guide that got us paid <u class="hb2">$30,000</u>',
         '<p class="b2h"><b class="hb">$30,000</b>a developer paid us for this tower</p>',
         '<span class="jk">Now it’s your turn</span>Build the same tower and charge for it like we did. It’s all in the guide<span class="ja">↓</span>'),
  's3': ('Step 2: see what’s inside the guide, before the price <u class="hb2">goes up</u>',
         '<p class="b2h"><b class="hb">$30,000</b>is what a developer paid us for this</p>',
         '<span class="jk">How you get paid too</span>The 3D, the prompts and the remote, ready for your first developer<span class="ja">↓</span>'),
  # 17/11 ~17:00 (Nico): above the face video only the result you get by watching (no spending), above our reel
  # "$30,000 is what a developer paid us for this", under it one big line with the gradient word, down to the guide
  'w1': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">$30,000</b>is what a developer paid us for this</p>',
         'We burned <b class="hb2">2,570 credits</b> to get here. Follow the guide and you won’t have to<span class="ja">↓</span>'),
  'w2': ('Step 2: watch how we turned one tower into <u class="hb2">$30,000</u>',
         '<p class="b2h"><b class="hb">$30,000</b>is what a developer paid us for this</p>',
         'You can build it too, <b class="hb2">following the guide</b> step by step<span class="ja">↓</span>'),
  'w3': ('Step 2: watch this and land your first <u class="hb2">$30,000</u> client',
         '<p class="b2h"><b class="hb">$30,000</b>is what a developer paid us for this</p>',
         'Same tower, same prompts: <b class="hb2">follow the guide</b> and get paid like us<span class="ja">↓</span>'),
  # 17/11 ~17:15 (Nico): $30,000 only once (above the video), another strong hook above our reel, one fluid line under it
  'z1': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">1 finger</b>drives this whole tower from a phone</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
  'z2': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">No 3D artist</b>just Claude, Higgsfield and this tower</p>',
         'Skip the weeks of trial and error and <b class="hb2">discover the full guide</b> that takes you from zero to your first tower<span class="ja">↓</span>'),
  'z3': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">Night to day</b>with one slide on your phone</p>',
         'Everything we did is inside <b class="hb2">the full guide</b> so you can build it too without guessing a single prompt<span class="ja">↓</span>'),
  # 17/11 ~17:30 (Nico, Z1 + a harder hook above our reel, 'roba cattiva')
  'g1': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">Renders are dead</b>developers pay for this now</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
  'g2': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">Stop selling renders</b>this is what closes developers now</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
  'g3': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">While you sell renders</b>we get paid for this</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
  'g4': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">$200K render studio</b>killed by Claude in one tower</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
  # 17/11 (Nico): the G2 words in colour, the G1 white line under them -> the final one
  'g5': ('Step 2: learn how to get paid <u class="hb2">$30,000</u> by a developer too',
         '<p class="b2h"><b class="hb">Stop selling renders</b>developers pay for this now</p>',
         'You can build the same tower for your clients by <b class="hb2">following the full guide</b>, with every prompt already written for you<span class="ja">↓</span>'),
}
STORY = os.environ.get('STORY', 'g5')
if PROOF in ('r2', 'r3'):
    HEAD = {'r2': '<p class="b2h"><b class="hb">$30,000</b>is what developers pay for this</p>',
            'r3': '<p class="b2h"><b class="hb">$2B</b>Riyadh mega project, built with Claude</p>'}[PROOF]
    BR = {'r2': '<span class="jk">Now you can build it too</span>The 3D, every prompt and the remote are in the guide, word for word<span class="ja">↓</span>',
          'r3': '<span class="jk">Now you can build it too</span>Day to night, the sky pool, the remote: every prompt is in the guide<span class="ja">↓</span>'}[PROOF]
    w = sub(w, '<p class="b2h"><b class="hb">2M views</b>on our last reel</p>', HEAD)
    w = sub(w, 'src="/learn/watch/r_stadio.mp4" poster="/learn/watch/p_stadio.jpg"', 'src="/learn/watch/r_riyadh.mp4?v=2" poster="/learn/watch/p_riyadh.jpg"')
    w = re.sub(r'(<span class="vw">.*?</svg>)2M views</span>', lambda m: m.group(1) + 'New reel</span>', w, count=1, flags=re.S)
    w = re.sub(r'<div class="rail">.*?</div>', '', w, count=1, flags=re.S)
    w = sub(w, '<p>Comment “TICKET” and I’ll send you the free guide…</p>', '<p>Comment “3D” and I’ll send you the free guide…</p>')
    if STORY:
        T1, HEAD2, BR = STORIES[STORY]
        w = sub(w, HEAD, HEAD2)
        w = re.sub(r'<h1>Step 2:.*?</h1>', '<h1>' + T1 + '</h1>', w, count=1, flags=re.S)
    w = re.sub(r'<div class="join"><p>.*?</p></div>', '<div class="join"><p>' + BR + '</p></div>', w, count=1, flags=re.S)
    w = w.replace('</style></head>', '.big .b2h b{font-size:clamp(44px,13vw,118px);line-height:.95}</style></head>', 1)
if os.environ.get('BF', 'off') == 'below':
    m = re.search(r'\s*<div class="bfw">.*?</div></div>\n', w, flags=re.S)
    blk = m.group(0); w = w.replace(blk, '\n', 1)
    i = w.index('</section>', w.index('<section class="offer" id="offer">')) + len('</section>')
    w = w[:i] + '\n  <section class="bfsec">' + blk.strip() + '</section>' + w[i:]
    w = w.replace('</style></head>', '.bfsec{padding:8px 16px 56px}.bfsec .bridge{text-align:center}</style></head>', 1)
# 17/11 ~17:00 (Nico via the strategy session): the column must not contradict itself. The kit is chosen first, so the
# left pane shows the kit (€14.99, €69.99 struck, its own list) and follows the choice; the Full list says only what is
# in the Full. Black Friday and the "Everything" row leave the watch page (Everything is offered on the thanks page).
if os.environ.get('BF', 'off') == 'off':
    m = re.search(r'\s*<div class="bfw">.*?</div></div>\n', w, flags=re.S)
    if m: w = w.replace(m.group(0), '\n', 1)
    w, n = re.subn(r'\s*<label class="opt opt-all" data-o="all">.*?</label>', '', w, count=1, flags=re.S)
    if not n: raise SystemExit('opt-all not found')
if K == 'k2':
    FULL_UL = '<ul><li>The 3D tower code in three.js</li><li>Every photo prompt, night to sunset</li><li>The clip prompts that fly you inside</li><li>The remote that drives it from a phone</li><li>The sunrise-to-night slider</li><li>What to charge a developer for it</li></ul>'
    m = re.search(r'<div class="pane p-full on" data-p="full">.*?' + re.escape(FULL_UL) + '</div>', w, flags=re.S)
    if not m: raise SystemExit('full pane not found')
    full = m.group(0)
    kit = (full.replace('<div class="pane p-full on" data-p="full">', '<div class="pane p-full p-kit on" data-p="skill">')
               .replace('<div class="t">The Full Guide, <i class="hb2">all of it</i></div>', '<div class="t">The Full Guide <i class="hb2">+ Remote Kit</i></div>')
               .replace('<div class="pr"><s>€29</s><b>€5.99</b> · you save €23</div>', '<div class="pr"><s>€69.99</s><b>€14.99</b> · you save €55</div>')
               .replace('id="sg"', 'id="sgk"').replace('url(#sg)', 'url(#sgk)')
               .replace(FULL_UL, '<ul><li>Everything in the Full Guide</li><li>The remote code, ready to run</li><li>The big-screen page of the tower</li><li>Phone and screen on the same Wi-Fi</li><li>Your own clips in one file</li><li>Ready to show a developer</li></ul>'))
    fullp = (full.replace('<div class="pane p-full on" data-p="full">', '<div class="pane p-full" data-p="full">')
                 .replace(FULL_UL, '<ul><li>The 3D tower code in three.js</li><li>Every photo prompt, night to sunset</li><li>The clip prompts that fly you inside</li><li>How the remote and the slider work</li><li>Every step, from the 3D to the client</li><li>What to charge a developer for it</li></ul>'))
    w = w.replace(full, kit + '\n        ' + fullp, 1)
    w = sub(w, "p.dataset.p === (k === 'bf' ? 'all' : k === 'skill' ? 'full' : k)", "p.dataset.p === (k === 'bf' ? 'all' : k)")
    w = w.replace(".replace(/save €23/g, 'save €19').replace(/^-80%$/, '-66%')", ".replace(/save €23/g, 'save €19').replace(/save €55/g, 'save €50').replace(/^-80%$/, '-66%').replace(/^-79%$/, '-71%')")
# 17/11 ~17:10 (Nico, from the phone): the hook above our reel a bit higher (less empty dark above it, not glued to the
# button), and the line under the button centred and tidy: the -80% sticker inline with the words, one line when it fits
w = w.replace('</style></head>', '.big.c1{padding-top:120px!important}@media (max-width:820px){.big.c1{padding-top:84px!important}}'
              'body.rv .rvl{display:block;text-align:center;line-height:1.7}.rvl .rvs{display:inline-grid;vertical-align:1px;margin-right:8px}'
              '.rvl>span:last-child{display:inline}@media (max-width:440px){.rvl{font-size:13.5px}.rvl .rvs{height:23px;padding:0 7px;font-size:12px}}</style></head>', 1)
# 17/11 ~17:50 (Nico): the Full Guide €5.99 starts chosen, the kit €14.99 stays first but only if they tap it
if K == 'k2':
    w = sub(w, '<label class="opt opt-sk on" data-o="skill">', '<label class="opt opt-sk" data-o="skill">')
    w = sub(w, '<label class="opt opt-fu" data-o="full">', '<label class="opt opt-fu on" data-o="full">')
    w = sub(w, '<div class="pane p-full p-kit on" data-p="skill">', '<div class="pane p-full p-kit" data-p="skill">')
    w = sub(w, '<div class="pane p-full" data-p="full">', '<div class="pane p-full on" data-p="full">')
    w = sub(w, "let cur = 'skill'", "let cur = 'full'")
    w = sub(w, '<button class="pay" type="button" data-pay>Pay €14.99<small>Get Guide + Remote Kit</small></button>', '<button class="pay" type="button" data-pay>Pay €5.99 · Get The Full Guide</button>')
    w = sub(w, '<b data-pr>€14.99</b>', '<b data-pr>€5.99</b>')
    w = sub(w, '<span data-gnp>€14.99</span>', '<span data-gnp>€5.99</span>')
left = [m.start() for m in re.finditer(r'stadium|Stadium|sd_', w)]
import os; os.makedirs(os.path.dirname(OUT_W), exist_ok=True)
open(OUT_W, 'w').write(w)
print('ok', OUT_O, OUT_W, 'stadium words left:', len(left))
for i in left: print('  ', w[max(0, i - 70):i + 50].replace('\n', ' '))
