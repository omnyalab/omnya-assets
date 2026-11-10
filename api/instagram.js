// /api/instagram: the webhook Meta calls for every comment, DM, button tap and "seen" on @omnyalab.
// POST = events, signed with IG_APP_SECRET. Always answers 200, and at once (the DMs go out right
// after the answer), or Meta retries and in the end switches the webhook off.
// GET  = three things:
//   ?hub.mode=subscribe…   Meta checking the address (IG_VERIFY_TOKEN)
//   ?health=IG_ADMIN_KEY   is the bot fine: token, webhook fields, last comment, the line, errors of the last hour
//   ?go=<page>&p=<post>    a click on a link the bot sent (vercel.json sends /the-towers-blueprint?ig=<post>
//                          and the other pages here): counts it for that post and opens the page
import { createHmac, timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { onComment, onMessaging, tick, drain, click, health, noteError, noteComment, isOff } from './_lib/ig.js';

const ON_VERCEL = !!process.env.VERCEL;
const MESSAGE_FIELDS = new Set(['messages', 'messaging_postbacks', 'messaging_seen', 'message_echoes']);
// link previews and crawlers open the link too: they are not clicks
const NOT_A_PERSON = /bot|crawl|spider|preview|facebookexternalhit|facebot|meta-external|whatsapp|telegram|slack|discord|curl|wget|python|headless/i;

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const verify = process.env.IG_VERIFY_TOKEN;
  if (q.get('hub.mode') === 'subscribe') {
    if (verify && q.get('hub.verify_token') === verify) return new Response(q.get('hub.challenge') || '');
    return new Response('Forbidden', { status: 403 });
  }
  if (q.has('go')) {
    const person = !NOT_A_PERSON.test(request.headers.get('user-agent') || '');
    const to = await click(q.get('go'), q.get('p'), q.get('k'), person).catch(() => 'https://www.omnyalab.com/');
    return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  if (q.has('health')) {
    const key = process.env.IG_ADMIN_KEY;
    if (!key || q.get('health') !== key) return new Response('Not found', { status: 404 });
    return new Response(JSON.stringify(await health(), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  return new Response('Forbidden', { status: 403 });
}

function signed(raw, header) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret) return !process.env.VERCEL; // only the local tests run without it
  const want = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
  const got = Buffer.from(header || '');
  return got.length === want.length && timingSafeEqual(got, want);
}

const short = (s) => JSON.stringify(String(s || '').slice(0, 40));

export async function POST(request) {
  const raw = await request.text();
  if (!signed(raw, request.headers.get('x-hub-signature-256'))) return new Response('Bad signature', { status: 401 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('ok');
  }
  // switched off from /api/leads?action=off: Meta still gets its 200, nothing else happens
  if (await isOff().catch(() => false)) {
    console.log('[ig] off: event ignored');
    return new Response(JSON.stringify({ ok: true, off: true, results: [] }), { headers: { 'Content-Type': 'application/json' } });
  }
  const results = [];
  const waiting = []; // comments that joined the line in this call: [place in results, comment id, who, comment]
  const after = []; // DMs and taps: answered after Meta has its 200
  for (const entry of body.entry || []) {
    const own = String(entry.id || '');
    const events = [
      ...(entry.changes || []).map((c) => (c.field === 'comments' ? ['comment', c.value] : MESSAGE_FIELDS.has(c.field) ? ['message', c.value] : null)),
      ...(entry.messaging || []).map((m) => ['message', m]),
      // "standby": the DMs and taps Meta hands us while another app (ManyChat) is the main one for the
      // chat. The bot answers them like the others; if Meta refuses because the chat still belongs to
      // the other app (error #100), it shows in the logs and in the error count, nothing breaks.
      ...(entry.standby || []).map((m) => ['standby', m]),
    ].filter(Boolean);
    for (const [kind, v] of events) {
      if (kind !== 'comment') {
        after.push({ kind, v, own, i: kind === 'standby' ? -1 : results.push('…') - 1 });
        continue;
      }
      // a comment only joins the line here (a few quick steps): its DM goes out below
      const who = `${v.from?.username || ''} ${v.from?.id || ''}`;
      let r;
      try {
        r = await onComment(own, v);
      } catch (e) {
        await noteError('comment', e, who);
        r = `error ${e.message}`.slice(0, 160);
      }
      results.push(r);
      if (r === 'queued') waiting.push([results.length - 1, v.id, who, v]);
      else {
        console.log('[ig] comment', who, short(v.text), '→', r);
        if (r !== 'skip') await noteComment(v, r);
      }
    }
  }

  const rest = async () => {
    for (const { kind, v, own, i } of after) {
      const who = v.sender?.id || '';
      const what = v.postback?.payload || v.message?.quick_reply?.payload || (v.message?.is_echo ? 'echo' : v.read ? 'read' : v.message?.text) || '';
      let r;
      try {
        r = await onMessaging(own, v);
      } catch (e) {
        // Meta said no (or we broke): never in silence, and never a crash
        await noteError(kind === 'standby' ? 'standby DM' : 'DM', e, who);
        r = `error ${e.message}`.slice(0, 160);
      }
      if (i >= 0) results[i] = r;
      // one short line per event, to see in the Vercel logs what arrives and what the bot did
      console.log(kind === 'standby' ? '[ig] standby' : '[ig] message', who, short(what), '→', r);
    }
    // the line: this call's comments and whatever was waiting from before, oldest first, 750 an hour at most
    let sent = new Map();
    try {
      sent = await drain({ budget: Number(process.env.IG_DRAIN_MS) || (ON_VERCEL ? 25_000 : 6000) });
    } catch (e) {
      await noteError('line', e);
    }
    for (const [i, cid, who, v] of waiting) {
      results[i] = sent.get(cid) || 'queued';
      console.log('[ig] comment', who, short(v.text), '→', results[i]);
      await noteComment(v, results[i]);
    }
    const others = [...sent.keys()].filter((cid) => !waiting.some((w) => w[1] === cid)).length;
    if (others) console.log('[ig] line', others, 'comments from before answered in this call');
    try {
      await tick();
    } catch (e) {
      await noteError('tick', e);
    }
  };

  // Meta wants its 200 within a few seconds, or it sends the event again and in the end switches the
  // webhook off: on Vercel the answer goes out now and the DMs are sent right after (waitUntil keeps
  // the function alive, up to maxDuration in vercel.json). Local tests wait for everything.
  if (ON_VERCEL) waitUntil(rest().catch((e) => noteError('webhook', e)));
  else await rest();
  return new Response(JSON.stringify({ ok: true, results }), { headers: { 'Content-Type': 'application/json' } });
}
