// GET/POST /api/unsubscribe?e=<email>&t=<token> — one click, no login: the email goes in omnya:nl:off and
// never gets the newsletter again (the export leaves it out). POST also works for mail clients'
// "List-Unsubscribe-Post: List-Unsubscribe=One-Click".
import { redis, hasStore } from './_lib/store.js';
import { OFF_KEY, tokenOk } from './_lib/newsletter.js';

const page = (title, line, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Omnya Lab</title>
<style>html{background:#05070a;color:#fff;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}body{min-height:100svh;display:grid;place-items:center;margin:0;padding:16px;text-align:center}h1{font-size:28px;letter-spacing:-.02em;margin:0 0 10px}p{color:#ffffffb0;margin:0 0 22px}a{color:#2997ff}</style></head>
<body><div><h1>${title}</h1><p>${line}</p><a href="https://www.omnyalab.com">omnyalab.com</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

async function off(request) {
  const q = new URL(request.url).searchParams;
  const email = String(q.get('e') || '').trim().toLowerCase();
  if (!email || !tokenOk(email, q.get('t'))) return page('Link not valid', 'Write to info@omnyalab.com and we take you off by hand.', 400);
  if (hasStore()) await redis('SADD', OFF_KEY, email);
  return page('You are off the list', 'No more emails from Omnya Lab. Changed your mind? Sign up again on the site.');
}

export const GET = off;
export const POST = off;
