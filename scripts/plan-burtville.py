# Burtville living room: a black and white floor plan, drawn like a designer's sheet (1 unit = 1 cm).
# North (top) and east (right): full-height glazing on the sea. Furniture as in the render.
import math, sys
OUT = sys.argv[1]
W, D = 960, 720          # inside of the room
INK, MID, LIGHT = '#151515', '#6d6d6d', '#c9c9c9'
s = []
a = s.append

def rect(x, y, w, h, sw=1.4, fill='none', stroke=INK, rx=0, extra=''):
    a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
def line(x1, y1, x2, y2, sw=1, stroke=INK, extra=''):
    a(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
def circ(cx, cy, r, sw=1.4, fill='none', stroke=INK, extra=''):
    a(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
def text(x, y, t, size=14, anchor='middle', fill=INK, weight=400, ls=0.5, extra=''):
    a(f'<text x="{x}" y="{y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="{size}" font-weight="{weight}" letter-spacing="{ls}" text-anchor="{anchor}" fill="{fill}" {extra}>{t}</text>')

a('<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9a9a9a" stroke-width="1"/></pattern>'
  '<pattern id="deck" width="24" height="200" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="200" stroke="#bdbdbd" stroke-width="0.8"/></pattern>'
  '<pattern id="tile" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M120 0H0V60" fill="none" stroke="#e4e4e4" stroke-width="0.8"/></pattern>'
  '<pattern id="slat" width="6" height="40" patternUnits="userSpaceOnUse"><line x1="3" y1="0" x2="3" y2="40" stroke="#151515" stroke-width="0.9"/></pattern></defs>')

# terrace outside the glazing (north and east), decking
rect(-25, -190, W + 25 + 190, 165, sw=0, fill='url(#deck)')
rect(W + 25, -25, 165, D + 25, sw=0, fill='url(#deck)')
line(-25, -190, W + 190, -190, 1, MID); line(W + 190, -190, W + 190, D, 1, MID)
# floor: large stone slabs
rect(0, 0, W, D, sw=0, fill='url(#tile)')
# ceiling beams above (reflected, dashed)
for x in (240, 480, 720):
    line(x, 0, x, D, 1, LIGHT, 'stroke-dasharray="10 8"')
for y in (240, 480):
    line(0, y, W, y, 1, LIGHT, 'stroke-dasharray="10 8"')
# solid walls: west and south, poché
a(f'<path d="M-25 -25H0V{D}H{W+25}V{D+25}H-25Z" fill="{INK}"/>')
# door in the south wall
rect(700, D, 100, 25, sw=0, fill='#fff')
line(700, D, 700, D + 25, 1.4); line(800, D, 800, D + 25, 1.4)
line(700, D, 700, D - 100, 1.6)
a(f'<path d="M700 {D-100} A100 100 0 0 1 800 {D}" fill="none" stroke="{INK}" stroke-width="0.9" stroke-dasharray="4 4"/>')
# glazing north and east: frame, double glass line, mullions
def glazing_h(x1, x2, y):
    rect(x1, y - 10, x2 - x1, 10, 1.2, '#fff')
    line(x1, y - 5, x2, y - 5, 0.8)
    n = round((x2 - x1) / 160)
    for i in range(n + 1):
        xx = x1 + (x2 - x1) * i / n
        rect(xx - 4, y - 12, 8, 14, 0, INK)
def glazing_v(y1, y2, x):
    rect(x, y1, 10, y2 - y1, 1.2, '#fff')
    line(x + 5, y1, x + 5, y2, 0.8)
    n = round((y2 - y1) / 160)
    for i in range(n + 1):
        yy = y1 + (y2 - y1) * i / n
        rect(x - 2, yy - 4, 14, 8, 0, INK)
glazing_h(-25, W + 10, 0)
glazing_v(0, D, W)
# sliding panel marks on the north glazing (arrows)
for x in (120, 760):
    line(x, -18, x + 60, -18, 0.8); a(f'<path d="M{x+60} -18l-8 -4v8z" fill="{INK}"/>')
# columns and slatted wood piers
rect(150, 0, 42, 42, 1.4, 'url(#slat)')
rect(345, 18, 44, 44, 1.6, '#fff')
line(345, 18, 389, 62, 0.8); line(389, 18, 345, 62, 0.8)
rect(585, 0, 150, 92, 1.6, 'url(#slat)')
text(660, 112, 'OAK SLATS', 9, fill=MID, ls=1.2)
# rug, with an organic pattern
rect(40, 330, 560, 360, 1.2, 'none', INK, 18)
for i, (cx, cy, rr) in enumerate([(110, 400, 34), (190, 460, 26), (300, 640, 30), (470, 380, 28), (540, 600, 36), (420, 655, 22), (100, 610, 28), (560, 470, 20)]):
    a(f'<ellipse cx="{cx}" cy="{cy}" rx="{rr*1.4}" ry="{rr}" fill="none" stroke="{LIGHT}" stroke-width="1"/>')
# long sofa, back to the sea, seats facing the room
rect(50, 228, 390, 104, 1.6, '#fff', INK, 10)
rect(50, 228, 390, 24, 1.2, '#fff', INK, 8)
rect(50, 228, 22, 104, 1.2, '#fff', INK, 8); rect(418, 228, 22, 104, 1.2, '#fff', INK, 8)
for x in (72, 187, 302, 418):
    line(x, 252, x, 332, 1)
for x in (110, 170, 230, 300, 360):
    a(f'<rect x="{x}" y="254" width="42" height="20" rx="6" fill="none" stroke="{MID}" stroke-width="0.9" transform="rotate({(x % 7) - 3} {x+21} 264)"/>')
# side drum table and floor lamp by the sofa
circ(470, 270, 24, 1.4, '#fff'); circ(470, 270, 12, 0.9)
circ(515, 170, 22, 1.2, '#fff'); circ(515, 170, 4, 0, INK)
# olive tree in its round planter: trunk, canopy
circ(600, 175, 46, 1.6, '#fff'); circ(600, 175, 38, 0.9)
pts = []
for i in range(36):
    ang = i / 36 * 2 * math.pi
    r = 128 + 16 * math.sin(i * 1.7) + 10 * math.cos(i * 2.9)
    pts.append(f'{600 + r * math.cos(ang):.1f},{175 + r * math.sin(ang) * 0.86:.1f}')
a(f'<polygon points="{" ".join(pts)}" fill="none" stroke="{MID}" stroke-width="1" stroke-dasharray="3 5"/>')
for ang in range(0, 360, 40):
    rr = math.radians(ang)
    line(600, 175, 600 + 70 * math.cos(rr), 175 + 60 * math.sin(rr), 0.8, LIGHT)
circ(600, 175, 7, 0, INK)
# round coffee table
circ(255, 450, 72, 1.6, '#fff'); circ(255, 450, 60, 0.9)
# lounge by the east glass: four armchairs, two small tables, a lamp
def chair(cx, cy, rot, size=78):
    h = size / 2
    a(f'<g transform="rotate({rot} {cx} {cy})"><rect x="{cx-h}" y="{cy-h}" width="{size}" height="{size}" rx="22" fill="#fff" stroke="{INK}" stroke-width="1.6"/>'
      f'<path d="M{cx-h+8} {cy-h+14} Q{cx} {cy-h-4} {cx+h-8} {cy-h+14}" fill="none" stroke="{INK}" stroke-width="1.2"/>'
      f'<rect x="{cx-h+14}" y="{cy-h+20}" width="{size-28}" height="{size-30}" rx="14" fill="none" stroke="{MID}" stroke-width="0.9"/></g>')
chair(745, 255, 200); chair(840, 255, 160)
circ(793, 330, 22, 1.2, '#fff')
chair(880, 470, 260); chair(880, 570, 280)
circ(885, 380, 20, 1.2, '#fff'); circ(885, 380, 4, 0, INK)
circ(905, 655, 22, 1.2, '#fff')
# two boucle armchairs in front of the sofa, facing it
chair(110, 590, 10, 92); chair(460, 600, -15, 92)
# the view we rendered: camera and cone
cx, cy = 600, 690
a(f'<path d="M{cx} {cy} L{cx-330} {cy-470} M{cx} {cy} L{cx+250} {cy-470}" stroke="{INK}" stroke-width="1" stroke-dasharray="7 6" fill="none"/>')
a(f'<path d="M{cx-330} {cy-470} Q{cx-40} {cy-560} {cx+250} {cy-470}" stroke="{INK}" stroke-width="0.8" fill="none" stroke-dasharray="2 5"/>')
rect(cx - 14, cy - 9, 28, 18, 0, INK, INK, 3); a(f'<path d="M{cx-6} {cy-9} l4 -7 h4 l4 7z" fill="{INK}"/>')
text(cx + 26, cy + 5, 'VIEW 01', 11, 'start', INK, 500, 1.4)
# room name
text(250, 140, 'LIVING ROOM', 17, weight=500, ls=2.6)
text(250, 161, '69 m²  ·  h 3,20 m', 12, fill=MID, ls=0.8)
text(420, -100, 'TERRACE  ·  SEA', 13, fill=MID, ls=2.4)
# dimensions: south (outside) and west
def dim_h(x1, x2, y, label):
    line(x1, y, x2, y, 1)
    for x in (x1, x2):
        line(x - 6, y + 6, x + 6, y - 6, 1.4); line(x, y - 14, x, y + 8, 0.8)
    text((x1 + x2) / 2, y - 8, label, 13)
def dim_v(y1, y2, x, label):
    line(x, y1, x, y2, 1)
    for y in (y1, y2):
        line(x - 6, y + 6, x + 6, y - 6, 1.4); line(x - 8, y, x + 14, y, 0.8)
    text(x - 10, (y1 + y2) / 2, label, 13, extra=f'transform="rotate(-90 {x-10} {(y1+y2)/2})"')
dim_h(0, W, D + 80, '960')
dim_h(0, 700, D + 52, '700'); dim_h(700, 800, D + 52, '100'); dim_h(800, W, D + 52, '160')
dim_v(0, D, -80, '720')
dim_v(0, 228, -52, '228'); dim_v(228, 332, -52, '104'); dim_v(332, D, -52, '388')
plan = '\n'.join(s)

def sheet(vw, vh, tx, ty, sc, title_xy, extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{vw}" height="{vh}" viewBox="0 0 {vw} {vh}"><rect width="100%" height="100%" fill="#fbfaf7"/>'
            f'<g transform="translate({tx} {ty}) scale({sc})">{plan}</g>{extra}</svg>')

def titleblock(x, y, sc=1.0):
    t = []
    T = lambda xx, yy, s_, size, anchor='start', fill=INK, w=400, ls=0.6: t.append(
        f'<text x="{xx}" y="{yy}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="{size}" font-weight="{w}" letter-spacing="{ls}" text-anchor="{anchor}" fill="{fill}">{s_}</text>')
    T(x, y, 'LIVING ROOM', 22 * sc, w=600, ls=3)
    T(x, y + 26 * sc, 'Penthouse by the sea', 16 * sc, fill=MID)
    T(x, y + 50 * sc, 'Floor plan  ·  1:50  ·  cm', 14 * sc, fill=MID)
    return ''.join(t)

def northscale(x, y, sc=1.0):
    r = 18 * sc
    g = [f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{INK}" stroke-width="1.2"/>',
         f'<path d="M{x} {y-r+3} L{x+7*sc} {y+8*sc} L{x} {y+3*sc} L{x-7*sc} {y+8*sc}Z" fill="{INK}"/>',
         f'<text x="{x}" y="{y-r-8}" font-family="Helvetica Neue, Helvetica, Arial" font-size="{12*sc}" text-anchor="middle" fill="{INK}">N</text>']
    bx = x + 50 * sc
    for i in range(4):
        g.append(f'<rect x="{bx + i*30*sc}" y="{y-4*sc}" width="{30*sc}" height="{8*sc}" fill="{INK if i % 2 == 0 else "#fff"}" stroke="{INK}" stroke-width="1"/>')
    for i, l in enumerate(['0', '1', '2 m']):
        g.append(f'<text x="{bx + i*60*sc}" y="{y+22*sc}" font-family="Helvetica Neue, Helvetica, Arial" font-size="{11*sc}" text-anchor="middle" fill="{MID}">{l}</text>')
    return ''.join(g)

# portrait 4:5 (desktop cards): plan on top, title and north under it
P = sheet(1600, 2000, 212, 400, 1.12, None, titleblock(120, 1650, 1.6) + northscale(1100, 1690, 1.6) +
          f'<line x1="120" y1="1580" x2="1480" y2="1580" stroke="{INK}" stroke-width="1"/>')
# landscape 16:10 (phones): plan on the left, title on the right
L = sheet(2048, 1280, 200, 250, 1.08, None, titleblock(1520, 1000, 1.4) + northscale(1580, 1160, 1.2) +
          f'<line x1="1520" y1="950" x2="1960" y2="950" stroke="{INK}" stroke-width="1"/>')
open(OUT + '_p.svg', 'w').write(P)
open(OUT + '_l.svg', 'w').write(L)
print('ok')
