// Plain-JS mirror of the PDF map in src/lib/learn.ts, for the Stripe webhook: api/ is plain JS and
// can't import the Astro site's .ts. Matched by Stripe product name (not price id) on purpose — a
// renamed or duplicated product (see the "(Copy) The Full Tower Blueprint" mixup, 4/11) still resolves.
//
// 10/11: the paid PDFs left the public folder. They (and the one zip, the Towers scene) live in private/learn/<lang>/ (bundled with
// api/file.js only, see vercel.json) and every link is /api/file?f=…&e=…&s=…, signed and with an end date:
// 24 hours for the buttons on the page after the payment, one year for the buttons in the buyer's email.
import { createHmac, timingSafeEqual } from 'node:crypto';

const pdf = (name, file, it) => ({ name, file: `en/${file}`, it });

/** The key that signs the links. FILES_SECRET if it is ever set; otherwise one made from the Stripe webhook
    secret, which the webhook needs anyway, so nothing new has to be added on Vercel. No key, no links. */
const secret = () => {
  if (process.env.FILES_SECRET) return process.env.FILES_SECRET;
  const base = process.env.STRIPE_WEBHOOK_SECRET || '';
  return base ? createHmac('sha256', base).update('omnya-learn-files').digest('hex') : '';
};
const sign = (file, exp) => createHmac('sha256', secret()).update(`${file}|${exp}`).digest('base64url');

export const DAY = 86_400;
export const PAGE_TTL = DAY; // the buttons on /learn/thanks
export const MAIL_TTL = 365 * DAY; // the buttons in the email after the payment

/** /api/file?… for one file ("en/full-tower-blueprint.pdf"), good for ttl seconds. Throws without a key. */
export function signedHref(file, ttl = PAGE_TTL) {
  if (!secret()) throw new Error('no key to sign the file links');
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return `/api/file?f=${encodeURIComponent(file)}&e=${exp}&s=${sign(file, exp)}`;
}

