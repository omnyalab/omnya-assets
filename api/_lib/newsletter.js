// Newsletter consent (8/11/2026). Rules from Nico: the emails are never sold; nobody gets a newsletter
// without Nico's ok; whoever signed up with the old text ("only the email with your blueprint") is NOT
// in the newsletter. Each opt-in row keeps its consent: date, the exact text accepted, the page.
// Unsubscribe link: /api/unsubscribe?e=<email>&t=<token>, token = HMAC of the email (NEWSLETTER_SECRET).
import { createHmac } from 'node:crypto';

const SITE = 'https://www.omnyalab.com';

// Every checkbox text the opt-in has ever shown. Only versions with newsletter: true put people in the list.
export const CONSENT_TEXTS = {
  v1: { newsletter: false, text: 'Only the email with your blueprint, no spam and nothing else. I accept the Privacy Policy.' },
  // v2 (Nico 8/11: one box like before, "no spam", no promise of offers): these people can get the newsletter
  v2: { newsletter: true, text: 'Your blueprint by email, and now and then an update from us. No spam, unsubscribe in one click. I accept the Privacy Policy.' },
  // v3 (Nico 10/11): two parts. The blueprint email needs no box; the newsletter is its own box and starts empty.
  // Only a ticked box (nl: true from the form) puts the person in the list; without it the row keeps the `base` text.
  v3: { newsletter: true, text: 'Also send me an update now and then. No spam, unsubscribe in one click.', base: 'By sending you accept the Privacy Policy.' },
};

export const OFF_KEY = 'omnya:nl:off'; // Redis set of emails that unsubscribed

const secret = () => process.env.NEWSLETTER_SECRET || process.env.IG_ADMIN_KEY || '';

export const unsubToken = (email) => createHmac('sha256', secret()).update(String(email).trim().toLowerCase()).digest('base64url').slice(0, 24);

export const unsubUrl = (email) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(String(email).trim().toLowerCase())}&t=${unsubToken(email)}`;

export const tokenOk = (email, t) => !!secret() && !!t && unsubToken(email) === t;
