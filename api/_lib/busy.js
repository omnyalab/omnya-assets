// Busy blocks from Nico's Outlook calendar, published as ICS ("can view when I'm busy").
// The link lives only in the Vercel env var BOOKING_ICS_URL, never in the repo.
import ICAL from 'ical.js';
import { romeToUtc } from './time.js';

let cache = { at: 0, text: '' };
const TTL = 60_000;

/** All busy [startMs, endMs] blocks that touch [from, to]. */
export async function outlookBusy(from, to) {
  const url = process.env.BOOKING_ICS_URL;
  if (!url) return [];
  if (!cache.text || Date.now() - cache.at > TTL) {
    const res = await fetch(url.replace(/^webcal:/i, 'https:'), { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`calendar ${res.status}`);
    cache = { at: Date.now(), text: await res.text() };
  }
  return parse(cache.text, from, to);
}

const isFree = (ev) => {
  const c = ev.component;
  const busy = String(c.getFirstPropertyValue('x-microsoft-cdo-busystatus') || '').toUpperCase();
  const transp = String(c.getFirstPropertyValue('transp') || '').toUpperCase();
  const status = String(c.getFirstPropertyValue('status') || '').toUpperCase();
  return busy === 'FREE' || status === 'CANCELLED' || (!busy && transp === 'TRANSPARENT');
};

function ms(t) {
  if (t.isDate) return romeToUtc(t.year, t.month, t.day, 0, 0);
  const tz = t.zone && t.zone.tzid;
  // floating times (no zone, or a zone the file doesn't define) are read as Rome time
  if (!tz || tz === 'floating') return romeToUtc(t.year, t.month, t.day, t.hour, t.minute);
  return t.toUnixTime() * 1000;
}

export function parse(text, from, to) {
  const cal = new ICAL.Component(ICAL.parse(text));
  for (const tz of cal.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(tz); } catch {}
  }
  const masters = new Map();
  const exceptions = [];
  for (const c of cal.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(c);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
    else masters.set(`${ex.uid}#${ex.recurrenceId}`, ex);
  }

  const out = [];
  const add = (ev, start, end) => {
    if (isFree(ev)) return;
    const s = ms(start);
    const e = Math.max(end ? ms(end) : s, s + 60_000);
    if (e > from && s < to) out.push([s, e]);
  };
  for (const ev of masters.values()) {
    if (!ev.startDate) continue;
    if (!ev.isRecurring()) {
      add(ev, ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let i = 0, next; i < 5000 && (next = it.next()); i++) {
      if (ms(next) >= to) break;
      const d = ev.getOccurrenceDetails(next);
      add(d.item, d.startDate, d.endDate);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}
