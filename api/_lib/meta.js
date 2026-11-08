// Meta Conversions API (8/11/2026): server events for the omnyalab.com dataset.
// Vercel env: META_PIXEL_ID (the dataset ID, same as PIXEL in public/consent.js), META_CAPI_TOKEN (secret,
// Events Manager > Settings > Conversions API > Generate access token: Nico pastes it on Vercel),
// META_TEST_EVENT_CODE (optional, only while checking in Test Events; remove it afterwards).
// Without the ID or the token nothing is sent. Email and name are hashed (SHA-256), never sent in clear.
import { createHash } from 'node:crypto';

const sha = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');

export const metaOn = () => !!(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);

/**
 * @param {object} e  { name: 'Purchase'|'Lead', id: event_id, url, email, firstName, value, currency, ip, ua, fbp, fbc, content }
 */
export async function metaEvent(e) {
  if (!metaOn()) return { skipped: true };
  const user = {};
  if (e.email) user.em = [sha(e.email)];
  if (e.firstName) user.fn = [sha(e.firstName.split(' ')[0])];
  if (e.ip) user.client_ip_address = e.ip;
  if (e.ua) user.client_user_agent = e.ua;
  if (e.fbp) user.fbp = e.fbp;
  if (e.fbc) user.fbc = e.fbc;
  const data = {
    event_name: e.name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: e.id,
    action_source: 'website',
    event_source_url: e.url || 'https://www.omnyalab.com/',
    user_data: user,
    custom_data: {
      ...(e.value != null ? { value: e.value, currency: (e.currency || 'eur').toUpperCase() } : {}),
      ...(e.content ? { content_name: e.content, content_type: 'product' } : {}),
    },
  };
  const body = { data: [data] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error('[meta] capi', r.status, await r.text().catch(() => ''));
  return { ok: r.ok };
}
