// THE 3D FUTURE (20/11): the price decision of api/_lib/club.js in every case, plus the token, the receipt number,
// the welcome email text and the X2 date of the delivery email. Nothing leaves the computer (no Stripe, no Redis, no mail).
// Usage (repo root): node scripts/club-test.mjs
process.env.CLUB_SECRET ||= 'test-secret-only-here';
const { decide, phaseAt, EARLY, OPEN, FOUNDERS_END, RESERVE_FROM, reservedText, signToken, readToken, cleanReceipt, welcomeText, memberToken, readMember } = await import('../api/_lib/club.js');

let fail = 0, n = 0;
const eq = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; console.log('FAIL', what, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); } };

const at = { before: EARLY - 1, early: EARLY, open: OPEN, after: FOUNDERS_END, later: Date.parse('2027-03-01T12:00:00+01:00') };
eq(phaseAt(Date.parse('2026-11-28T08:59:59+01:00')), 'before', '08:59:59 Rome is before');
eq(phaseAt(Date.parse('2026-11-28T09:00:00+01:00')), 'early', '09:00 Rome is early');
eq(phaseAt(Date.parse('2026-11-28T17:59:59+01:00')), 'early', '17:59:59 Rome is early');
eq(phaseAt(Date.parse('2026-11-28T18:00:00+01:00')), 'open', '18:00 Rome is open');
eq(phaseAt(Date.parse('2026-12-04T23:59:59+01:00')), 'open', 'Fri 4/12 23:59:59 Rome is open');
eq(phaseAt(Date.parse('2026-12-05T00:00:00+01:00')), 'after', 'Sat 5/12 00:00 Rome: the founders price is over, the doors stay open (24/11)');
eq(phaseAt(Date.parse('2027-06-01T12:00:00+02:00')), 'after', 'June 2027: the doors are still open');

// every phase × buyer or not × seats 0 / 99 / 100 × month or year (waitlist: false, then true in the early hours)
const rows = [];
for (const phase of Object.keys(at)) for (const buyer of [false, true]) for (const waitlisted of [false, true]) for (const taken of [0, 99, 100]) for (const plan of ['month', 'year']) {
  const d = decide({ now: at[phase], taken, buyer, waitlisted, plan });
  let want;
  const ph = phase === 'later' ? 'after' : phase;
  if (phase === 'before') want = { ok: true, phase: ph, key: plan === 'year' ? 'Y90' : 'M9', eur: plan === 'year' ? 90 : 9, reserve: true }; // 25/11: the reservation
  else if (phase === 'early' && !buyer && !waitlisted) want = { ok: false, phase: ph, error: 'early' };
  else {
    // 23/11: until 4/12 €9 for everyone (FOUNDERS_ROUND); 24/11: after it the doors stay open at €19, guide buyers €9
    const low = phase === 'early' || phase === 'open' || buyer;
    want = { ok: true, phase: ph, key: plan === 'year' ? (low ? 'Y90' : 'Y190') : low ? 'M9' : 'M19', eur: plan === 'year' ? (low ? 90 : 190) : low ? 9 : 19 };
  }
  eq(d, want, `${phase} buyer=${buyer} waitlist=${waitlisted} seats=${taken} ${plan}`);
  rows.push([phase, buyer ? 'buyer' : '-', waitlisted ? 'list' : '-', taken, plan, d.ok ? `€${d.eur} (${d.key})` : `refused: ${d.error}`]);
}
// the table the report quotes (month only, waitlist off unless early)
for (const r of rows.filter((r) => r[4] === 'month' && (r[2] === '-' || r[0] === 'early'))) console.log(r.map(String).map((s, i) => s.padEnd([7, 6, 5, 4, 6][i] || 0)).join(' '));

