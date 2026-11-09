// Plain-JS mirror of the PDF map in src/lib/learn.ts, for the Stripe webhook: api/ is plain JS and
// can't import the Astro site's .ts. Matched by Stripe product name (not price id) on purpose — a
// renamed or duplicated product (see the "(Copy) The Full Tower Blueprint" mixup, 4/11) still resolves.
const FILES = '/learn/files/61dd51d89913fd69/en';
const pdf = (name, file) => ({ name, href: `${FILES}/${file}` });

const WHITE_TO_REAL = pdf('From 3D to real photo', 'playbook-01-from-3d-to-real-photo.pdf');
const REEL = pdf('The reel they comment on', 'playbook-02-the-reel-they-comment-on.pdf');
const BEFORE_IT_EXISTS = pdf('Sell it before it exists', 'playbook-03-sell-it-before-it-exists.pdf');
const PROMPTS = pdf('The full prompt files', 'bundle-the-full-prompt-files.pdf');
const CHECKLIST = pdf('The checklist before every delivery', 'bundle-the-checklist-before-every-delivery.pdf');
const FULL_TOWER = pdf('How to build a tower that sells with AI', 'full-tower-blueprint.pdf');
const FULL_3D = pdf('How to make a 3D that sells with AI', 'full-3d-blueprint.pdf');
const FULL_CITY = pdf('How to build a 3D city that goes viral with AI', 'full-city-blueprint.pdf');
const FULL_BUILD = pdf('How to build a house that builds itself', 'full-build-blueprint.pdf');

/** One Stripe product name → the files it should deliver. Checked in order, first match wins. */
const RULES = [
  // "Everything we teach" (7/11, €39 after a free blueprint): the three Full blueprints and the three playbooks with the extras
  // 9/11 (Nico): the Full Build Blueprint took the place of the Full City one in the pack
  [/everything we teach/i, [FULL_TOWER, FULL_3D, FULL_BUILD, WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  // "build blueprint", never /build/ alone: the Build lesson is a product too
  [/full build blueprint/i, [FULL_BUILD]],
  [/tower/i, [FULL_TOWER]],
  [/city/i, [FULL_CITY]],
  [/3d.*sells|sells.*3d/i, [FULL_3D]],
  [/all three playbooks|prompt files and checklist/i, [WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  // the other two always come with the prompt files and the checklist, as the offer says
  [/other two playbooks \(after playbook 01\)/i, [REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  [/other two playbooks \(after playbook 03\)/i, [WHITE_TO_REAL, REEL, PROMPTS, CHECKLIST]],
  [/other two playbooks \(after playbook 02/i, [WHITE_TO_REAL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  [/playbook\s*01|3d to real photo/i, [WHITE_TO_REAL]],
  [/playbook\s*02|reel they comment/i, [REEL]],
  [/playbook\s*03|sell it before it exists/i, [BEFORE_IT_EXISTS]],
];

/** names = every line item's product name on one Checkout Session. Returns the files to email, deduped.
    Session/Build lessons and anything unrecognised match nothing — the caller falls back to flagging Nico. */
export function filesForProduct(names) {
  const files = [];
  for (const n of names) {
    const rule = RULES.find(([re]) => re.test(n));
    if (rule) for (const f of rule[1]) if (!files.some((x) => x.href === f.href)) files.push(f);
  }
  return files;
}
