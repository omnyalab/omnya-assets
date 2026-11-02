// GET /api/slots?type=call|session|build → the free start times (UTC ms) for that appointment.
import { types } from './_lib/config.js';
import { freeSlots } from './_lib/slots.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET(request) {
  const type = new URL(request.url).searchParams.get('type') || 'call';
  if (!types[type]) return json({ error: 'type' }, 400);
  try {
    const slots = await freeSlots(type);
    return json({ type, minutes: types[type].minutes, calls: types[type].calls, slots });
  } catch (e) {
    console.error('[slots]', e);
    return json({ error: 'calendar' }, 503);
  }
}
