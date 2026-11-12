# Share previews for the main pages and the two 3D demos (Nico 9/11): each page its own photo,
# its name large in SF Pro fading into the picture, the logo small at the bottom.
# Made by hand on a Mac (SF Pro is not on the build servers) and committed, like og/omnya-lab.jpg:
#   python3 scripts/make-og-pages.py
# Needs Pillow and SF Pro Display in /Library/Fonts; the white logo PNG is rendered from the SVG with sharp first.
import os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'og')
FONT = ImageFont.truetype('/Library/Fonts/SF-Pro-Display-Medium.otf', 176)
P = lambda *a: os.path.join(ROOT, 'public', *a)

PAGES = [
    # file, title, background
    ('page-work', 'Work', P('projects/16_samar/samar_cover.webp')),
    ('page-work-it', 'Lavori', P('projects/16_samar/samar_cover.webp')),
    ('page-pricing', 'Pricing', P('projects/01_penthouse_dubai/penthouse_dubai_cover.webp')),
    ('page-pricing-it', 'Prezzi', P('projects/01_penthouse_dubai/penthouse_dubai_cover.webp')),
    ('page-studio', 'Studio', P('projects/02_villa_cape_town/villa_cape_town_cover.webp')),
    ('page-studio-it', 'Studio', P('projects/02_villa_cape_town/villa_cape_town_cover.webp')),
    ('page-learn', 'Learn', P('projects/04_forest_house/forest_house_cover.webp')),
    ('page-learn-it', 'Impara', P('projects/04_forest_house/forest_house_cover.webp')),
    ('page-contact', 'Contact', P('projects/25_casa_cresta/casa_cresta_cover.webp')),
    ('page-contact-it', 'Contatti', P('projects/25_casa_cresta/casa_cresta_cover.webp')),
    ('demo-watch-it-rise', 'Watch it rise', P('demo/hold-to-build/d/0720.avif')),
    ('demo-choose-your-floor', 'Choose your floor', P('demo/choose-your-floor/assets/fly-first.webp')),
    ('demo-guardala-salire', 'Guardala salire', P('demo/hold-to-build/d/0720.avif')),
    ('demo-scegli-il-piano', 'Scegli il piano', P('demo/choose-your-floor/assets/fly-first.webp')),
    ('demo-choose-your-view', 'Choose your view', P('demo/choose-your-view/assets/poster.jpg')),
    ('demo-scegli-la-vista', 'Scegli la vista', P('demo/choose-your-view/assets/poster.jpg')),
]


def load(src):
    if src.endswith('.avif'):  # Pillow may not read AVIF: go through ffmpeg if it is there
        tmp = os.path.join(OUT, '_tmp.png')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, tmp], check=True)
        im = Image.open(tmp).convert('RGB'); os.remove(tmp); return im
    return Image.open(src).convert('RGB')


def cover(im):
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))


def text_layer(title):
    # letters drawn one by one, a little tighter than default, like the site's headlines
    track = -0.035 * FONT.size
    widths = [FONT.getlength(c) for c in title]
    total = sum(widths) + track * (len(title) - 1)
    size = FONT.size
    while total > W - 140:  # long titles shrink to fit
        size -= 6
        f = ImageFont.truetype(FONT.path, size)
        widths = [f.getlength(c) for c in title]; track = -0.035 * size
        total = sum(widths) + track * (len(title) - 1)
    f = ImageFont.truetype(FONT.path, size)
    layer = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(layer)
    x, y = 64, H - 150 - size
    for c, w in zip(title, widths):
        d.text((x, y), c, font=f, fill=255)
        x += w + track
    return layer, y, size


logo = Image.open(os.path.join(OUT, '_logo_w.png')).convert('RGBA')
for name, title, src in PAGES:
    bg = cover(load(src))
    # darker towards the bottom left, where the words sit
    shade = Image.new('L', (W, H))
    sd = ImageDraw.Draw(shade)
    for yy in range(H):
        sd.line([(0, yy), (W, yy)], fill=int(min(1, max(0, (yy / H - 0.25) / 0.75)) ** 1.4 * 175))
    bg = Image.composite(Image.new('RGB', (W, H), (8, 8, 10)), bg, shade)
    txt, ty, size = text_layer(title)
    # the words fade into the picture: full at the top of the letters, softer at the bottom
    fade = Image.new('L', (W, H), 0)
    fd = ImageDraw.Draw(fade)
    top, bottom = ty + size * 0.15, ty + size * 1.15
    for yy in range(H):
        k = 0 if yy < top else min(1, (yy - top) / (bottom - top))
        fd.line([(0, yy), (W, yy)], fill=int(255 * (1 - 0.55 * k)))
    alpha = Image.composite(txt, Image.new('L', (W, H), 0), fade)
    glow = txt.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.35))
    bg = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), bg, glow)
    bg = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), bg, alpha)
    bg.paste(logo, (64, H - 64 - logo.height), logo)
    bg.save(os.path.join(OUT, f'{name}.jpg'), quality=86, optimize=True, progressive=True)
    print(name)
