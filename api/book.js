// POST /api/book { type, starts: [ms], name, email, note, lang, tz, website }
// Checks again that every slot is free, takes it in Redis, sends the invites, saves the booking.
import { randomUUID } from 'node:crypto';
import { types } from './_lib/config.js';
import { freeSlots } from './_lib/slots.js';
import { hold, unhold, record } from './_lib/store.js';
import { sendBooking } from './_lib/mail.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const validTz = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export async function POST(request) {
  let b;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'bad' }, 400);
  }
  // the hidden "website" field is only ever filled in by bots
  if (b.website) return json({ ok: true });
  const type = types[b.type] ? b.type : null;
  const name = String(b.name || '').trim().slice(0, 100);
  const email = String(b.email || '').trim().slice(0, 200);
  const note = String(b.note || '').trim().slice(0, 1500);
  const lang = b.lang === 'it' ? 'it' : 'en';
  const tz = typeof b.tz === 'string' && validTz(b.tz) ? b.tz : 'Europe/Rome';
  const starts = Array.isArray(b.starts) ? [...new Set(b.starts.map(Number))].sort((x, y) => x - y) : [];
  if (!type || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || starts.length !== types[type].calls) return json({ error: 'bad' }, 400);

  const len = types[type].minutes * 60_000;
  const ranges = starts.map((s) => [s, s + len]);
  if (ranges.some(([s], i) => i && s < ranges[i - 1][1])) return json({ error: 'bad' }, 400);

  try {
    const free = new Set(await freeSlots(type));
    if (!starts.every((s) => free.has(s))) return json({ error: 'taken' }, 409);
  } catch (e) {
    console.error('[book] calendar', e);
    return json({ error: 'calendar' }, 503);
  }

  const id = randomUUID().slice(0, 13);
  if (!(await hold(ranges, id))) return json({ error: 'taken' }, 409);

  const booking = { id, type, typeName: types[type].name[lang], ranges, name, email, note, lang, tz };
  try {
    await sendBooking(booking);
  } catch (e) {
    console.error('[book] mail', e);
    await unhold(ranges);
    return json({ error: 'mail' }, 502);
  }
  try {
    await record(ranges, id, { ...booking, at: Date.now() });
  } catch (e) {
    console.error('[book] record', e);
  }
  return json({ ok: true, starts });
}
