// /api/instagram: the webhook Meta calls for every comment, DM, button tap and "seen" on @omnyalab.
// GET = Meta checking the address (IG_VERIFY_TOKEN); POST = events, signed with IG_APP_SECRET.
// Always answers 200, or Meta retries and in the end switches the webhook off.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { onComment, onMessaging, tick } from './_lib/ig.js';

const testerMode = !!(process.env.IG_ONLY || '').trim();
const MESSAGE_FIELDS = new Set(['messages', 'messaging_postbacks', 'messaging_seen', 'message_echoes']);

export function GET(request) {
  const q = new URL(request.url).searchParams;
  const verify = process.env.IG_VERIFY_TOKEN;
  if (verify && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === verify) return new Response(q.get('hub.challenge') || '');
  return new Response('Forbidden', { status: 403 });
}

function signed(raw, header) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret) return !process.env.VERCEL; // only the local tests run without it
  const want = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
  const got = Buffer.from(header || '');
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request) {
  const raw = await request.text();
  if (!signed(raw, request.headers.get('x-hub-signature-256'))) return new Response('Bad signature', { status: 401 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('ok');
  }
  const results = [];
  for (const entry of body.entry || []) {
    const own = String(entry.id || '');
    const events = [
      ...(entry.changes || []).map((c) => (c.field === 'comments' ? ['comment', c.value] : MESSAGE_FIELDS.has(c.field) ? ['message', c.value] : null)),
      ...(entry.messaging || []).map((m) => ['message', m]),
    ].filter(Boolean);
    // messages that went to another app (ManyChat) as the main receiver: we only see them, we can't answer
    // in tester mode the bot answers its testers there too (ManyChat stays the main app for everyone else)
    for (const m of entry.standby || []) {
      let r = 'seen';
      if (testerMode) {
        try {
          r = await onMessaging(own, m);
        } catch (e) {
          r = 'error ' + e.message;
        }
      }
      console.log('[ig] standby', m.sender?.id || '', JSON.stringify(String(m.postback?.payload || m.message?.text || '').slice(0, 40)), '→', r);
    }
    for (const [kind, v] of events) {
      try {
        const r = kind === 'comment' ? await onComment(own, v) : await onMessaging(own, v);
        results.push(r);
        // one short line per event, to see in the Vercel logs what arrives and what the bot did
        const who = kind === 'comment' ? `${v.from?.username || ''} ${v.from?.id || ''}` : v.sender?.id || '';
        const what = kind === 'comment' ? v.text : v.postback?.payload || v.message?.quick_reply?.payload || (v.message?.is_echo ? 'echo' : v.read ? 'read' : v.message?.text) || '';
        console.log('[ig]', kind, who, JSON.stringify(String(what).slice(0, 40)), '→', r);
      } catch (e) {
        console.error('[ig] event', kind, e.message);
      }
    }
  }
  try {
    await tick();
  } catch (e) {
    console.error('[ig] tick', e.message);
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: { 'Content-Type': 'application/json' } });
}
