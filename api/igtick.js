// GET /api/igtick: empties the line of comments waiting for their DM (750 an hour at most), then
// sends the reminders and follow-ups that are due. Called every 5 minutes by GitHub Actions
// (.github/workflows/igtick.yml), every minute by Vercel Cron once the plan is Pro (see
// docs/INSTAGRAM-BOT.md), and the same work is done on every webhook call. Safe for anyone
// to call: it only does what is already due.
import { tick, drain, lineState, noteError, isOff } from './_lib/ig.js';

const json = (o) => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET() {
  if (await isOff().catch(() => false)) return json({ ok: true, off: true });
  let sent = 0, done = [], waiting = null;
  try {
    const out = await drain({ budget: Number(process.env.IG_TICK_MS) || 40_000, max: 1000 });
    sent = [...out.values()].filter((r) => r === 'sent').length;
    // an idle minute costs Redis two questions (the line, the reminders): the count is asked only when something moved or waits
    if (!out.idle || sent) waiting = (await lineState()).waiting;
  } catch (e) {
    await noteError('line', e);
  }
  try {
    done = await tick();
  } catch (e) {
    await noteError('tick', e);
  }
  if (sent || waiting) console.log('[ig] tick', sent, 'DMs sent from the line,', waiting ?? 0, 'still waiting');
  return json({ ok: true, sent, done, waiting });
}
