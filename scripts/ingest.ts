import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseArticles } from '../src/parse';
import type { Article, LawMeta } from '../src/types';

const registry: LawMeta[] = JSON.parse(readFileSync('data/registry.json', 'utf8'));
const all: Article[] = [];

for (const law of registry) {
  const path = `data/raw/${law.file}`;
  if (!existsSync(path)) {
    console.warn(`PRESKOČENO (nema fajla): ${path}`);
    continue;
  }
  const arts = parseArticles(readFileSync(path, 'utf8'), law);
  console.log(`${law.id}: ${arts.length} članova`);
  all.push(...arts);
}

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/articles.json', JSON.stringify(all));
console.log(`Ukupno: ${all.length} članova`);
