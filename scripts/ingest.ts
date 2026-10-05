import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseArticles } from '../src/parse';
import type { Article, LawInfo, LawMeta } from '../src/types';

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
  console.log(`${law.id}: ${arts.length} članova`);
  articles.push(...arts);
  laws.push({ ...law, articleCount: arts.length });
}

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/articles.json', JSON.stringify(articles));
writeFileSync('public/data/laws.json', JSON.stringify(laws));
console.log(`Ukupno: ${laws.length} propisa, ${articles.length} članova`);
