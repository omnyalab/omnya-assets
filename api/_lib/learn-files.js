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
// 10/11 (Nico): "The Towers Scene File" (€12), the one file that is not a PDF. It is sold in the same Stripe cart as the
// Full Towers Blueprint (a recommended product of that payment link): the base three.js scene of the three towers as a
// zip that opens in the browser, with the panel for views, light, height, fog and video recording. It is the base 3D
// scene, not the photorealistic film of the reel, and every text about it says so. kind 'zip' is how the email, the page
// after the payment and api/file.js tell it from the PDFs.
const SCENE = { name: 'The Towers Scene File', file: 'en/the-towers-scene.zip', kind: 'zip' };

const EVERY = [WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST, FULL_TOWER, FULL_3D, FULL_CITY, FULL_BUILD, FULL_TOWERS, SCENE];
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
const PACK = [FULL_TOWER, FULL_3D, FULL_BUILD, FULL_TOWERS, WHITE_TO_REAL, REEL, BEFORE_IT_EXISTS, PROMPTS, CHECKLIST];
/** True for every Stripe product that is the pack, whatever its price: "Everything we teach" (€59),
    "Everything we teach · upgrade" (€53 after a Full guide) and "Everything we teach · thank you price" (€29, sent by hand). */
export const isPack = (name) => /everything we teach/i.test(String(name || ''));
/** True when what was paid for is one Full guide and nothing else (files = what filesForProduct gave back): the buyer
    the upgrade to the pack is for (10/11). Not a playbook, not two guides, not the pack. The scene file added to the
    cart of a guide does not count: that buyer paid €5.99 for the guide too, so the upgrade is still theirs; the scene
    alone is not a guide. */
export const oneFullGuide = (files) => {
  const pdfs = files.filter((f) => !f.kind);
  return pdfs.length === 1 && [FULL_TOWER, FULL_3D, FULL_CITY, FULL_BUILD, FULL_TOWERS].some((g) => g.file === pdfs[0].en);
};

/** One Stripe product name → the files it should deliver. Checked in order, first match wins. */
const RULES = [
  // 10/11 (Nico), two more prices of the same pack, both deliver all of it and come back to /learn/thanks/everything:
  // the upgrade after a Full guide (lib/learn.ts everythingUpgrade) and the thank you price (everythingApology).
  // They are written out so the names are in the code; the plain rule under them would catch them too.
  [/everything we teach\s*[·•\-–—:]?\s*upgrade/i, PACK],
  [/everything we teach\s*[·•\-–—:]?\s*thank you price/i, PACK],
  [/everything we teach/i, PACK],
  // 10/11: "The Towers Scene File" BEFORE every rule with "tower" in it. It delivers the zip and nothing else: without
  // this line /tower/ below would send the Full Tower PDF to who bought the scene. "The Full Towers Blueprint" has no
  // "towers scene" in its name, so it still reaches its own rule and its own PDF.
  // towers? so a product typed "The Tower Scene File" by mistake on Stripe still gets the zip and never the Full Tower PDF
  [/towers?\s*scene/i, [SCENE]],
  // 13/11: playbook 03 is now "The launch kit that sells a tower": it must be caught BEFORE /tower/ below, or the buyer
  // of the playbook would get the Full Tower guide. The pack and the other-two offers are matched above or have no "tower".
  [/launch kit that sells a tower/i, [BEFORE_IT_EXISTS]],
  // "build blueprint", never /build/ alone: the Build lesson is a product too
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
      files.push({ name, file, en: f.file, href: signedHref(file, ttl), ...(f.kind ? { kind: f.kind } : {}) });
    }
  }
  // the PDFs first and the scene file after them, whatever the order of the lines in the cart
  return [...files.filter((f) => !f.kind), ...files.filter((f) => f.kind)];
}