// the hand-written cases of Nico's decisions, said in words
eq(decide({ now: at.open, taken: 99, plan: 'month' }).eur, 9, 'seat 100 still €9');
eq(decide({ now: at.open, taken: 100, plan: 'month' }).eur, 9, 'seat 101 is still €9 in the founders round (23/11)');
eq(decide({ now: at.open, taken: 250, buyer: true, plan: 'month' }).eur, 9, 'a guide buyer is €9 after the first 100');
eq(decide({ now: at.open, taken: 100, buyer: true, plan: 'year' }).eur, 90, 'a guide buyer pays €90 a year');
eq(decide({ now: at.open, taken: 100, plan: 'year' }).eur, 90, 'still €90 a year after the first 100 in the founders round');
eq(decide({ now: at.early, taken: 0, waitlisted: true, plan: 'month' }).eur, 9, 'the waitlist gets in at 09:00');
eq(decide({ now: Date.parse('2026-12-04T23:59:59+01:00'), taken: 300, plan: 'month' }).eur, 9, 'Fri 4/12 23:59:59 Rome is still €9');
eq(decide({ now: RESERVE_FROM - 1, plan: 'month' }), { ok: false, phase: 'before', error: 'closed' }, 'before the reservations: closed');
eq(decide({ now: Date.parse('2026-11-25T10:00:00+01:00'), plan: 'month' }), { ok: true, phase: 'before', key: 'M9', eur: 9, reserve: true }, '25/11: a reservation at €9');
eq(decide({ now: EARLY, waitlisted: true, plan: 'month' }).reserve, undefined, '28/11 09:00: no more reservations, a normal join');
eq(reservedText({ name: 'Marco', rank: 7, portal: 'P' }).includes("You're one of the first 100 who reserved"), true, 'R1 with the gift');
eq(/number|#\d|\b7\b/.test(reservedText({ name: 'Marco', rank: 7, portal: 'P' })), false, 'R1 never says the place in line (26/11)');
eq(reservedText({ name: 'Marco', rank: 101, portal: 'P' }).includes('were all taken'), true, 'R1 after the 100 gifts');
eq(reservedText({ name: 'Marco', rank: 3, portal: 'P' }).startsWith('Your seat is reserved, Marco.\n\nNothing was charged today.'), true, 'R1 opening');
eq(decide({ now: at.after, taken: 0, plan: 'month' }).key, 'M19', 'Sat 5/12 00:00: €19 a month, the doors are open (24/11)');
eq(decide({ now: at.after, taken: 0, plan: 'year' }).key, 'Y190', 'Sat 5/12 00:00: €190 a year');
eq(decide({ now: at.later, taken: 0, buyer: true, plan: 'month' }).key, 'M9', 'a guide buyer is still €9 after 4/12');
eq(decide({ now: at.later, taken: 0, buyer: true, plan: 'year' }).key, 'Y90', 'a guide buyer is still €90 a year after 4/12');

// the buyer token
const tok = signToken('r:1415-7362');
eq(readToken(tok), 'r:1415-7362', 'token reads back');
eq(readToken(tok.slice(0, -1) + (tok.endsWith('A') ? 'B' : 'A')), null, 'a changed token is refused');
eq(readToken('nonsense'), null, 'garbage is refused');
eq(readToken(signToken('e:a@b.co', -10)), null, 'an expired token is refused');
eq(tok.length < 60, true, 'the token is short');

// the receipt number as people type it
eq(['#1415-7362', ' 1415-7362 ', '1415 7362', '# 1415-7362', '14157362', 'abcd-efgh', ''].map(cleanReceipt), ['1415-7362', '1415-7362', '1415-7362', '1415-7362', '', '', ''], 'receipt numbers');

// W1 word for word (28/11, Nico: no House Builder skill, rewritten alla Hormozi), with the withdrawal line
eq(welcomeText({ name: 'Marco', inside: 'I', skill: 'K', portal: 'P' }),
  "You're in, Marco, and from today you're not just watching our reels, you're building them with us.\n\nThis is your own link to the club and it works like a key, so keep it and don't share it: your courses, the Vault with the files of every build, the Full guides and the Feed are all behind it, and if you open it on your phone and add it to your Home Screen, the club is one tap away like an app:\nI\n\nStart with the first course, 11 short steps where you see every click and build your own tower, the kind where buyers choose their floor, and when it's live send it to me from the club page, because I look at every first build myself.\n\nIf you ever want to cancel, it's one tap here: P\n\nTo withdraw within 14 days: omnyalab.com/withdraw\n\nNico",
  'W1 text (28/11: the club page, no skill)');
eq(welcomeText({ name: 'Marco', inside: 'I', skill: 'K', portal: 'P', founder: 3 }).split('\n\n')[2].startsWith("And because you saved your seat before the doors opened, you're one of our founders"), true, 'W1 founder line after the link');
eq(/House Builder|\nK\n/.test(welcomeText({ name: 'Marco', inside: 'I', skill: 'K', portal: 'P', founder: 3 })), false, 'W1 without the skill (28/11)');
// 25/11: the member's own link
const mt = memberToken('Marco@Example.com');
eq(readMember(mt), 'marco@example.com', 'member link reads back (email in lower case)');
eq(readMember(mt.slice(0, -1) + (mt.endsWith('A') ? 'B' : 'A')), null, 'a changed member link is refused');
eq(readMember(signToken('e:marco@example.com')), null, 'a buyer token is not a member link');
eq(readToken(mt), null, 'a member link is not a buyer token');

// without the portal link the cancel line asks to reply (20/11)
eq(welcomeText({ name: 'Marco', inside: 'I', skill: 'K', portal: '' }).split('\n\n')[3], 'Reply to this email to cancel.', 'W1 cancel line without the portal');

// the four live prices are the base, the env variable wins when set
// 25/11: Nico's preview of the members' page: open, with the gift, without touching the store
{ const { insideData, PREVIEW_EMAIL, insideUrl } = await import('../api/_lib/club.js');
  const pv = await insideData(PREVIEW_EMAIL);
  eq([pv.state, pv.name, pv.gifts.length > 0, pv.lessons.length > 0], ['open', 'Nico', true, true], 'preview: open page with the gift');
  eq(readMember(insideUrl(PREVIEW_EMAIL).split('m=')[1]), PREVIEW_EMAIL, 'preview link reads back as the preview address'); }
const { priceId } = await import('../api/_lib/club.js');
eq(['M9', 'M19', 'Y90', 'Y190'].map(priceId), ['price_1UdoXdATIF7pxfqf6XDiZBM9', 'price_1UdoXdATIF7pxfqfuAmUNY34', 'price_1UdoXdATIF7pxfqfrq5TEnf9', 'price_1UdoXdATIF7pxfqfa6wu7qpT'], 'live price ids');
process.env.CLUB_PRICE_M9 = 'price_from_env'; eq(priceId('M9'), 'price_from_env', 'env price wins'); delete process.env.CLUB_PRICE_M9;
eq(priceId('nope'), '', 'unknown price key');

// X2: the delivery email stops offering "Everything we teach · upgrade" from Sat 28/11 00:00 Rome
try {
  const { upgradeFor } = await import('../api/stripe-webhook.js');
  const one = [{ name: 'How to build a tower that sells with AI', en: 'en/full-tower-blueprint.pdf' }];
  eq(upgradeFor(['The Full Tower Blueprint'], one, Date.parse('2026-11-27T23:59:59+01:00')), true, 'upgrade line on Fri 27/11 23:59:59');
  eq(upgradeFor(['The Full Tower Blueprint'], one, Date.parse('2026-11-28T00:00:00+01:00')), false, 'no upgrade line from Sat 28/11 00:00');
} catch (e) { fail++; console.log('FAIL could not load the webhook:', e.message); }

// 26/11 (Nico: F1 C1 H3 G2): the builds feed on the memory store (no Redis, no email leaves)
{ const { kv } = await import('../api/_lib/store.js');
  const { KEYS, insideData, PREVIEW_EMAIL } = await import('../api/_lib/club.js');
  const F = await import('../api/_lib/club-feed.js');
  const mem = (email, o) => kv('HSET', KEYS.members, email, JSON.stringify({ email, name: 'Test', status: 'active', round: '1', at: '2026-11-25T10:00:00.000Z', ...o }));
  await mem('a@test.club', { name: 'Ana', reserved: true, rank: 3, welcomed: '2026-11-28T08:00:00Z' });
  await mem('b@test.club', { name: 'Ben' });
  await mem('w@test.club', { name: 'Wait', reserved: true, rank: 5 });
  await mem('c@test.club', { name: 'Gone', status: 'canceled' });
  const A = await F.feedMember('a@test.club'), B = await F.feedMember('b@test.club'), Wt = await F.feedMember('w@test.club'), N = await F.feedMember(PREVIEW_EMAIL);
  eq([A.name, A.founder, A.open, B.open, Wt.open, N.nico], ['Ana', true, true, true, false, true], 'feed: who can post (a reservation only after its first month)');
  eq([await F.feedMember('c@test.club'), await F.feedMember('nobody@test.club')], [null, null], 'feed: no feed for who left or is not a member');
  eq((await F.feed(B)).posts.length, 0, 'feed: empty at the start, nothing invented');
  const img = 'data:image/jpeg;base64,' + Buffer.from('fakejpeg').toString('base64');
  const p1 = await F.addPost(A, { link: 'https://ana-tower.netlify.app', caption: 'My tower', img, w: 10, h: 12 });
  eq([p1.name, p1.mine, p1.likes, p1.img.startsWith('/api/club/img?id='), 'email' in p1], ['Ana', true, 0, true, false], 'feed: a post, its photo, no email shown');
  const fb = await F.feed(B); eq([fb.posts.length, fb.posts[0].mine, fb.posts[0].founder], [1, false, true], 'feed: everyone sees it');
  eq((await F.like(B, p1.id, true)).likes, 1, 'like'); eq((await F.like(B, p1.id, true)).likes, 1, 'like twice counts once'); eq((await F.like(B, p1.id, false)).likes, 0, 'unlike');
  await F.like(B, p1.id, true); eq((await F.feed(B)).posts[0].liked, true, 'feed: my like shows');
  const c = await F.addComment(B, p1.id, 'Great'); eq([c.comments, c.comment.name, c.comment.mine], [1, 'Ben', true], 'comment');
  eq((await F.comments(A, p1.id)).map((x) => [x.name, x.text, x.mine]), [['Ben', 'Great', false]], 'comments read back');
  eq((await F.share(B, p1.id)).shares, 1, 'share');
  eq((await F.photo(p1.id))[0], 'image/jpeg', 'the photo comes back as an image');
  eq([F.hideOk(p1.id, F.hideSig(p1.id)), F.hideOk(p1.id, 'x' + F.hideSig(p1.id).slice(1)), F.hideOk('bad id', F.hideSig('bad id'))], [true, false, false], 'hide link: signed, a changed one is refused');
  await F.setHidden(p1.id, true);
  eq([(await F.feed(B)).posts.length, (await F.feed(N)).posts[0].hidden, await F.like(B, p1.id, true)], [0, true, null], 'hidden: gone for members, Nico still sees it marked');
  await F.setHidden(p1.id, false); eq((await F.feed(B)).posts.length, 1, 'shown again');
  let bad = ''; try { await F.addPost(A, { link: 'https://x.co', img: 'data:text/html;base64,PGI+' }); } catch (e) { bad = e.code; } eq(bad, 'bad_image', 'only a photo is taken as the photo');
  const ia = await insideData('a@test.club'), ib = await insideData('b@test.club');
  eq([ia.posted, ib.posted, ia.remind], [true, false, true], 'the First build badge after a post; Friday email on by default');
  await F.setRemind(B, false); eq((await insideData('b@test.club')).remind, false, 'Friday email turned off');
  eq([ia.gifts.map((g) => g.cover), (await insideData('w@test.club')).giftList.map((g) => g.cover)].map((x) => x[0]), ['/learn/pk_pb01.webp', '/learn/pk_pb01.webp'], 'gift covers, open and waiting');
  const nt = await F.notifyCourse({ subject: 's', text: 'Hi {name} {link}' }, async () => {});
  eq([nt.members, nt.sent], [1, 1], 'Friday email: members who are in, minus who turned it off'); }

// 27/11: the Saturday charge welcomes the reservation in any currency (Adaptive Pricing), never a charge that is not the club's
{ const { kv } = await import('../api/_lib/store.js');
  const { KEYS, clubCharged } = await import('../api/_lib/club.js');
  process.env.FILES_SECRET = process.env.FILES_SECRET || 'test-only';
  const res = async (email, cus) => { await kv('HSET', KEYS.members, email, JSON.stringify({ email, name: 'R', status: 'active', round: '1', reserved: true, rank: 4, session: 'cs_' + cus, at: '2026-11-25T10:00:00.000Z' })); await kv('HSET', KEYS.byCustomer, cus, email); };
  const welcomed = async (email) => !!JSON.parse(await kv('HGET', KEYS.members, email)).welcomed;
  await res('eur@test.club', 'cus_eur'); await res('usd@test.club', 'cus_usd'); await res('odd@test.club', 'cus_odd');
  await clubCharged(null, { status: 'succeeded', currency: 'eur', amount: 900, customer: 'cus_eur', invoice: 'in_1' });
  await clubCharged(null, { status: 'succeeded', currency: 'usd', amount: 1049, customer: 'cus_usd', invoice: 'in_2' });
  await clubCharged(null, { status: 'succeeded', currency: 'usd', amount: 1049, customer: 'cus_odd' });   // no invoice: not a subscription charge
  await clubCharged(null, { status: 'succeeded', currency: 'eur', amount: 4700, customer: 'cus_odd', invoice: 'in_3' });   // euro but not €9 / €90
  eq([await welcomed('eur@test.club'), await welcomed('usd@test.club'), await welcomed('odd@test.club')], [true, true, false], 'W1: €9 and the dollar invoice welcome, odd charges do not'); }

// 27/11: the course films only with the cookie the member page gives (middleware.js checks what api/_lib/club.js signs)
{ process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_only';
  const { hlsCookie } = await import('../api/_lib/club.js'); const { allowed } = await import('../middleware.js');
  const c = hlsCookie().split(';')[0], bad = c.slice(0, -2) + (c.endsWith('AA') ? 'BB' : 'AA');
  eq([await allowed(c), await allowed('x=1; ' + c + '; y=2'), await allowed(bad), await allowed(''), await allowed(c, Date.now() + 9 * 86400e3)], [true, true, false, false, false], 'films: the member cookie opens them, a changed, missing or old one does not'); }

// 27/11: each member's progress (a step opens only after the one before) and profile, then the feed shows the new name
{ const { saveProgress, getProgress, saveProfile, getProfile, avatar, isOpen } = await import('../api/_lib/club-me.js');
  const E = 'p@test.club';
  eq([await saveProgress(E, 2, { done: true })], [null], 'progress: step 2 is closed before step 1 is finished');
  await saveProgress(E, 1, { t: 80 }); let p = await getProgress(E);
  eq([p.d, p.t[1]], [[], 80], 'progress: the second where the member stopped');
  await saveProgress(E, 1, { done: true }); await saveProgress(E, 2, { t: 3 }); p = await getProgress(E);
  eq([p.d, p.t[1], p.t[2], isOpen(p.d, 2), isOpen(p.d, 3)], [[1], undefined, undefined, true, false], 'progress: step 1 done opens step 2 (under 5 s is not kept)');
  eq([await saveProgress(E, 12, { done: true }, 11), await saveProgress(E, 0, {}, 11)], [null, null], 'progress: only steps 1-11');
  let err = ''; try { await saveProfile(E, { name: ' ' }); } catch (e) { err = e.code; } eq(err, 'bad_request', 'profile: a name is needed');
  err = ''; try { await saveProfile(E, { name: 'Ana', ig: 'not valid!' }); } catch (e) { err = e.code; } eq(err, 'bad_request', 'profile: a wrong Instagram name');
  const px = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg').toString('base64');
  const pr = await saveProfile(E, { name: '  Ana   Rossi ', ig: '@ana.3d', bio: 'Towers in Milan', img: px });
  eq([pr.name, pr.ig, pr.bio, /^\/api\/club\/avatar\?id=[A-Za-z0-9_-]{12}$/.test(pr.av)], ['Ana Rossi', 'ana.3d', 'Towers in Milan', true], 'profile: saved clean, with the photo');
  const a1 = await avatar(pr.av.split('=')[1]); eq([a1[0], a1[1].toString()], ['image/jpeg', 'fake-jpeg'], 'profile: the photo comes back');
  const pr2 = await saveProfile(E, { name: 'Ana', noimg: true }); eq([pr2.av, await avatar(pr.av.split('=')[1])], ['', null], 'profile: the photo removed');
  const { kv } = await import('../api/_lib/store.js'); const { KEYS } = await import('../api/_lib/club.js'); const F = await import('../api/_lib/club-feed.js');
  await kv('HSET', KEYS.members, E, JSON.stringify({ email: E, name: 'Ana Old', status: 'active', round: '1', at: '2026-11-28T10:00:00.000Z' }));
  eq((await F.feedMember(E)).name, 'Ana', 'feed: the name of the profile wins'); }

console.log(fail ? `\n${fail} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(fail ? 1 : 0);
