// /api/whatsapp: the webhook Meta calls for the WhatsApp Business number (Cloud API, coexistence).
// GET = Meta checking the address (WA_VERIFY_TOKEN); POST = events, signed with the app secret
// (the same app "Omnya Bot" as Instagram, so WA_APP_SECRET falls back to IG_APP_SECRET).
// Answers 200 at once; the reply to a lead runs after, with waitUntil (debounce + Claude + send).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { onInbound, onEcho, markKnown } from './_lib/wa.js';

export const config = { maxDuration: 120 };

export function GET(request) {
  const q = new URL(request.url).searchParams;
  const verify = process.env.WA_VERIFY_TOKEN;
  if (verify && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === verify) return new Response(q.get('hub.challenge') || '');
  return new Response('Forbidden', { status: 403 });
}

function signed(raw, header) {
  const secret = process.env.WA_APP_SECRET || process.env.IG_APP_SECRET;
  if (!secret) return !process.env.VERCEL; // only the local tests run without it
  const want = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
  const got = Buffer.from(header || '');
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Every event of one webhook call; returns the jobs to run after the response. */
export async function handle(body) {
  const jobs = [];
  for (const entry of body.entry || []) {
    for (const { field, value: v = {} } of entry.changes || []) {
      try {
        if (field === 'messages') {
          for (const m of v.messages || []) {
            const contact = (v.contacts || []).find((c) => c.wa_id === m.from);
            const job = await onInbound(m, contact);
            if (job) jobs.push(job);
          }
        } else if (field === 'smb_message_echoes') {
          for (const e of v.message_echoes || []) await onEcho(e);
        } else if (field === 'history') {
          for (const h of v.history || []) await markKnown(...(h.threads || []).map((t) => t.id));
        } else if (field === 'smb_app_state_sync') {
          await markKnown(...(v.state_sync || []).filter((s) => s.type === 'contact' && s.action !== 'remove').map((s) => s.contact?.phone_number));
        }
      } catch (e) {
        console.error('[wa]', field, e.message);
      }
    }
  }
  return jobs;
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
  const jobs = await handle(body);
  for (const job of jobs) waitUntil(job().catch((e) => console.error('[wa] job', e.message)));
  return new Response('ok');
}
