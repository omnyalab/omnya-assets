// sitemap.xml: every public page in both languages (Learn's DM copies and the thanks pages stay out)
import type { APIRoute } from 'astro';
import { projects, slug } from '../lib/data';

const pages = ['/', '/work', '/studio', '/pricing', '/learn', '/contact', '/privacy-policy', ...projects.map((p) => `/work/${slug(p)}`)];
const site = 'https://www.omnyalab.com';
const url = (p: string) => {
  const en = site + p, it = site + (p === '/' ? '/it' : `/it${p}`);
  const alt = `<xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="it" href="${it}"/>`;
  return `<url><loc>${en}</loc>${alt}</url><url><loc>${it}</loc>${alt}</url>`;
};

export const GET: APIRoute = () =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.map(url).join('')}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
