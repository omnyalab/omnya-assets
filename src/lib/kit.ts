// The downloadable kit: three PDFs per language in public/kit, covers in
// public/studio. File sizes are read at build time, so they are always true.
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { t, type Lang } from '../i18n';

const files: Record<Lang, Array<{ key: 'portfolio' | 'howWeWork' | 'prices'; file: string; cover: string; w: number; h: number }>> = {
  en: [
    { key: 'portfolio', file: 'omnya-lab-portfolio-2026-en.pdf', cover: 'kit_cover_portfolio_en', w: 1287, h: 911 },
    { key: 'howWeWork', file: 'omnya-lab-how-we-work-en.pdf', cover: 'kit_cover_howwework_en', w: 1287, h: 911 },
    { key: 'prices', file: 'omnya-lab-price-list-2026-en.pdf', cover: 'kit_cover_pricelist_en', w: 911, h: 1287 },
  ],
  it: [
    { key: 'portfolio', file: 'omnya-lab-portfolio-2026-it.pdf', cover: 'kit_cover_portfolio_it', w: 1287, h: 911 },
    { key: 'howWeWork', file: 'omnya-lab-come-lavoriamo-it.pdf', cover: 'kit_cover_comelavoriamo_it', w: 1287, h: 911 },
    { key: 'prices', file: 'omnya-lab-listino-2026-it.pdf', cover: 'kit_cover_listino_it', w: 911, h: 1287 },
  ],
};

/** "11 MB", "1.4 MB", "820 KB" (Italian: "1,4 MB") */
function weight(bytes: number, lang: Lang) {
  const mb = bytes / (1024 * 1024);
  const n = (v: number, d: number) => v.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { maximumFractionDigits: d });
  if (mb >= 10) return `${n(mb, 0)} MB`;
  if (mb >= 1) return `${n(mb, 1)} MB`;
  return `${n(bytes / 1024, 0)} KB`;
}

export function kit(lang: Lang) {
  const names = t(lang).kit;
  return files[lang].map((f) => {
    const href = `/kit/${lang}/${f.file}`;
    const bytes = statSync(join(process.cwd(), 'public', href)).size;
    return {
      key: f.key,
      name: names[f.key],
      href,
      file: f.file,
      size: weight(bytes, lang),
      cover: { src: `/studio/${f.cover}.webp`, mobile: `/studio/${f.cover}_mobile.webp`, w: f.w, h: f.h },
    };
  });
}

export const kitFile = (lang: Lang, key: 'portfolio' | 'howWeWork' | 'prices') => kit(lang).find((k) => k.key === key)!;
