# Italian versions of the two 3D demos (Nico 9/11). Same frames and clips as the English ones
# (a <base> points the files there, nothing is copied), only the words change.
# Run again after any change to the English pages:  python3 scripts/make-demo-it.py
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, 'public', *a)

HOUSE = [
    ('<html lang="en"', '<html lang="it"'),
    ('<title>Watch it rise · Omnya Lab</title>', '<title>Guardala salire · Omnya Lab</title>'),
    ('An interactive 3D house by Omnya Lab: scroll, and it goes up from the drawing to the front door.',
     'Una casa in 3D interattivo di Omnya Lab: scorri e sale dal disegno fino alla porta di casa.'),
    ('content="Watch it rise · Omnya Lab"', 'content="Guardala salire · Omnya Lab"'),
    ('https://www.omnyalab.com/demo/hold-to-build/"', 'https://www.omnyalab.com/it/demo/hold-to-build/"'),
    ('/og/demo-watch-it-rise.jpg', '/og/demo-guardala-salire.jpg'),
    ('alt="The drawing of a wooden house on its lot in the woods"', 'alt="Il disegno di una casa di legno sul suo terreno nel bosco"'),
    ('>Blueprint<', '>Progetto<'),
    ('Watch it rise · loading', 'Guardala salire · caricamento'),
    ('Turn your phone<small>This house is best seen in landscape</small>', 'Gira il telefono<small>Questa casa si guarda in orizzontale</small>'),
    ("tag: 'The plan',    deg: 'Blueprint',    a: 'From blueprint', b: 'to front door',  p: 'Every home starts on paper, drawn for your land, your family, your light.'",
     "tag: 'Il progetto',    deg: 'Progetto',    a: 'Dal progetto', b: 'alla porta di casa',  p: 'Ogni casa nasce sulla carta, disegnata per il tuo terreno, la tua famiglia, la tua luce.'"),
    ("tag: 'Site',        deg: '0°',           a: 'Staked on',      b: 'your lot',       p: 'We mark the footprint before a single shovel moves.'",
     "tag: 'Terreno',        deg: '0°',           a: 'Tracciata sul',      b: 'tuo terreno',       p: 'Segniamo la pianta a terra prima di muovere una sola pala.'"),
    ("tag: 'Foundation',  deg: '67°',          a: 'Rock-solid',     b: 'foundation',     p: 'Poured concrete, cured and checked.'",
     "tag: 'Fondazioni',  deg: '67°',          a: 'Fondazioni',     b: 'solide',     p: 'Cemento gettato, lasciato maturare e controllato.'"),
    ("tag: 'Framing',     deg: '112°',         a: 'The walls',      b: 'go up',          p: 'Floor deck down, first-floor walls standing.'",
     "tag: 'Struttura',     deg: '112°',         a: 'Le pareti',      b: 'salgono',          p: 'Il solaio è posato e le pareti del piano terra sono in piedi.'"),
    ("tag: 'Framing',     deg: '157°',         a: 'Fully',          b: 'framed',         p: 'Second floor, rafters and dormers in place.'",
     "tag: 'Struttura',     deg: '157°',         a: 'Struttura',          b: 'completa',         p: 'Secondo piano, travi del tetto e abbaini al loro posto.'"),
    ("tag: 'Sheathing',   deg: '202°',         a: 'Closed in,',     b: 'sheathed tight', p: 'Every wall and roof wrapped in structural panels.'",
     "tag: 'Pannelli',   deg: '202°',         a: 'Chiusa',     b: 'e rivestita', p: 'Ogni parete e il tetto avvolti nei pannelli strutturali.'"),
    ("tag: 'Dried in',    deg: '247°',         a: 'Dried in.',      b: 'Weather-tight',  p: 'House wrap on, windows set, roof shingled.'",
     "tag: 'Al coperto',    deg: '247°',         a: 'Al coperto',      b: 'da pioggia e vento',  p: 'Telo protettivo, finestre montate e tegole sul tetto.'"),
    ("tag: 'Masonry',     deg: '292°',         a: 'Brick',          b: 'by brick',       p: 'A real masonry chimney, laid by hand.'",
     "tag: 'Muratura',     deg: '292°',         a: 'Mattone',          b: 'dopo mattone',       p: 'Un vero camino in muratura, posato a mano.'"),
    ("tag: 'Exterior',    deg: '315°',         a: 'Exterior',       b: 'complete',       p: 'Siding, trim and shutters. Now it looks like home.'",
     "tag: 'Esterni',    deg: '315°',         a: 'Esterni',       b: 'finiti',       p: 'Rivestimento, cornici e persiane, e adesso sembra casa.'"),
    ("tag: 'Landscape',   deg: '360°',         a: 'The final',      b: 'touches',        p: 'Lawn, gravel drive and gardens.'",
     "tag: 'Giardino',   deg: '360°',         a: 'Gli ultimi',      b: 'dettagli',        p: 'Prato, vialetto in ghiaia e giardini.'"),
    ("tag: 'Step inside', deg: 'Front door',   a: 'Welcome',        b: 'home',           p: 'Open the door and walk in.'",
     "tag: 'Entra', deg: 'Porta d’ingresso',   a: 'Benvenuto',        b: 'a casa',           p: 'Apri la porta ed entra.'"),
    ("tag: 'Inside',      deg: 'Living room',  a: 'Made',           b: 'to live in',     p: 'Oak, stone and morning light in every room.'",
     "tag: 'Dentro',      deg: 'Soggiorno',  a: 'Fatta',           b: 'per viverci',     p: 'Rovere, pietra e luce del mattino in ogni stanza.'"),
    ("' around the build'", "' attorno al cantiere'"),
]

