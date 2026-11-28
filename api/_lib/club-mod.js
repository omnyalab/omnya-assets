// 28/11 (Nico: «metti un filtro che non possono mettere nudità, non si sa mai»): every photo a member puts in the club (their
// photo, their background, the photo of a post) is looked at by Claude first; nudity or sexual content is refused.
// If the check itself fails (no key, the API is down), the photo goes through and the error is logged.
import Anthropic from '@anthropic-ai/sdk';

let client;
const claude = () => (client ||= new Anthropic());
const MODEL = process.env.CLUB_MOD_MODEL || 'claude-opus-5-5';
const SYSTEM = 'You check photos that members upload to a professional club about 3D architecture. Answer with one word only. ' +
  'BLOCK if the photo shows nudity, sexual content, genitals, exposed breasts or buttocks, sexual acts, or graphic gore. Otherwise OK. ' +
  'Normal people, swimwear at a beach or pool, buildings, renders, screenshots and art without nudity are OK.';

/** true when the photo (a data URL) must not go in the club */
export async function unsafeImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m || !process.env.ANTHROPIC_API_KEY) return false;
  try {
    const r = await claude().messages.create({
      model: MODEL, max_tokens: 8, system: SYSTEM,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: 'BLOCK or OK?' }] }],
    });
    if (r.stop_reason === 'refusal') return true;
    return /BLOCK/i.test(r.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
  } catch (e) { console.error('[club] photo check', e.message); return false; }
}
