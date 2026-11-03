// GET /api/igtick: sends the reminders and follow-ups of the Instagram bot that are due and keeps
// the token alive. Called every half hour by GitHub Actions (.github/workflows/igtick.yml) and on
// every webhook call. Safe for anyone to call: it only does what is already due.
import { tick, refreshToken } from './_lib/ig.js';

export async function GET() {
  await refreshToken();
  const done = await tick();
  return new Response(JSON.stringify({ ok: true, done }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