TOWER = [
    ('<html lang="en"', '<html lang="it"'),
    ('SAMAR · Choose your floor', 'SAMAR · Scegli il piano'),
    ('An interactive 3D tower by Omnya Lab: fly in, pick a floor and see its view.',
     'Una torre in 3D interattivo di Omnya Lab: entri in volo, scegli un piano e vedi la sua vista.'),
    ('content="Choose your floor · Omnya Lab"', 'content="Scegli il piano · Omnya Lab"'),
    ('https://www.omnyalab.com/demo/choose-your-floor/"', 'https://www.omnyalab.com/it/demo/choose-your-floor/"'),
    ('/og/demo-choose-your-floor.jpg', '/og/demo-scegli-il-piano.jpg'),
    ('Choose<br>your floor', 'Scegli<br>il piano'),
    ('Move along the tower to light up a floor. Select it to fly in through the glass.',
     'Scorri lungo la torre per accendere un piano, poi sceglilo ed entri in volo attraverso il vetro.'),
    ('<small>Level</small>', '<small>Piano</small>'),
    ('Enter level 15', 'Entra al piano 15'), ('`Enter level ${f.n}`', '`Entra al piano ${f.n}`'),
    ('>Level 15<', '>Piano 15<'), ('`Level ${current.n}`', '`Piano ${current.n}`'),
    ('>Living Room<', '>Soggiorno<'), ('>Bathroom<', '>Bagno<'),
    ('← Back to the tower', '← Torna alla torre'), ('↺ Start again', '↺ Ricomincia'),
    ('>Register interest<', '>Richiedi informazioni<'),
    ("'Penthouse · Four bedrooms'", "'Attico · Quattro camere'"),
    ("'Three bedrooms + study'", "'Tre camere + studio'"), ('>Three bedrooms + study<', '>Tre camere + studio<'),
    ("'Two bedrooms + media room'", "'Due camere + sala cinema'"),
    ("'150 m² balcony on the Gulf'", "'balcone di 150 m² sul Golfo'"),
    ("'330 m² sky terrace and pool'", "'terrazza di 330 m² con piscina'"),
    ('Choose your floor · loading', 'Scegli il piano · caricamento'),
    ('Turn your phone<small>SAMAR is best seen in landscape</small>', 'Gira il telefono<small>SAMAR si guarda in orizzontale</small>'),
]

