// GET /api/calendar?key=… → the site's bookings as a calendar Nico subscribes to in Outlook
// ("Prenotazioni sito"). The key lives only in the Vercel env var BOOKING_FEED_KEY.
import { bookingsSince } from './_lib/store.js';
import { esc, fold } from './_lib/mail.js';
import { icsStamp } from './_lib/time.js';

const MEET = process.env.MEETING_URL || '';

export async function GET(request) {
  const key = process.env.BOOKING_FEED_KEY;
  if (!key || new URL(request.url).searchParams.get('key') !== key) return new Response('Not found', { status: 404 });
  const rows = await bookingsSince(Date.now() - 30 * 86_400_000);
  const events = rows.flatMap((b, i) => {
    const d = b.details || {};
    const n = d.ranges ? d.ranges.length : 1;
    const part = n > 1 ? ` · ${d.ranges.findIndex(([s]) => s === b.s) + 1}/${n}` : '';
    const who = d.name ? ` · ${d.name}` : '';
    return [
      'BEGIN:VEVENT',
      `UID:${b.id}-${b.s}@omnyalab.com`,
      `DTSTAMP:${icsStamp(d.at || Date.now())}`,
      `DTSTART:${icsStamp(b.s)}`,
      `DTEND:${icsStamp(b.e)}`,
      `SUMMARY:${esc(`${d.typeName || 'Prenotazione'}${part}${who}`)}`,
      `DESCRIPTION:${esc([d.name && d.email ? `${d.name} <${d.email}>` : '', d.note || '', MEET].filter(Boolean).join('\n\n'))}`,
      MEET && `LOCATION:${esc(MEET)}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    ].filter(Boolean);
  });
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Omnya Lab//Booking feed//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Prenotazioni sito', 'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M',
    ...events, 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
}
