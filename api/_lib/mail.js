// Invitations and confirmations, sent through Resend's SMTP (free plan) with nodemailer,
// which puts the invite in the email as a real calendar part (text/calendar; method=REQUEST):
// Outlook adds it to the calendar on arrival, Gmail and Apple Mail show "Accept".
// Nico's copy is organised by the client, the client's copy by Nico, so every
// "Accept" goes to a real person and never to the sending address.
import nodemailer from 'nodemailer';
import { host, TZ } from './config.js';
import { icsStamp } from './time.js';

const FROM = process.env.BOOKING_FROM || 'Omnya Lab <booking@omnyalab.com>';
const MEET = process.env.MEETING_URL || '';

const transport = process.env.RESEND_API_KEY
  ? nodemailer.createTransport({ host: 'smtp.resend.com', port: 465, secure: true, auth: { user: 'resend', pass: process.env.RESEND_API_KEY } })
  : nodemailer.createTransport({ jsonTransport: true }); // local preview: nothing leaves the computer

export const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// a CN goes in quotes, so a · or a comma in a name can't break the line
const cn = (s) => `"${String(s).replace(/["\r\n]/g, '')}"`;
const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// .ics lines stay under 75 bytes
export function fold(line) {
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function invite({ uid, start, end, summary, description, organizer, attendee }) {
  const lines = [
    'BEGIN:VCALENDAR', 'PRODID:-//Omnya Lab//Booking//EN', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    MEET && `LOCATION:${esc(MEET)}`,
    MEET && `URL:${MEET}`,
    `ORGANIZER;CN=${cn(organizer.name)}:mailto:${organizer.email}`,
    `ATTENDEE;CN=${cn(attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`,
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'TRANSP:OPAQUE', 'CLASS:PUBLIC',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT15M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}

const words = {
  en: {
    subject: (n, t) => `${n} with Omnya Lab · ${t}`,
    hi: (name) => `Hi ${name},`,
    booked: 'your call is booked. The invitation is attached: accept it and it goes into your calendar.',
    when: 'When',
    call: (i, n) => `Call ${i} of ${n}`,
    join: 'Join the call',
    noLink: 'We’ll send you the video call link before we start.',
    change: 'Need to change the time? Just reply to this email.',
    sign: 'See you soon,\nNico · Omnya Lab',
  },
  it: {
    subject: (n, t) => `${n} con Omnya Lab · ${t}`,
    hi: (name) => `Ciao ${name},`,
    booked: 'la tua call è prenotata. L’invito è allegato: accettalo e finisce nel tuo calendario.',
    when: 'Quando',
    call: (i, n) => `Call ${i} di ${n}`,
    join: 'Entra nella call',
    noLink: 'Ti mandiamo il link della videochiamata prima di iniziare.',
    change: 'Devi cambiare orario? Rispondi a questa mail.',
    sign: 'A presto,\nNico · Omnya Lab',
  },
};

const when = (ms, lang, tz) =>
  new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(ms);

function page(title, rows, cta) {
  return `<!doctype html><html><body style="margin:0;background:#edeae4;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 28px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6761">Omnya Lab</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.1;letter-spacing:-.03em;font-weight:600">${html(title)}</h1>
${rows.map((r) => `<p style="margin:0 0 14px">${r}</p>`).join('\n')}
${cta ? `<p style="margin:28px 0"><a href="${html(cta.href)}" style="display:inline-block;background:#b8613c;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px">${html(cta.label)}</a></p>` : ''}
</div></body></html>`;
}

/**
 * The invite (and confirmation) for every call of one booking, to the client and to Nico.
 * b = { id, type, typeName, ranges: [[s, e]], name, email, note, lang, tz }
 */
export function bookingMails(b) {
  const W = words[b.lang] || words.en;
  const client = { name: b.name, email: b.email };
  const nico = { name: host.name, email: host.email };
  const n = b.ranges.length;
  const lines = (lang, tz) => b.ranges.map(([s], i) => `${n > 1 ? `${(words[lang] || words.en).call(i + 1, n)}: ` : ''}${when(s, lang, tz)}`);
  const clientTimes = lines(b.lang, b.tz);
  const nicoTimes = lines('it', TZ);

  const mails = [];
  for (const [i, [s, e]] of b.ranges.entries()) {
    const part = n > 1 ? ` · ${i + 1}/${n}` : '';
    // to the client
    mails.push({
      from: FROM,
      to: `${b.name} <${b.email}>`,
      replyTo: host.email,
      subject: W.subject(b.typeName + part, when(s, b.lang, b.tz)),
      text: [W.hi(b.name), '', W.booked, '', ...clientTimes, '', MEET ? `${W.join}: ${MEET}` : W.noLink, '', W.change, '', W.sign].join('\n'),
      html: page(`${b.typeName}${part}`, [html(W.hi(b.name)), html(W.booked), `<b>${W.when}</b><br>${clientTimes.map(html).join('<br>')}`, MEET ? '' : html(W.noLink), html(W.change), html(W.sign).replace('\n', '<br>')], MEET && { href: MEET, label: W.join }),
      icalEvent: {
        method: 'REQUEST', filename: 'invite.ics',
        content: invite({ uid: `${b.id}-${i + 1}-c@omnyalab.com`, start: s, end: e, summary: `${b.typeName} · Omnya Lab`, description: `${b.typeName}${part}\n${MEET || W.noLink}`, organizer: nico, attendee: client }),
      },
    });
    // to Nico, in Italian and Rome time
    const info = [`<b>${html(b.name)}</b> · <a href="mailto:${html(b.email)}">${html(b.email)}</a>`, `<b>Quando</b><br>${nicoTimes.map(html).join('<br>')}`, b.note ? `<b>Nota</b><br>${html(b.note).replace(/\n/g, '<br>')}` : '', b.tz !== TZ ? `Il cliente vede gli orari in ${html(b.tz)}.` : ''];
    mails.push({
      from: FROM,
      to: host.email,
      replyTo: `${b.name} <${b.email}>`,
      subject: `Prenotazione: ${b.typeName}${part} · ${b.name} · ${when(s, 'it', TZ)}`,
      text: [`${b.typeName}${part}`, `${b.name} <${b.email}>`, ...nicoTimes, b.note ? `Nota: ${b.note}` : '', `Lingua: ${b.lang} · fuso del cliente: ${b.tz}`].filter(Boolean).join('\n'),
      html: page(`${b.typeName}${part} · ${b.name}`, info.filter(Boolean), MEET && { href: MEET, label: 'Link della call' }),
      icalEvent: {
        method: 'REQUEST', filename: 'invite.ics',
        content: invite({ uid: `${b.id}-${i + 1}-h@omnyalab.com`, start: s, end: e, summary: `${b.typeName}${part} · ${b.name}`, description: `${b.typeName}${part}\n${b.name} <${b.email}>${b.note ? `\n\n${b.note}` : ''}\n\n${MEET}`, organizer: client, attendee: nico }),
      },
    });
  }
  return mails;
}

export async function sendBooking(b) {
  for (const m of bookingMails(b)) {
    await transport.sendMail(m);
    if (!process.env.RESEND_API_KEY) console.log('[booking] mail (not sent, no RESEND_API_KEY):', m.to, '·', m.subject);
  }
}

// 13/11 night (Nico: "the emails must ALWAYS go, free"): omnyalab.com mail is Microsoft 365 (GoDaddy), which sends up to
// 10,000 emails a day from info@omnyalab.com at no cost. With M365_PASS on Vercel the free blueprints go from there,
// and any email that Resend refuses (its free plan stops at 100 a day) goes from there too.
const M365_USER = process.env.M365_USER || 'info@omnyalab.com';
const m365 = process.env.M365_PASS
  ? nodemailer.createTransport({ host: 'smtp.office365.com', port: 587, secure: false, requireTLS: true, auth: { user: M365_USER, pass: process.env.M365_PASS } })
  : null;
export const hasM365 = () => !!m365;
const viaM365 = (m) => m365.sendMail({ ...m, from: `Omnya Lab <${M365_USER}>` });

/** Any other email (the Instagram bot uses it to tell Nico about leads). Resend first, Microsoft 365 if Resend says no. */
export async function sendMail(m) {
  try { return await transport.sendMail({ from: FROM, ...m }); }
  catch (e) { if (!m365) throw e; console.error('[mail] resend failed, via m365:', e.message); return viaM365(m); }
}

/** The free blueprints: Microsoft 365 first (no daily cap that matters), Resend if 365 fails. */
export async function sendFreeMail(m) {
  if (!m365) return transport.sendMail({ from: FROM, ...m });
  try { return await viaM365(m); }
  catch (e) { console.error('[mail] m365 failed, via resend:', e.message); return transport.sendMail({ from: FROM, ...m }); }
}