VIEW = [
    ('<html lang="en"', '<html lang="it"'),
    ('Choose your view · Omnya Lab', 'Scegli la vista · Omnya Lab'),
    ('Three towers in interactive 3D by Omnya Lab: pick a view and fly around them.',
     'Tre torri in 3D interattivo di Omnya Lab: scegli una vista e voli attorno a loro.'),
    ('https://www.omnyalab.com/demo/choose-your-view/"', 'https://www.omnyalab.com/it/demo/choose-your-view/"'),
    ('/og/demo-choose-your-view.jpg', '/og/demo-scegli-la-vista.jpg'),
    ('<div class="eyebrow">Three towers</div>', '<div class="eyebrow">Tre torri</div>'),
    ('Choose<br> your <em>view</em>', 'Scegli<br> la <em>vista</em>'),
    ('<b>Choose your view</b>', '<b>Scegli la vista</b>'),
    ('Choose your view · loading', 'Scegli la vista · caricamento'),
    ('Turn your phone<small>These towers are best seen in landscape</small>', 'Gira il telefono<small>Queste torri si guardano in orizzontale</small>'),
    ('aria-label="Previous view"', 'aria-label="Vista prima"'),
    ('aria-label="Next view"', 'aria-label="Vista dopo"'),
    ("name: 'Front view'", "name: 'Vista frontale'"),
    ("name: 'Side view'", "name: 'Vista laterale'"),
    ("name: 'Back view'", "name: 'Vista da dietro'"),
    ("name: 'Rooftop'", "name: 'Sul tetto'"),
    ("name: 'Above the clouds'", "name: 'Sopra le nuvole'"),
    ("name: 'Aerial view'", "name: 'Vista dall’alto'"),
]

# 16/11 the stadium (Choose your seat): page built from the real version, words here
SEAT = [
    ('<html lang="en"', '<html lang="it"'),
    ('<title>Choose your seat · Omnya Lab</title>', '<title>Scegli il posto · Omnya Lab</title>'),
    ('content="Choose your seat · Omnya Lab"', 'content="Scegli il posto · Omnya Lab"'),
    ('A stadium in interactive 3D by Omnya Lab: pick a stand, a block and your seat, and the camera flies you there.',
     'Uno stadio in 3D interattivo di Omnya Lab: scegli tribuna, blocco e posto, e la camera ti porta lì in volo.'),
    ('https://www.omnyalab.com/demo/choose-your-seat/"', 'https://www.omnyalab.com/it/demo/choose-your-seat/"'),
    ('/og/demo-choose-your-seat.jpg', '/og/demo-scegli-il-posto.jpg'),
    ('Choose your seat · loading', 'Scegli il posto · caricamento'),
    ('Turn your phone<small>This stadium is best seen in landscape</small>', 'Gira il telefono<small>Questo stadio si guarda in orizzontale</small>'),
    ("6:'North Stand',2:'South Stand',0:'East Stand',4:'West Stand',7:'North-East Corner',1:'South-East Corner',3:'South-West Corner',5:'North-West Corner'",
     "6:'Tribuna Nord',2:'Tribuna Sud',0:'Tribuna Est',4:'Tribuna Ovest',7:'Curva Nord-Est',1:'Curva Sud-Est',3:'Curva Sud-Ovest',5:'Curva Nord-Ovest'"),
    ("0:['Lower tier',1450],1:['Middle tier',1250],2:['Upper tier',850]", "0:['Anello basso',1450],1:['Anello medio',1250],2:['Anello alto',850]"),
    ("n<=0?['Sold out','no']:n<=20?[n+' left','few']:[n+' left','ok']", "n<=0?['Esaurito','no']:n<=20?['Ultimi '+n,'few']:[n+' liberi','ok']"),
    ("{k:'From',b:ZN[z]", "{k:'Da',b:ZN[z]"),
    ("b:'Block '+b.n", "b:'Blocco '+b.n"),
    ("{k:'Block '+PICKED.block,b:'Row '+s.r+' · Seat '+s.s", "{k:'Blocco '+PICKED.block,b:'Fila '+s.r+' · Posto '+s.s"),
    ("{k:'Row '+s.r+' · Seat '+s.s,b:'Taken'", "{k:'Fila '+s.r+' · Posto '+s.s,b:'Occupato'"),
    ("av:['Sold out','no'],sold:true}:{k:'Skybox 12 · Front row',b:'Seat '+k,p:'3,750',av:['Leather armchair','ok']}",
     "av:['Esaurito','no'],sold:true}:{k:'Skybox 12 · Prima fila',b:'Posto '+k,p:'3,750',av:['Poltrona in pelle','ok']}"),
    ('<div class="chip"><i></i>Your view</div>', '<div class="chip"><i></i>La tua vista</div>'),
    ('<div class="chip"><i></i>Your view from the box</div>', '<div class="chip"><i></i>La tua vista dal box</div>'),
    ('>Keep my seat</button>', '>Tengo il mio posto</button>'),
    ('>Upgrade · +2,500 AED</button>', '>Passa al VIP · +2,500 AED</button>'),
    ('data-a="up">Upgrade</button>', 'data-a="up">Passa al VIP</button>'),
    ('>Choose your VIP seat →</button>', '>Scegli il posto VIP →</button>'),
    ('<span class="k">Not satisfied?</span>', '<span class="k">Non ti convince?</span>'),
    ('>Another view →</button>', '>Un’altra vista →</button>'),
    ('<span class="k">Row</span>', '<span class="k">Fila</span>'),
    ('<span class="k">Seat</span>', '<span class="k">Posto</span>'),
    ('<span class="k">Seats</span>', '<span class="k">Posti</span>'),
    ('<span class="k">Gate</span>', '<span class="k">Ingresso</span>'),
    ('<span class="k">Entry</span>', '<span class="k">Accesso</span>'),
    ('<b>Block ${p.block}</b>', '<b>Blocco ${p.block}</b>'),
    ('Booked · see you at gate ', 'Prenotato · ci vediamo all’ingresso '),
    ("'Booked · see you at the VIP lift'", "'Prenotato · ci vediamo all’ascensore VIP'"),
    ("pill('Choose another seat',restart)", "pill('Scegli un altro posto',restart)"),
    ('data-b="ok">Confirm ticket</button>', 'data-b="ok">Conferma il biglietto</button>'),
    ('data-b="again">Choose another seat</button>', 'data-b="again">Scegli un altro posto</button>'),
    (".textContent='Confirm ticket'", ".textContent='Conferma il biglietto'"),
    ("b.textContent='Confirmed ✓'", "b.textContent='Confermato ✓'"),
    ("b:'Another view',p:'3,750',av:['VIP · Level 2','ok']", "b:'Un’altra vista',p:'3,750',av:['VIP · Livello 2','ok']"),
    ("'Move over the stadium and click a stand',2:'Now pick a block',3:'Pick a free seat',5:'Pick your VIP armchair'",
     "'Passa sullo stadio e scegli una tribuna',2:'Ora scegli un blocco',3:'Scegli un posto libero',5:'Scegli la tua poltrona VIP'"),
    ("'Tap a stand to see the price',2:'Tap a block',3:'Tap a free seat',5:'Tap your VIP armchair'",
     "'Tocca una tribuna per vedere il prezzo',2:'Tocca un blocco',3:'Tocca un posto libero',5:'Tocca la tua poltrona VIP'"),
    ("'Tap it again to fly in',2:'Tap it again to go in',3:'Tap it again to take the seat',5:'Tap it again to sit there'",
     "'Tocca di nuovo per volare lì',2:'Tocca di nuovo per entrare',3:'Tocca di nuovo per prendere il posto',5:'Tocca di nuovo per sederti'"),
]


