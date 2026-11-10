// Which post gives what. THE ONE PLACE to add a reel: a line in POSTS (by the code in the reel's
// link) or in WORDS (by the word the caption asks for).
//
// A destination is one of the names in ig-texts.js:
//   blueprint → omnyalab.com/the-blueprint         tower  → /the-tower-blueprint
//   floors    → /the-tower-floors                  film   → /3d-to-film
//   build     → /the-build-blueprint               towers → /the-towers-blueprint
//   city      → Omnya City, the personal one-time link (word HOUSE)
//
// How a comment finds its destination, first match wins:
//   1. the post is in POSTS (or was added without a deploy from /api/leads?key=…&action=post&code=…&dest=…)
//   2. the caption says "Comment WORD" and WORD is in WORDS
//   3. the caption says "Comment WORD" with any other word: the Tower Blueprint when the caption
//      talks about a tower, the normal Blueprint otherwise, and only for who writes that word
//   4. nothing: the bot stays quiet (client teasers and the rest)
// In 1 and 2 the bot answers ANY comment, whatever the word (Nico, 7/11/2026).
import { KINDS } from './ig-texts.js';

/** By post: the code is the part after /reel/ or /p/ in the link (instagram.com/reel/DfSXvGDtt4s/). */
export const POSTS = [
  { code: 'DfSXvGDtt4s', dest: 'tower', note: 'red tower, 3/11' },
  { code: 'DfaH3QkN4qs', dest: 'floors', note: 'tower "1 DAY", 6/11' },
  { code: 'DfU-nniRvNQ', dest: 'film', note: '3D "KILLED", 4/11' },
  { code: 'DfPzJmMtf2B', dest: 'film', note: 'Claude "COOKED", 2/11' },
  { code: 'Dfh1ppmtT8t', dest: 'build', note: 'Hold to build, 9/11' },
  { code: 'DfXg47dtoyz', dest: 'city', note: 'Omnya City Ep.1, 5/11' },
  // the TOWERS reel of 11/11 needs no line as long as its caption says Comment "TOWERS";
  // to pin it anyway: { code: 'PUT-THE-CODE-HERE', dest: 'towers', note: 'Choose your view, 11/11' },
];

/** By the word in the caption ("Comment TOWERS", "Like and comment “BUILD”"…). */
export const WORDS = [
  { word: 'TOWERS', dest: 'towers' },
  { word: 'BUILD', dest: 'build' },
  { word: 'HOUSE', dest: 'city' },
];

/** instagram.com/reel/DfSXvGDtt4s/ → DfSXvGDtt4s */
export const codeOf = (permalink) => (String(permalink || '').match(/instagram\.com\/(?:[^/]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/) || [])[1] || '';

/** A code or a whole link, as Nico pastes it. */
export const cleanCode = (raw) => {
  const s = String(raw || '').trim();
  const c = codeOf(s) || s;
  return /^[A-Za-z0-9_-]{5,40}$/.test(c) ? c : '';
};

export const isDest = (d) => KINDS.includes(d) && d !== 'legacy';

/**
 * The destination of a post.
 * @param {{ id?: string, code?: string, words?: string[], tower?: boolean }} post  what Instagram told us about it
 * @param {Record<string, string>} [extra]  posts added without a deploy: { code: dest }
 * @returns {{ dest: string, any: boolean, words: string[] } | null}  any = every comment counts
 */
export function resolvePost(post, extra = {}) {
  const ids = [post.code, post.id].filter(Boolean).map(String);
  for (const id of ids) if (isDest(extra[id])) return { dest: extra[id], any: true, words: post.words || [] };
  const pinned = POSTS.find((p) => ids.includes(p.code));
  if (pinned) return { dest: pinned.dest, any: true, words: post.words || [] };
  const words = post.words || [];
  const byWord = WORDS.find((w) => words.includes(w.word));
  if (byWord) return { dest: byWord.dest, any: true, words };
  if (words.length) return { dest: post.tower ? 'tower' : 'blueprint', any: false, words };
  return null;
}
