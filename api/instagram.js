// /api/instagram: the webhook Meta calls for every comment, DM, button tap and "seen" on @omnyalab.
// GET = Meta checking the address (IG_VERIFY_TOKEN); POST = events, signed with IG_APP_SECRET.
// Always answers 200, or Meta retries and in the end switches the webhook off.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { onComment, onMessaging, tick } from './_lib/ig.js';

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
    for (const [kind, v] of events) {
      try {
        results.push(kind === 'comment' ? await onComment(own, v) : await onMessaging(own, v));
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