def make(src, dst, base, pairs, extra=()):
    s = open(src, encoding='utf-8').read()
    for a, b in list(pairs) + list(extra):
        if a not in s:
            continue  # the phone and computer pages differ a little: skip what a page does not have
        s = s.replace(a, b)
    # every file (frames, clips, fonts, logos) comes from the English folder
    s = re.sub(r'(<meta charset="utf-8">)', r'\1\n<base href="%s">' % base, s, count=1)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'w', encoding='utf-8').write(s)
    left = [w for w in ('Watch it rise', 'Turn your phone', 'Choose<br>', 'Choose your view', 'Front view', 'Enter level', 'Back to the tower', 'Register interest', 'bedrooms') if w in s]
    print(os.path.relpath(dst, ROOT), 'English left:', left or 'none')


make(P('demo/hold-to-build/index.html'), P('it/demo/hold-to-build/index.html'), '/demo/hold-to-build/', HOUSE)
make(P('demo/choose-your-floor/index.html'), P('it/demo/choose-your-floor/index.html'), '/demo/choose-your-floor/', TOWER,
     [("location.replace('m/' + location.search)", "location.replace('/it/demo/choose-your-floor/m/' + location.search)")])
make(P('demo/choose-your-floor/m/index.html'), P('it/demo/choose-your-floor/m/index.html'), '/demo/choose-your-floor/m/', TOWER)
make(P('demo/choose-your-view/index.html'), P('it/demo/choose-your-view/index.html'), '/demo/choose-your-view/', VIEW)
make(P('demo/choose-your-seat/index.html'), P('it/demo/choose-your-seat/index.html'), '/demo/choose-your-seat/', SEAT)

