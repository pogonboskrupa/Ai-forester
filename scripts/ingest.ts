import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { amendedArticleNumbers, parseArticles } from '../src/parse';
import type { Article, FaqEntry, LawInfo, LawMeta } from '../src/types';

const registry: LawMeta[] = JSON.parse(readFileSync('data/registry.json', 'utf8'));
const articles: Article[] = [];
const laws: LawInfo[] = [];

for (const law of registry) {
  const path = `data/raw/${law.file}`;
  if (!existsSync(path)) {
    console.warn(`PRESKOČENO (nema fajla): ${path}`);
    continue;
  }
  const arts = parseArticles(readFileSync(path, 'utf8'), law);
  articles.push(...arts);
  laws.push({ ...law, articleCount: arts.length });
}

// Povezivanje izmjena: član osnovnog akta dobija listu članova koji ga mijenjaju.
const byId = new Map(articles.map((a) => [a.id, a]));
let links = 0;
for (const law of registry.filter((l) => l.amends)) {
  for (const a of articles.filter((x) => x.lawId === law.id)) {
    for (const n of amendedArticleNumbers(a.text)) {
      const base = byId.get(`${law.amends}#${n}`);
      if (!base) continue;
      base.amendedBy = [...new Set([...(base.amendedBy ?? []), a.id])];
      links++;
    }
  }
}

// Česta pitanja: reference [@lawId#broj] -> [n]; nepostojeća referenca ruši build.
type RawFaq = Omit<FaqEntry, 'sourceIds'>;
const rawFaq: RawFaq[] = existsSync('data/faq.json') ? JSON.parse(readFileSync('data/faq.json', 'utf8')) : [];
const faq: FaqEntry[] = rawFaq.map((f) => {
  const sourceIds: string[] = [];
  const answer = f.answer.replace(/\[@([^\]]+)\]/g, (_m, id: string) => {
    if (!byId.has(id)) throw new Error(`FAQ "${f.id}": nepostojeći član ${id}`);
    let i = sourceIds.indexOf(id);
    if (i === -1) i = sourceIds.push(id) - 1;
    return `[${i + 1}]`;
  });
  return { ...f, answer, sourceIds };
});

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/articles.json', JSON.stringify(articles));
writeFileSync('public/data/laws.json', JSON.stringify(laws));
writeFileSync('public/data/faq.json', JSON.stringify(faq));
console.log(`Ukupno: ${laws.length} propisa, ${articles.length} članova, ${links} veza izmjena, ${faq.length} provjerenih odgovora`);
