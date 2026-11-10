// The short list of the last payments, for the mirror of Nico's own app (api/centrale.js). When his Mac is off the
// mirror's numbers stand still at the hour of the last push: this list is what lets it say "after that, N payments
// came in, +X €". The Stripe webhook adds one row AFTER the buyer has been served, and nothing here can get in the
// way of that: noteSale never throws, is never waited for, and without Redis it does nothing.
// A row is the hour, the amount, the currency and the product names. No buyer's name, no email.
import { waitUntil } from '@vercel/functions';
import { redis, hasStore } from './store.js';

export const SALES = 'omnya:centrale:vendite';
export const KEEP = 50;

export function noteSale(event, session, names) {
  try {
    if (!hasStore()) return;
    const row = JSON.stringify({
      i: String(session?.id || '').slice(-16), // a Stripe retry of the same checkout is counted once (the reader drops doubles)
      t: (Number(event?.created) || Math.floor(Date.now() / 1000)) * 1000,
      a: Number(session?.amount_total) || 0,
      c: String(session?.currency || 'eur').toLowerCase().slice(0, 8),
      n: (Array.isArray(names) ? names : []).slice(0, 8).map((x) => String(x).slice(0, 80)),
    });
    const write = redis('LPUSH', SALES, row).then(() => redis('LTRIM', SALES, 0, KEEP - 1));
    // a Redis that hangs keeps nothing open for more than a few seconds
    const job = Promise.race([write, new Promise((done) => setTimeout(done, 4000))]).catch(() => {});
    try {
      waitUntil(job); // on Vercel the answer to Stripe goes out now and the row is written right after
    } catch {}
  } catch {}
}

/** The payments newer than `since` (ms): how many, and the sum per currency in cents. Doubles are dropped. */
export function salesAfter(rows, since) {
  const seen = new Set();
  const out = { n: 0, somme: {}, ultimo: 0 };
  for (const raw of rows || []) {
    let r;
    try {
      r = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!r || !(r.t > since) || seen.has(r.i || r.t)) continue;
    seen.add(r.i || r.t);
    out.n += 1;
    out.somme[r.c || 'eur'] = (out.somme[r.c || 'eur'] || 0) + (Number(r.a) || 0);
    out.ultimo = Math.max(out.ultimo, r.t);
  }
  return out;
}