# 25/11 (Nico): the two new towers (Burj Al Waha, Æther). Their pages read their own words from <html lang> (loading, turn your phone, the floor card),
# so here only the head changes.
WAHA = [
    ('<html lang="en"', '<html lang="it"'),
    ('<title>Burj Al Waha · Choose your floor · Omnya Lab</title>', '<title>Burj Al Waha · Scegli il piano · Omnya Lab</title>'),
    ('content="Burj Al Waha · Choose your floor · Omnya Lab"', 'content="Burj Al Waha · Scegli il piano · Omnya Lab"'),
    ('A glass tower on the Dubai Hills golf course in interactive 3D by Omnya Lab: pick a floor, step inside and walk through it.',
     'Una torre di vetro sul golf di Dubai Hills in 3D interattivo di Omnya Lab: scegli un piano, entri e ci cammini dentro.'),
    ('https://www.omnyalab.com/demo/burj-al-waha/"', 'https://www.omnyalab.com/it/demo/burj-al-waha/"'),
]
make(P('demo/burj-al-waha/index.html'), P('it/demo/burj-al-waha/index.html'), '/demo/burj-al-waha/', WAHA)
AETHER = [
    ('<html lang="en"', '<html lang="it"'),
    ('<title>Æther · Choose your floor · Omnya Lab</title>', '<title>Æther · Scegli il piano · Omnya Lab</title>'),
    ('content="Æther · Choose your floor · Omnya Lab"', 'content="Æther · Scegli il piano · Omnya Lab"'),
    ('A twin tower in interactive 3D by Omnya Lab: pick a floor, fly inside, look around the house and go up to the Glass Crown.',
     'Una torre in 3D interattivo di Omnya Lab: scegli un piano, entri in volo, ti guardi intorno in casa e sali al Glass Crown.'),
    ('https://www.omnyalab.com/demo/aether/"', 'https://www.omnyalab.com/it/demo/aether/"'),
]
make(P('demo/aether/index.html'), P('it/demo/aether/index.html'), '/demo/aether/', AETHER)

# 25/11 (Nico): the Riyadh mega project, Burj Al Ballur (the views page of the three towers, purple).
BALLUR = [
    ('<html lang="en"', '<html lang="it"'),
    ('Burj Al Ballur · Choose your view · Omnya Lab', 'Burj Al Ballur · Scegli la vista · Omnya Lab'),
    ('The new Riyadh mega project in interactive 3D by Omnya Lab: pick a view and fly around the tower, into the sky pool and up to the crown.',
     'Il nuovo mega progetto di Riyadh in 3D interattivo di Omnya Lab: scegli una vista e voli attorno alla torre, nella piscina in cielo e fino alla corona.'),
    ('https://www.omnyalab.com/demo/burj-al-ballur/"', 'https://www.omnyalab.com/it/demo/burj-al-ballur/"'),
    ('Choose<br> your <em>view</em>', 'Scegli<br> la <em>vista</em>'),
    ('<b>Choose your view</b>', '<b>Scegli la vista</b>'),
    ('Choose your view · loading', 'Scegli la vista · caricamento'),
    ('Turn your phone<small>This tower is best seen in landscape</small>', 'Gira il telefono<small>Questa torre si guarda in orizzontale</small>'),
    ('aria-label="Previous view"', 'aria-label="Vista prima"'),
    ('aria-label="Next view"', 'aria-label="Vista dopo"'),
    ("name: 'Sky pool'", "name: 'Piscina in cielo'"),
    ("name: 'Lounge'", "name: 'Lounge'"),
    ("name: 'City view'", "name: 'Vista sulla città'"),
    ("name: 'Side view'", "name: 'Vista di lato'"),
    ("name: 'Crown'", "name: 'La corona'"),
    ("name: 'Top view'", "name: 'Dall’alto'"),
    ("name: 'Tower view'", "name: 'La torre'"),
]
make(P('demo/burj-al-ballur/index.html'), P('it/demo/burj-al-ballur/index.html'), '/demo/burj-al-ballur/', BALLUR)
