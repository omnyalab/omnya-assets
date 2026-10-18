import raw from '../data/projects.json';

export type Orientation = 'vertical' | 'horizontal';
export interface Still {
  src: string;
  mobile: string;
  w: number;
  h: number;
  orientation: Orientation;
}
export interface Clip {
  desktop: string;
  mobile: string;
  poster: string;
  /** Aspect ratio when it is not 16 / 9, e.g. "9 / 16" for a vertical film. */
  ar?: string;
}
export interface Project {
  id: string;
  title: string;
  category: 'luxury' | 'real-estate';
  cover: Still;
  gallery: Still[];
  videos: Clip[];
  /** Optional, max two lines. Add it to projects.json when ready. */
  description?: string;
  /** Shown on the home page. */
  featured?: boolean;
  /** Address under /work, when it differs from the id (renamed projects keep their folders). */
  slug?: string;
  /** A film with sound: plays on demand with a play button, never as a muted loop. */
  film?: boolean;
  /** false when the film has music only and no subtitles (changes the note under the player). */
  subtitles?: boolean;
  /** Film starts muted as it scrolls into view; a button turns the sound on. */
  autoplay?: boolean;
}

export const projects = raw as Project[];

export const categories: Record<Project['category'], string> = {
  luxury: 'Luxury',
  'real-estate': 'Real estate',
};

// Films with burnt-in subtitles and sound: shown only as a film on the project page.
const FILMS = new Set(['03_ca_dei_colli']);
export const isFilm = (p: Project) => FILMS.has(p.id) || p.film === true;

export const slug = (p: Project) => p.slug ?? p.id.replace(/^\d+_/, '').replace(/_/g, '-');
export const href = (p: Project) => `/work/${slug(p)}`;
export const pad = (n: number) => String(n).padStart(2, '0');
export const number = (p: Project) => pad(projects.indexOf(p) + 1);

export function deliverables(p: Project) {
  const stills = p.gallery.length + 1;
  const films = p.videos.length;
  return { stills, films };
}
