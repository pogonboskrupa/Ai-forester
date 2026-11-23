/** Sačuvani članovi (zvjezdica): mali spisak id-jeva, čuva se lokalno i ulazi u backup. */
import { effect, signal } from '@preact/signals';

export interface Bookmark {
  id: string; // id člana (`${lawId}#${broj}`)
  at: number; // kada je sačuvan
}

const KEY = 'ai-sumar-bookmarks';

export function toggleBookmark(list: Bookmark[], id: string, now = Date.now()): Bookmark[] {
  return list.some((b) => b.id === id) ? list.filter((b) => b.id !== id) : [{ id, at: now }, ...list];
}

const valid = (b: unknown): b is Bookmark =>
  !!b && typeof (b as Bookmark).id === 'string' && typeof (b as Bookmark).at === 'number';

/** Spajanje s backupom: bez duplikata (zadržava se novija oznaka), novije prvo; neispravni unosi se preskaču. */
export function mergeBookmarks(current: Bookmark[], incoming: unknown[]): Bookmark[] {
  const byId = new Map<string, Bookmark>();
  for (const b of [...current, ...incoming.filter(valid)]) {
    const prev = byId.get(b.id);
    if (!prev || b.at > prev.at) byId.set(b.id, b);
  }
  return [...byId.values()].sort((a, b) => b.at - a.at);
}

function load(): Bookmark[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter(valid) : [];
  } catch {
    return [];
  }
}

export const bookmarks = signal<Bookmark[]>(load());

effect(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(bookmarks.value));
  } catch {
    /* privatni mod: oznake vrijede do zatvaranja */
  }
});

export const isBookmarked = (id: string): boolean => bookmarks.value.some((b) => b.id === id);
export const toggle = (id: string): void => void (bookmarks.value = toggleBookmark(bookmarks.value, id));
