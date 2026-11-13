// GET /api/file?f=en/full-towers-blueprint.pdf&e=<end, unix seconds>&s=<signature> — one paid PDF (10/11).
// The paid files are no longer in public/: they sit in private/learn/ and are bundled with this function
// only (vercel.json, includeFiles). A link works only with the signature made by api/_lib/learn-files.js
// and until its end date: the page after a verified payment gives 24-hour links (api/files.js), the email
// after the payment one-year links (api/stripe-webhook.js). Anything else gets the kind page below, never a file.
// The old public links (/learn/files/…) are sent here too, so they end on the same page.
// The PDF is streamed: a streamed answer has no 4.5 MB limit on Vercel (the playbooks are up to 8 MB).
// 10/11: one file is not a PDF, the Towers scene (en/the-towers-scene.zip). Same signature, same end date, same
// folder; it goes out as application/zip and as a download with its own clean name, the PDFs as before.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkOk, diskName } from './_lib/learn-files.js';

// two places to look: the project root (Vercel runs functions from it) and next to this file's folder
const ROOTS = [join(process.cwd(), 'private', 'learn'), fileURLToPath(new URL('../private/learn', import.meta.url))];
const WA = 'https://wa.me/393792220465?text=' + encodeURIComponent('Hi Nico, my download link is not working. I paid with this email: ');

const closed = (status = 403) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>This link has expired · Omnya Lab</title>
<style>html{background:#edeae4;color:#111;font:17px/1.5 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}body{min-height:100svh;display:grid;place-items:center;margin:0;padding:24px}main{max-width:440px}p{margin:0 0 14px}small{display:block;margin:0 0 28px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6761}h1{margin:0 0 16px;font-size:28px;line-height:1.1;letter-spacing:-.03em;font-weight:600}a{color:inherit}.b{display:inline-block;margin:10px 8px 0 0;background:#b8613c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px}.l{background:none;color:#111;border:1px solid #11111140}</style></head>
<body><main><small>Omnya Lab</small><h1>This download link has expired.</h1>
<p>Your PDFs are safe: write to us with the email you paid with and we send them again right away.</p>
<p><a class="b" href="${WA}">Write on WhatsApp</a><a class="b l" href="mailto:info@omnyalab.com?subject=My%20download%20link">info@omnyalab.com</a></p></main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const file = q.get('f') || '';
  if (!linkOk(file, q.get('e'), q.get('s'))) return closed();
  // file is one of the known names (linkOk), never a path from outside
  // an old playbook name from a link sent before 13/11 opens the new file (learn-files.js, OLD)
  const real = diskName(file);
  let path = '';
  for (const root of ROOTS) if (!path && (await stat(join(root, real)).catch(() => null))) path = join(root, real);
  if (!path) {
    console.error('[file] missing in the bundle', file);
    return closed(404);
  }
  const zip = file.endsWith('.zip');
  return new Response(Readable.toWeb(createReadStream(path)), {
    headers: {
      'Content-Type': zip ? 'application/zip' : 'application/pdf',
      'Content-Disposition': `${zip ? 'attachment' : 'inline'}; filename="${real.split('/').pop()}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
