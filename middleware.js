// 27/11 (QA: the course films of THE 3D FUTURE were public): Vercel Routing Middleware in front of /club/course/v/ only.
// A piece of a film is served only with the cookie t3f_v that /api/club/inside gives to a member whose club is open
// (api/_lib/club.js, hlsCookie: exp.sig, HMAC with the same key as the member links). Everything else on the site never
// passes through here (matcher).
import { next } from '@vercel/functions';

export const config = { matcher: '/club/course/v/:path*' };

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}
async function tokenKey() {   // the same as tokenKey() in api/_lib/club.js
  if (process.env.CLUB_SECRET) return process.env.CLUB_SECRET;
  const base = process.env.STRIPE_WEBHOOK_SECRET || '';
  return base ? hex(await hmac(base, 'omnya-club-token')) : '';
}
export async function allowed(cookie, now = Date.now()) {
  const m = /(?:^|;\s*)t3f_v=(\d{9,11})\.([A-Za-z0-9_-]{22})(?:;|$)/.exec(cookie || '');
  if (!m || Number(m[1]) * 1000 < now) return false;
  const key = await tokenKey(); if (!key) return false;
  const want = b64url(await hmac(key, `hls|${m[1]}`)).slice(0, 22);
  let diff = 0; for (let i = 0; i < 22; i++) diff |= want.charCodeAt(i) ^ m[2].charCodeAt(i);
  return diff === 0;
}
export default async function middleware(request) {
  if (await allowed(request.headers.get('cookie'))) return next();
  return new Response('Open the course from your link to THE 3D FUTURE.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
