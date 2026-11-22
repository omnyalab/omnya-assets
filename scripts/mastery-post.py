#!/usr/bin/env python3
# The 3D AI Mastery watch page after `scripts/new-funnel make mastery` (22/11/2026, Nico): the generator makes the Riyadh
# format with the Full Guide (and no kit); this turns it into the Riyadh page as it is online since 20/11 (c987ff4 + 212e052):
# the Full course at €5.99 Black Friday until Fri 27/11 23:59 Rome (then €9.99, no timer), the yellow Black Friday card right
# under it with the 3 playbooks + the course (€59, its own Stripe product, only on this funnel), the THE 3D FUTURE card at the
# end. Words for people who start from zero (Nico: «è un trial reel, le persone non sanno cosa facciamo, deve essere generale»).
# The generator runs it by itself (funnels/mastery.json → "post_script"): scripts/new-funnel make mastery.
# Every replacement must hit exactly once, or it stops: someone changed the generator or the Build page.
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(REPO, 'src/pages/the-3d-ai-mastery/watch.astro')


class Stop(Exception):
    pass


def post(text, C):
  global s
  X = C.get('post', {})
  PACK_LINK = X.get('pack_link', 'STRIPE-DA-CREARE-pack-mastery')
  PACK_STRUCK = 79 + 97 + 39 + 29          # playbooks 01, 02, 03 (src/lib/learn.ts prices) + the course at its full price
  OFF = '-%d%%' % round((1 - 59 / PACK_STRUCK) * 100)
  s = text
  if 'mastery-post.py' in s:
      return s   # already turned (the page on disk after a make): nothing to do


  def rep(old, new, n=1):
      global s
      k = s.count(old)
      if k != n:
          sys.exit(f'FERMO: «{old[:90]}» trovato {k} volte invece di {n}')
      s = s.replace(old, new)


  def rex(pat, new, flags=re.S):
      global s
      m = re.findall(pat, s, flags)
      if len(m) != 1:
          sys.exit(f'FERMO: /{pat[:70]}/ trovato {len(m)} volte invece di 1')
      s = re.sub(pat, lambda _: new, s, count=1, flags=flags)


  # header
  rep("// Made by scripts/new-funnel from funnels/mastery.json (copy of the build page): change the words there, not here.\n",
      "// Made by scripts/new-funnel from funnels/mastery.json (copy of the build page), then by scripts/mastery-post.py (the Riyadh\n"
      "// structure online since 20/11: Full €5.99 Black Friday until 27/11 then €9.99, the €59 card with the 3 playbooks + the\n"
      "// course under it, THE 3D FUTURE at the end, words for people who start from zero): change the words there, not here.\n"
      "import RiyadhFuture from '../../components/RiyadhFuture.astro';\n")
  # the bar, the hero, the steps
  rep('<span class="lbl">Launch price ends in</span>', '<span class="lbl">Black Friday price ends in</span>')
  rep('<a class="go cbtn" href="#offer">Get the full guide<i class="dot"></i>', '<a class="go cbtn" href="#offer">Get the full course<i class="dot"></i>')
  rep('<p class="csub">Then the Full Guide goes back to €29</p>', '<p class="csub">Then the course goes up to €9.99</p>')
  rep('<span>Your <b>FREE</b> blueprint is ready below</span>', '<span>Your <b>FREE</b> guide is ready below</span>')
  rep('<img src="/learn/mx_cover_book.webp" alt="" width="44" height="60">', '<img src="/learn/mx_free_book_tight.webp" alt="" width="44" height="63">')
  rep('<span class="ok"><em>✓</em>Free blueprint</span>', '<span class="ok"><em>✓</em>Free guide</span>')
  rep('<span><em>3</em>Full guide</span>', '<span><em>3</em>Full course</span>')
  rep('<div class="cta"><a class="cbtn" href="#offer">Get the full guide<i class="dot"></i>', '<div class="cta"><a class="cbtn" href="#offer">Get the full course<i class="dot"></i>')
  rex(r'<span>Launch price · from \w+ €9\.99 · <b class="rvt2" data-tx>00:00:00</b></span>', '<span>Black Friday price · from 28/11 €9.99 · <b class="rvt2" data-tx>00:00:00</b></span>')
  # the bridge and the offer title
  rex(r'<div class="join"><p>.*?<span class="ja">', '<div class="join"><p>You can build any 3D like this, even if you start from zero, by <b class="hb2">following the full course</b>, with every prompt already written for you<span class="ja">')
  rep('<h2 style="text-align:center">GET THE FULL GUIDE NOW</h2>', '<h2 style="text-align:center">GET THE FULL COURSE NOW</h2>')
  # the left panes: the course, and the Black Friday bundle in place of Everything
  rep('<div class="t">The Full Guide, <i class="hb2">all of it</i></div>', '<div class="t">3D AI Mastery, <i class="hb2">the full course</i></div>')
  allp = re.search(r'<div class="pane p-all" data-p="all">.*?</ul></div>', s, re.S).group(0)
  newp = re.sub(r'<div class="t">.*?</div><div class="pr">.*?</div>', f'<div class="t">The course <i class="hb2">+ 3 playbooks</i></div><div class="pr"><s>€{PACK_STRUCK}</s><b>€59</b> · Black Friday</div>', allp, count=1, flags=re.S)
  newp = re.sub(r'<div class="fbr">.*?</div>', '<div class="fbr"><img src="/learn/mx_book_tight.webp" alt="3D AI Mastery"></div>', newp, count=1, flags=re.S)
  newp = newp.replace('<b>-75%</b><small>ONLY HERE</small>', f'<b>{OFF}</b><small>BLACK FRIDAY</small>')
  newp = re.sub(r'<ul>.*?</ul>', '<ul><li>3D AI Mastery, the full course</li><li>Playbook 01 · From a 3D to a photo clients pay for</li><li>Playbook 02 · How to go viral in days, not years</li><li>Playbook 03 · The launch kit that sells a tower</li></ul>', newp, flags=re.S)
  rep(allp, newp)
  # the right column: the course already chosen, the Black Friday card right under it (no kit)
  rep('<p class="tml">Launch price ends in</p>', '<p class="tml">Black Friday price ends in</p>')
  fu = re.search(r'<label class="opt opt-fu on" data-o="full">.*?</label>', s).group(0)
  nfu = fu.replace('<b>The Full Guide</b><small>Every prompt, word for word</small>', '<b>3D AI Mastery</b><small>The full course, step by step</small>')
  if nfu == fu:
      sys.exit('FERMO: riga del Full cambiata')
  # 22/11 (Nico: «mettilo come primo… e ben centrati»): the course book in front, bigger, with the light on its edge; behind it
  # the 3 playbooks in a symmetric half circle (left, middle higher, right), the whole group in the middle of the card
  bfc = ('<label class="opt bfc" data-o="bf"><span class="rib"><i></i>BLACK FRIDAY OFFER</span><span class="fan fan--front"><img src="/learn/pk_pb01.webp" alt="">'
         '<img src="/learn/pk_pb02.webp" alt=""><img src="/learn/pk_pb03.webp" alt=""><img src="/learn/mx_book_tight.webp" alt=""></span>'
         '<span class="bh">The course + 3 playbooks</span><span class="inc">The full course and our 3 playbooks: photos clients pay for, going viral and the launch kit, until 27 November</span>'
         f'<span class="pz"><s>€{PACK_STRUCK}</s><b>€59</b><span>{OFF}</span></span><span class="go" data-bfgo>Get all four · €59</span><span class="end">Ends Friday 27 November at 23:59</span></label>')
  rep(fu, nfu + bfc)
  rep('· the guide arrives here</span>', '· the course arrives here</span>')
  rep('<button class="pay" type="button" data-pay>Pay €5.99 · Get The Full Guide</button>', '<button class="pay" type="button" data-pay>Pay €5.99 · Get the course</button>')
  rep("Write your email so we can send you the guide", "Write your email so we can send you the course")
  # the club card at the end (Riyadh C1)
  rep('  </section>\n</main>', '  </section>\n  <div class="clubw" data-clubw><RiyadhFuture kind="mastery" bg="stadium" href="/the-3d-future?ig=mastery" /></div>\n</main>')
  # 22/11 (Nico: «fallo blu bello, non verde… blu accattivante non spento»): electric blue like the Æther cover on a
  # black-navy ground: buttons in a blue gradient with a light-blue halo, key words in the light-blue → blue gradient of
  # MASTERY on the cover, a thin blue light on the cards
  rep('</style></head>', ':root{--bg:#050914;--bg2:#0b1226}html,body{background:#050914}'
      '.cbtn,.getnow,.pay{background:linear-gradient(180deg,#3d8bff,#1f5bff)!important;color:#fff!important;box-shadow:inset 0 0 0 1px #9fd8ff40,0 0 0 4px #5fb4ff1f,0 12px 34px -10px #5fb4ffcc,0 0 42px -8px #5fb4ff99!important}'
      '.hb{background:linear-gradient(180deg,#ffffff 0%,#9fd8ff 42%,#2f7bff 100%)!important;-webkit-background-clip:text!important;background-clip:text!important}'
      '.hb2{background:linear-gradient(90deg,#9fd8ff,#2f7bff)!important;-webkit-background-clip:text!important;background-clip:text!important}'
      '.bfc .fan.fan--front{height:146px;width:250px;margin:8px auto 6px}'
      '.bfc .fan.fan--front img{bottom:6px;filter:brightness(.72)!important;box-shadow:0 10px 20px #000c,0 0 0 1px #ffffff14!important}'
      '.bfc .fan.fan--front img:nth-child(1){left:30px;width:54px;transform:rotate(-18deg) translateY(2px);z-index:1}'
      '.bfc .fan.fan--front img:nth-child(2){left:98px;width:54px;transform:translateY(-52px);z-index:0}'
      '.bfc .fan.fan--front img:nth-child(3){left:166px;width:54px;transform:rotate(18deg) translateY(2px);z-index:1}'
      '.bfc .fan.fan--front img:nth-child(4){left:89px;width:72px;bottom:0;z-index:3;filter:none!important;transform:none;box-shadow:0 0 0 1.5px #ffd60a,0 0 30px #ffd60a99,0 14px 26px #000c!important}'
      '[data-vsl],#offer .box,.igv,.right .opt.opt-fu{box-shadow:0 0 0 1px #5fb4ff59,0 0 36px -10px #2f7bffaa!important}'
      '</style></head>')
  # the script: no timer after 27/11, prices and links of the course and the bundle
  rep("  const r = document.querySelector('.rvl span:last-child'); if (r) r.innerHTML = 'The launch price is over'",
      "  const r = document.querySelector('.rvl span:last-child'); if (r) r.innerHTML = 'The Black Friday price is over'\n"
      "  document.querySelectorAll('.tml, [data-t3], .bar .lbl, .bar .tm').forEach(e => { e.hidden = true })")
  rex(r"const P = \{ full: window\.__ry2 \? \['€9\.99', '-66%', 'The Full Guide'\] : \['€5\.99', '-80%', 'The Full Guide'\],.*?\}\n",
      f"const P = {{ full: window.__ry2 ? ['€9.99', '-66%', 'the course'] : ['€5.99', '-80%', 'the course'], all: ['€59', '{OFF}', 'the course + 3 playbooks'], bf: ['€59', '{OFF}', 'the course + 3 playbooks'] }}\n")
  rex(r"const LINK = \{'full': '([^']*)', 'all': '[^']*', 'bf': '[^']*', 'skill': '[^']*'\}, PID = \{'full': '([^']*)', 'all': 'everything', 'bf': 'everything', 'skill': '[^']*'\}",
      "const LINK = {'full': '%s', 'all': '%s', 'bf': '%s'}, PID = {'full': '%s', 'all': 'pack-mastery', 'bf': 'pack-mastery'}" % (
          re.search(r"const LINK = \{'full': '([^']*)'", s).group(1), PACK_LINK, PACK_LINK, re.search(r"PID = \{'full': '([^']*)'", s).group(1)))
  rex(r"if \(window\.__ry2\) \{ LINK\.full = '([^']*)'; LINK\.skill = '[^']*'; PID\.full = '([^']*)'; PID\.skill = '[^']*' \}",
      "if (window.__ry2) { LINK.full = '%s'; PID.full = '%s' }" % tuple(re.search(r"if \(window\.__ry2\) \{ LINK\.full = '([^']*)'; LINK\.skill = '[^']*'; PID\.full = '([^']*)'", s).groups()))
  old_bf = re.search(r"\{ const bfEnd = Date\.parse\('2026-11-27T23:59:59\+01:00'\), bfCard = document\.querySelector\('\[data-bft\]'\).*?bt\(\); setInterval\(bt, 1000\) \}\n", s, re.S).group(0)
  rep(old_bf, "{ const bfEnd = Date.parse('2026-11-27T23:59:59+01:00'), bfCard = document.querySelector('.opt.bfc')\n"
              "  if (bfCard && Date.now() < bfEnd) { document.documentElement.classList.add('bf')\n"
              "    const go = bfCard.querySelector('[data-bfgo]'); if (go) go.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); bfCard.click(); setTimeout(() => { const t = document.querySelector('[data-em]') || document.querySelector('[data-pay]'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 50) }) }\n")
  return s


if __name__ == '__main__':
  C = json.load(open(os.path.join(REPO, 'funnels/mastery.json'), encoding='utf-8'))
  out = post(open(P, encoding='utf-8').read(), C)
  open(P, 'w', encoding='utf-8').write(out)
  print('ok', os.path.relpath(P, REPO))
