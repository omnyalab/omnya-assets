// Newsletter consent (8/11/2026). Rules from Nico: the emails are never sold; nobody gets a newsletter
// without Nico's ok; whoever signed up with the old text ("only the email with your blueprint") is NOT
// in the newsletter. Each opt-in row keeps its consent: date, the exact text accepted, the page.
// Unsubscribe link: /api/unsubscribe?e=<email>&t=<token>, token = HMAC of the email (NEWSLETTER_SECRET).
import { createHmac } from 'node:crypto';

const SITE = 'https://www.omnyalab.com';

// Every checkbox text the opt-in has ever shown. Only versions with newsletter: true put people in the list.
export const CONSENT_TEXTS = {
  v1: { newsletter: false, text: 'Only the email with your blueprint, no spam and nothing else. I accept the Privacy Policy.' },
  // v2: added when Nico picks the new text in the board (blueprint + news and offers, one-click unsubscribe)
};

export const OFF_KEY = 'omnya:nl:off'; // Redis set of emails that unsubscribed

const secret = () => process.env.NEWSLETTER_SECRET || process.env.IG_ADMIN_KEY || '';

export const unsubToken = (email) => createHmac('sha256', secret()).update(String(email).trim().toLowerCase()).digest('base64url').slice(0, 24);

export const unsubUrl = (email) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(String(email).trim().toLowerCase())}&t=${unsubToken(email)}`;

export const tokenOk = (email, t) => !!secret() && !!t && unsubToken(email) === t;
