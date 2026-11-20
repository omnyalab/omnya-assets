#!/usr/bin/env python3
"""The judge of the follow-up series (api/drip.js), run on Nico's Mac.

Reads /api/drip?report=1 (who got which note, opens, clicks, the comparison group) and the paid Stripe checkouts
(read-only key), then compares, for the people whose 7 days are over, who bought within 7 days:
  - got the series     = 7 days from mail 1
  - comparison group   = asked for a guide the same days, not picked (ticked the update box like them), 7 days from
                         the moment they would have got mail 1
Opens are rough (Apple Mail opens every picture by itself), clicks and purchases are the real signal; replies are
counted in info@'s inbox (search the subjects printed at the end).

Keys from ~/Omnya Automazioni/.env: IG_ADMIN_KEY, STRIPE_KEY (rk_live_, read only). Nothing is written anywhere.
Usage: python3 scripts/drip-report.py [--days 7]
"""
import json, os, sys, time, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime, timezone

DAYS = int(sys.argv[sys.argv.index('--days') + 1]) if '--days' in sys.argv else 7
ENV = os.path.expanduser('~/Omnya Automazioni/.env')
env = dict(l.strip().split('=', 1) for l in open(ENV) if '=' in l and not l.lstrip().startswith('#'))
SITE = 'https://www.omnyalab.com'
SUBJECTS = ['the trick behind the one-take', 'why our first two clips went in the bin', 'never pay for the same clip twice', 'the only reference that matters']


def get(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'omnya-report', **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


rep = get(f"{SITE}/api/drip?key={urllib.parse.quote(env['IG_ADMIN_KEY'])}&status=1&report=1")
people, comp, ev = rep['people'], rep['comparison'], rep['events']
now = time.time() * 1000
W = DAYS * 86400000

# paid checkouts since the first note (minus a day), by email
since = int((min([p['start'] for p in people] + [c['ref'] for c in comp] + [now]) - 86400000) / 1000)
buys = {}
after = None
while True:
    q = {'limit': 100, 'status': 'complete', 'created[gte]': since}
    if after:
        q['starting_after'] = after
    page = get('https://api.stripe.com/v1/checkout/sessions?' + urllib.parse.urlencode(q), {'Authorization': f"Bearer {env['STRIPE_KEY']}"})
    for s in page['data']:
        if s.get('payment_status') != 'paid':
            continue
        e = ((s.get('customer_details') or {}).get('email') or '').strip().lower()
        if e:
            buys.setdefault(e, []).append({'t': s['created'] * 1000, 'eur': (s.get('amount_total') or 0) / 100, 'ref': s.get('client_reference_id') or ''})
    if not page.get('has_more'):
        break
    after = page['data'][-1]['id']


def bought(email, t0):
    return [b for b in buys.get(email, []) if t0 <= b['t'] < t0 + W]


def judge(rows, t0key, label):
    done = [r for r in rows if r[t0key] + W <= now]
    who = [r for r in done if bought(r['email'], r[t0key])]
    rate = 100 * len(who) / len(done) if done else 0
    print(f"{label:<34} {len(done):>6} people with {DAYS} days over · {len(who):>4} bought ({rate:.1f}%)")  # people, not euros: the money is read net in Tana
    return rate


def ts(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime('%d/%m %H:%M')


st = rep['status']
print(f"Series {'ON' if st['on'] else 'OFF'} · cap {st['cap']}/day · today {st['sentToday']} sent, {st['startedToday']} started · {st['people']} people in the series")
print()
sent = Counter()
for p in people:
    for i in range(1, p['step'] + 1):
        sent[i] += 1
print('mail  sent  opened  clicked')
for i in range(1, 5):
    o = sum(1 for k in ev if k.endswith(f'|open{i}'))
    c = sum(1 for k in ev if k.endswith(f'|click{i}'))
    print(f"  {i}   {sent[i]:>5}  {o:>5} ({100 * o / sent[i] if sent[i] else 0:.0f}%)  {c:>4} ({100 * c / sent[i] if sent[i] else 0:.1f}%)")
print()
a = judge(people, 'start', 'Got the series')
b = judge([c for c in comp if c.get('nl')], 'ref', 'Comparison, ticked the box')
judge([c for c in comp if not c.get('nl')], 'ref', 'Comparison, box left empty')
if a or b:
    print(f"\nDifference (series − comparison with the box): {a - b:+.1f} points")
mail_refs = Counter(b['ref'] for v in buys.values() for b in v if b['ref'].startswith('ig_mail'))
if mail_refs:
    print('Checkouts opened from a mail link:', dict(mail_refs))
print('\nReplies: search info@ for "Re: " + ' + ' / '.join(SUBJECTS))