/** True only for a file we sell, a signature made with our key and an end date still ahead. */
export function linkOk(file, exp, sig) {
  if (!secret() || !ALL.has(file) || !/^\d{9,11}$/.test(String(exp)) || Number(exp) * 1000 < Date.now()) return false;
  const a = Buffer.from(sign(file, exp)), b = Buffer.from(String(sig || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

// 13/11 (Nico): new titles and covers for the three playbooks. 02 is a new PDF (English only, so Italian buyers get it marked (EN)).
const WHITE_TO_REAL = pdf('From a 3D to a photo clients pay for', 'playbook-01-from-a-3d-to-a-photo-clients-pay-for.pdf', ['Dal 3D a una foto che i clienti pagano', 'it/playbook-01-dal-3d-a-una-foto-che-i-clienti-pagano.pdf']);
const REEL = pdf('How to go viral in days, not years', 'playbook-02-how-to-go-viral-in-days-not-years.pdf');
const BEFORE_IT_EXISTS = pdf('The launch kit that sells a tower', 'playbook-03-the-launch-kit-that-sells-a-tower.pdf', ['Il kit di lancio che vende una torre', 'it/playbook-03-il-kit-di-lancio-che-vende-una-torre.pdf']);
const PROMPTS = pdf('The full prompt files', 'bundle-the-full-prompt-files.pdf', ['I file di prompt completi', 'it/pacchetto-i-file-di-prompt-completi.pdf']);
const CHECKLIST = pdf('The checklist before every delivery', 'bundle-the-checklist-before-every-delivery.pdf', ['Il controllo prima di ogni consegna', 'it/pacchetto-il-controllo-prima-di-ogni-consegna.pdf']);
const FULL_TOWER = pdf('How to build a tower that sells with AI', 'full-tower-blueprint.pdf');
const FULL_3D = pdf('How to make a 3D that sells with AI', 'full-3d-blueprint.pdf');
const FULL_CITY = pdf('How to build a 3D city that goes viral with AI', 'full-city-blueprint.pdf');
const FULL_BUILD = pdf('How to build a house that builds itself', 'full-build-blueprint.pdf');
const FULL_TOWERS = pdf('How to build three towers you choose the view of', 'full-towers-blueprint.pdf');
// 15/11: the stadium where you pick your own seat (word TICKET); not in the pack (yet)
const FULL_STADIUM = pdf('How to build a stadium where you pick your own seat', 'full-stadium-blueprint.pdf');
// 16/11: Miami built from the real map (GTA 6 reels, word GTA), and its skill sold with it at €9.99
const FULL_MIAMI = pdf('How to build Miami from the real map', 'full-miami-blueprint.pdf');
// 17/11: the Riyadh mega tower you drive from your phone (Burj Al Ballur reels, word 3D), and its Remote Kit sold with it at €14.99
const FULL_RIYADH = pdf('How to build a Riyadh mega tower you drive from your phone', 'full-riyadh-blueprint.pdf');
// 18/11: the plane where you pick your own seat (plane reels, word PLANE), and its 3D Plane Kit sold with it at €14.99
const FULL_PLANE = pdf('How to build a plane where you pick your own seat', 'full-plane-blueprint.pdf');
// 22/11: 3D AI Mastery, how to build any 3D with Claude (3D AI Mastery reels, word STADIUM)
const FULL_MASTERY = pdf('3D AI Mastery, how to build any 3D with Claude', '3d-ai-mastery.pdf');
// 25/11: how to build a villa people choose like on Google Maps (Dubai Villa reels, word HOME)
const FULL_VILLA = pdf('How to build a villa people choose like on Google Maps', 'full-dubai-villa-blueprint.pdf');
// 10/11 (Nico): "The Towers Scene File" (€12), the one file that is not a PDF. It is sold in the same Stripe cart as the
// Full Towers Blueprint (a recommended product of that payment link): the base three.js scene of the three towers as a
// zip that opens in the browser, with the panel for views, light, height, fog and video recording. It is the base 3D
// scene, not the photorealistic film of the reel, and every text about it says so. kind 'zip' is how the email, the page
// after the payment and api/file.js tell it from the PDFs.
const SCENE = {
  name: 'The Towers Scene File', file: 'en/the-towers-scene.zip', kind: 'zip',
  note: 'is the base 3D scene of the three towers, a zip to unzip and open in your browser on a computer (the file is index.html), where you change the views, the light, the height of the towers and the fog and record a video, and it is the 3D scene behind the reel, not the photorealistic film you see in it.',
};
// 23/11: how a skill goes into claude.ai, the same words for every skill zip. claude.ai moved skills from Settings,
// Capabilities, Skills to the Plugins page (Add, Upload plugin), and Safari on a Mac unzips downloads by itself and
// deletes the zip, so the buyer would have nothing to upload: the line says Chrome, or Compress the folder again.
const ON_CLAUDE_AI = 'on claude.ai click Plugins in the menu on the left, then Add, Upload plugin, and choose the zip as it is (on a Mac download it with Chrome, because Safari unzips it: if you only have the folder, right-click it and Compress it)';

// 16/11 (Nico): the Stadium Builder skill, a zip for Claude: sold with the Full Stadium Blueprint at €9.99, and inside
// Everything we teach. note = the line under the buttons, in the email and on the page after the payment.
const SKILL = {
  name: 'The Stadium Builder skill', file: 'en/stadium-builder-skill.zip', kind: 'zip',
  note: `is a skill for Claude: ${ON_CLAUDE_AI}, or unzip it into ~/.claude/skills for Claude Code, then ask "build me a stadium for…". It needs Claude Pro or Claude Code, and the README inside has every step.`,
};

const MIAMI_SKILL = {
  name: 'The Miami Builder skill', file: 'en/miami-builder-skill.zip', kind: 'zip',
  note: `is a skill for Claude: ${ON_CLAUDE_AI}, or unzip it into ~/.claude/skills for Claude Code, then ask "build me Lisbon like Build Miami". It needs Claude Pro or Claude Code, and the README inside has every step.`,
};

// 18/11 (Nico, K2 of the Build funnel): the House Builder skill, a zip for Claude: the hold to build page from the
// buyer's phase photos or clips, sold with the Full Build Blueprint at €14.99 (€19.99 from Monday 23/11)
const HOUSE_SKILL = {
  name: 'The House Builder skill', file: 'en/house-builder-skill.zip', kind: 'zip',
  note: `is a skill for Claude: ${ON_CLAUDE_AI}, or unzip it into ~/.claude/skills for Claude Code, then ask "build me a hold to build page with these photos". It needs Claude Pro or Claude Code, and the README inside has every step.`,
};

const RIYADH_KIT = {
  name: 'The Riyadh Remote Kit', file: 'en/riyadh-remote-kit.zip', kind: 'zip',
  note: 'is the code of the phone remote: unzip it, run Start (or python3 server.py), open the big screen on your computer and the remote on your phone on the same Wi-Fi. The README inside has every step, and how to put your own clips in.',
};

const PLANE_KIT = {
  name: 'The 3D Plane Kit', file: 'en/plane-3d-kit.zip', kind: 'zip',
  note: 'is the interactive plane where you pick your seat: unzip it, double click Start (Mac) or Start (Windows), and it opens in your browser. Your flight, cities and prices are in config.js, and the README inside has every step.',
};

// 19/11 (Nico): the Plane Builder skill, a zip for Claude that builds the flight booking site for any brand, with the photos
// and clips of the plane inside; sold ALONE at €5.99 on /the-plane-skill/watch (Nico: only the skill, no Full guide, no kit:
// guide + kit stay €14.99 on the other funnel)
const PLANE_SKILL = {
  name: 'The Plane Builder skill', file: 'en/plane-builder-skill.zip', kind: 'zip',
  note: `is a skill for Claude: unzip it into ~/.claude/skills for Claude Code, or ${ON_CLAUDE_AI}, then ask "build me the plane booking site for my airline". The README inside has every step.`,
};

// 25/11 (Nico: «tutto nel sito»): the Tower Builder skill of the first course of THE 3D FUTURE (the five First Build lessons
// install it), given only to the members on /the-3d-future/inside
const TOWER_SKILL = {
  name: 'The Tower Builder skill', file: 'en/tower-builder-skill.zip', kind: 'zip',
  note: `is the skill of your first course: ${ON_CLAUDE_AI}, or unzip it into ~/.claude/skills for Claude Code. Lesson 2 shows every step, and the README inside has them too.`,
};

// 25/11 (Nico): the Dubai Villa Builder skill, a zip for Claude that rebuilds the same «choose your villa» page of the
// Dubai Hills reels (word HOME), with the photos and the film inside. ONLY in Everything we teach (€59), not with the Full guide.
const VILLA_SKILL = {
  name: 'The Dubai Villa Builder skill', file: 'en/dubai-villa-builder-skill.zip', kind: 'zip',
  note: `is a skill for Claude: ${ON_CLAUDE_AI}, or unzip it into ~/.claude/skills for Claude Code, then ask "build me the Dubai villa page". The README inside has every step.`,
};

const EVERY = [WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST, FULL_TOWER, FULL_3D, FULL_CITY, FULL_BUILD, FULL_TOWERS, FULL_STADIUM, FULL_MIAMI, FULL_RIYADH, FULL_PLANE, FULL_MASTERY, FULL_VILLA, SCENE, SKILL, MIAMI_SKILL, HOUSE_SKILL, RIYADH_KIT, PLANE_KIT, PLANE_SKILL, TOWER_SKILL, VILLA_SKILL];

/** 25/11: what the members of THE 3D FUTURE find inside (/the-3d-future/inside): the course skill, the six builds of the
    Vault with their files (the same order and photos as the club page, src/components/club/data.ts DROPS) and every Full guide */
export const CLUB_COURSE_SKILL = TOWER_SKILL;
export const CLUB_VAULT = [
  { t: 'The Towers', type: '3D scene', img: 'towers', files: [SCENE, FULL_TOWERS] },
  { t: 'Riyadh Tower', type: 'Phone remote', img: 'riyadh', files: [RIYADH_KIT, FULL_RIYADH] },
  { t: 'Stadium', type: 'Skill', img: 'stadium', files: [SKILL, FULL_STADIUM] },
  { t: 'House that builds itself', type: 'Skill', img: 'house', files: [HOUSE_SKILL, FULL_BUILD] },
  { t: 'Plane', type: 'Skill and kit', img: 'plane', files: [PLANE_SKILL, PLANE_KIT, FULL_PLANE] },
  { t: 'Miami', type: 'Skill', img: 'miami', files: [MIAMI_SKILL, FULL_MIAMI] },
];
export const CLUB_GUIDES = [FULL_TOWER, FULL_3D, FULL_CITY, FULL_BUILD, FULL_TOWERS, FULL_STADIUM, FULL_MIAMI, FULL_RIYADH, FULL_PLANE];
// 13/11: the playbooks got new names. The one-year links already in buyers' emails still carry the old file names, so
// the old names stay valid and point to the new files (who bought the old playbook 02 now gets the new one).
const OLD = {
  'en/playbook-01-from-3d-to-real-photo.pdf': 'en/playbook-01-from-a-3d-to-a-photo-clients-pay-for.pdf',
  'it/playbook-01-dal-3d-alla-foto-vera.pdf': 'it/playbook-01-dal-3d-a-una-foto-che-i-clienti-pagano.pdf',
  'en/playbook-02-the-reel-they-comment-on.pdf': 'en/playbook-02-how-to-go-viral-in-days-not-years.pdf',
  'it/playbook-02-il-reel-che-fa-commentare.pdf': 'en/playbook-02-how-to-go-viral-in-days-not-years.pdf',
  'en/playbook-03-sell-it-before-it-exists.pdf': 'en/playbook-03-the-launch-kit-that-sells-a-tower.pdf',
  'it/playbook-03-vendilo-prima-che-esista.pdf': 'it/playbook-03-il-kit-di-lancio-che-vende-una-torre.pdf',
};
/** The file on disk for a signed name: itself, or the new file an old name now points to. */
export const diskName = (file) => OLD[file] || file;
/** Every file path api/file.js may serve, and nothing else. */
const ALL = new Set([...EVERY.flatMap((f) => (f.it ? [f.file, f.it[1]] : [f.file])), ...Object.keys(OLD)]);
export const allFiles = () => EVERY.flatMap((f) => [{ name: f.name, file: f.file }, ...(f.it ? [{ name: f.it[0], file: f.it[1] }] : [])]);

// "Everything we teach" (7/11, €39 after a free blueprint): the three Full blueprints and the three playbooks with the extras
// 9/11 (Nico): the Full Build Blueprint took the place of the Full City one in the pack, then the Full Towers one joined it
// 16/11 (Nico): every Full guide is in it now (City and Stadium joined), and the Stadium Builder skill; the Black Friday
// product "Black Friday · Everything we teach" (€39) is matched by the /everything we teach/ rule and delivers the same
// 16/11: the Full Miami Blueprint and the Miami Builder skill joined it
// 19/11: the Plane joined the pack (the Black Friday card says "Plane too"): its Full guide, skill and kit
// 25/11: the Dubai Villa joined the pack (the Black Friday card says "Dubai Villa too"): its Full guide and the Dubai Villa
// Builder skill, which is only here (Nico: «la skill sta solo nel 59»)
const PACK = [FULL_TOWER, FULL_3D, FULL_BUILD, FULL_TOWERS, FULL_STADIUM, FULL_MIAMI, FULL_CITY, FULL_PLANE, FULL_VILLA, WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST, SKILL, MIAMI_SKILL, HOUSE_SKILL, PLANE_SKILL, PLANE_KIT, VILLA_SKILL];
/** True for every Stripe product that is the pack, whatever its price: "Everything we teach" (€59),
    "Everything we teach · upgrade" (€53 after a Full guide) and "Everything we teach · thank you price" (€29, sent by hand). */
export const isPack = (name) => /everything we teach/i.test(String(name || ''));
/** True when what was paid for is one Full guide and nothing else (files = what filesForProduct gave back): the buyer
    the upgrade to the pack is for (10/11). Not a playbook, not two guides, not the pack. The scene file added to the
    cart of a guide does not count: that buyer paid €5.99 for the guide too, so the upgrade is still theirs; the scene
    alone is not a guide. */
export const oneFullGuide = (files) => {
  const pdfs = files.filter((f) => !f.kind);
  return pdfs.length === 1 && [FULL_TOWER, FULL_3D, FULL_CITY, FULL_BUILD, FULL_TOWERS, FULL_STADIUM, FULL_MIAMI, FULL_RIYADH, FULL_PLANE, FULL_MASTERY, FULL_VILLA].some((g) => g.file === pdfs[0].en);
};

/** One Stripe product name → the files it should deliver. Checked in order, first match wins. */
const RULES = [
  // 10/11 (Nico), two more prices of the same pack, both deliver all of it and come back to /learn/thanks/everything:
  // the upgrade after a Full guide (lib/learn.ts everythingUpgrade) and the thank you price (everythingApology).
  // They are written out so the names are in the code; the plain rule under them would catch them too.
  [/everything we teach\s*[·•\-–—:]?\s*upgrade/i, PACK],
  [/everything we teach\s*[·•\-–—:]?\s*thank you price/i, PACK],
  [/everything we teach/i, PACK],
  // 15/11: the Full Stadium Blueprint, before every generic rule (its name has no "tower" or "city", but keep it first)
  // 16/11: "Stadium Builder Skill + The Full Stadium Blueprint" (€9.99) BEFORE the plain stadium rule, which would match it too
  [/stadium builder skill/i, [FULL_STADIUM, SKILL]],
  [/full stadium blueprint/i, [FULL_STADIUM]],
  // 16/11: "Miami Builder Skill + The Full Miami Blueprint" (€9.99) and "Miami Builder skill · upgrade" before the plain Miami rule
  [/miami builder skill/i, [FULL_MIAMI, MIAMI_SKILL]],
  [/full miami blueprint/i, [FULL_MIAMI]],
  // 17/11: "Riyadh Remote Kit + The Full Riyadh Blueprint" (€14.99) before the plain Riyadh rule
  [/riyadh remote kit/i, [FULL_RIYADH, RIYADH_KIT]],
  [/full riyadh blueprint/i, [FULL_RIYADH]],
  // 19/11: "The Plane Builder Skill" (€5.99, the skill only) before every other plane rule
  [/plane builder skill/i, [PLANE_SKILL]],
  // 18/11: "3D Plane Kit + The Full Plane Blueprint" (€14.99 / €19.99) before the plain plane rule
  [/3d plane kit/i, [FULL_PLANE, PLANE_KIT]],
  [/full plane blueprint/i, [FULL_PLANE]],
  // 22/11 (Nico): the Black Friday bundle of the 3D AI Mastery funnel only, "The 3 playbooks + 3D AI Mastery" (€59): the course
  // and the three playbooks, BEFORE the plain course rule (which would match it too). Not Everything: that pack stays as it is.
  [/the 3 playbooks \+ 3D AI Mastery/i, [FULL_MASTERY, WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS]],
  // 22/11: "3D AI Mastery" (€5.99 / €9.99), exact Stripe name
  [/3D\s+AI\s+Mastery/i, [FULL_MASTERY]],
  // 25/11: "The Full Dubai Villa Blueprint" (€5.99 / €9.99), exact Stripe name
  [/The\s+Full\s+Dubai\s+Villa\s+Blueprint/i, [FULL_VILLA]],
  // 10/11: "The Towers Scene File" BEFORE every rule with "tower" in it. It delivers the zip and nothing else: without
  // this line /tower/ below would send the Full Tower PDF to who bought the scene. "The Full Towers Blueprint" has no
  // "towers scene" in its name, so it still reaches its own rule and its own PDF.
  // towers? so a product typed "The Tower Scene File" by mistake on Stripe still gets the zip and never the Full Tower PDF
  [/towers?\s*scene/i, [SCENE]],
  // 13/11: playbook 03 is now "The launch kit that sells a tower": it must be caught BEFORE /tower/ below, or the buyer
  // of the playbook would get the Full Tower guide. The pack and the other-two offers are matched above or have no "tower".
  [/launch kit that sells a tower/i, [BEFORE_IT_EXISTS]],
  // "build blueprint", never /build/ alone: the Build lesson is a product too
  // 18/11: "House Builder Skill + The Full Build Blueprint" (€14.99 / €19.99) BEFORE the plain Build rule, which would match it too
  [/house builder skill/i, [FULL_BUILD, HOUSE_SKILL]],
  [/full build blueprint/i, [FULL_BUILD]],
  // "full towers blueprint" before /tower/: the Full Tower Blueprint (one tower) is another product (9/11)
  [/full towers blueprint/i, [FULL_TOWERS]],
  [/tower/i, [FULL_TOWER]],
  [/city/i, [FULL_CITY]],
  [/3d.*sells|sells.*3d/i, [FULL_3D]],
  [/all three playbooks|prompt files and checklist/i, [WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  // the other two always come with the prompt files and the checklist, as the offer says
  [/other two playbooks \(after playbook 01\)/i, [REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  [/other two playbooks \(after playbook 03\)/i, [WHITE_TO_REAL, REEL, PROMPTS, CHECKLIST]],
  [/other two playbooks \(after playbook 02/i, [WHITE_TO_REAL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST]],
  [/playbook\s*01|3d to real photo|3d to a photo/i, [WHITE_TO_REAL]],
  [/playbook\s*02|reel they comment|go viral/i, [REEL]],
  [/playbook\s*03|sell it before it exists|launch kit/i, [BEFORE_IT_EXISTS]],
];

/** 20/11 (THE 3D FUTURE): true for a product that is one of our guides, the products with files above (the Full guides,
    the playbooks, the pack, the skills and kits), whatever its price. The Omnya City products are houses, not guides
    ("Omnya City · …", "Move downtown · Omnya City"): /city/ would match them, so they are left out first. A lesson
    matches no rule, so it is not a guide either. Who bought one keeps the €9 price of the club (api/_lib/club.js). */
export const isGuideProduct = (name) => !!name && !/omnya city/i.test(name) && RULES.some(([re]) => re.test(name));
/** The House Builder skill, the bonus every member of the club keeps (api/_lib/club.js signs its link). */
export const HOUSE_SKILL_FILE = HOUSE_SKILL.file;
// 23/11 (Nico): the founders' gift of THE 3D FUTURE, for the first 100 members of the founders' round: the three
// playbooks and the full 3D AI Mastery course, theirs to keep (links in the welcome email, good for five years)
export const FOUNDERS_GIFTS = [WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, FULL_MASTERY].map((x) => ({ name: x.name, file: x.file }));

/** names = every line item's product name on one Checkout Session. Returns the files to deliver, deduped,
    as { name, file, href }: href is the signed link, good for ttl seconds. lang 'it' gives the Italian
    file where one exists (the playbooks), the English one otherwise (the Full blueprints). The scene file
    also has kind: 'zip' (the PDFs have no kind) and keeps its name in every language.
    Session/Build lessons and anything unrecognised match nothing — the caller falls back to flagging Nico. */
export function filesForProduct(names, { ttl = MAIL_TTL, lang = 'en' } = {}) {
  const files = [];
  for (const n of names) {
    const rule = RULES.find(([re]) => re.test(n));
    if (rule) for (const f of rule[1]) if (!files.some((x) => x.en === f.file)) {
      const [name, file] = lang === 'it' && f.it ? f.it : [lang === 'it' && !f.kind ? `${f.name} (EN)` : f.name, f.file];
      files.push({ name, file, en: f.file, href: signedHref(file, ttl), ...(f.kind ? { kind: f.kind } : {}), ...(f.note ? { note: f.note } : {}) });
    }
  }
  // the PDFs first and the scene file after them, whatever the order of the lines in the cart
  return [...files.filter((f) => !f.kind), ...files.filter((f) => f.kind)];
}
