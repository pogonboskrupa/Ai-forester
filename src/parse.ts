import type { Article, LawMeta } from './types';

const ARTICLE_RE = /^\s*(?:Član|Clan|ČLAN)\s+(\d+[a-z]?)\.?\s*(?:\((.+?)\))?\s*$/;

/** Dijeli tekst zakona na članove; naslov člana je opcionalan red u zagradi ili prethodni red. */
export function parseArticles(raw: string, law: LawMeta): Article[] {
  const lines = raw.replace(/\r/g, '').split('\n');
  const out: Article[] = [];
  let cur: { number: string; heading: string; body: string[] } | null = null;
  let prevLine = '';

  const flush = () => {
    if (!cur) return;
    const text = cur.body.join('\n').trim();
    if (text) {
      out.push({
        id: `${law.id}#${cur.number}`,
        lawId: law.id,
        lawTitle: law.title,
        level: law.level,
        gazette: law.gazette,
        number: cur.number,
        heading: cur.heading,
        text,
      });
    }
  };

  for (const line of lines) {
    const m = ARTICLE_RE.exec(line);
    if (m && m[1]) {
      flush();
      const heading = m[2] ?? (/^\(.+\)$/.test(prevLine.trim()) ? prevLine.trim().slice(1, -1) : '');
      cur = { number: m[1], heading, body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
    prevLine = line;
  }
  flush();
  return out;
}
