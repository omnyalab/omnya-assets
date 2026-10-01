// Descriptive alt texts, per language: "Project, what you see".
// Kept apart from projects.json so the project data stays as delivered.
import alts from '../data/alts.json';
import type { Project } from './data';
import type { Lang } from '../i18n';

type Pair = { en: string; it: string };
const table = alts as unknown as Record<string, { cover: Pair; gallery: Pair[] } | Pair>;

/** Alt for a project's cover (no index) or one of its gallery images. */
export function alt(p: Project, lang: Lang, index?: number) {
  const entry = table[p.id] as { cover: Pair; gallery: Pair[] } | undefined;
  const pair = index === undefined ? entry?.cover : entry?.gallery[index];
  return pair ? `${p.title}, ${pair[lang]}` : p.title;
}

export const reelAlt = (lang: Lang) => (table._reel as Pair)[lang];
