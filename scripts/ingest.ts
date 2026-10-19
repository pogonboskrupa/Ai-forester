import { copyFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { amendedArticleNumbers, parseArticles } from '../src/parse';
import { refNumbers, resolveRef } from '../src/summary';
import type { Article, FaqEntry, LawInfo, LawMeta, LawSummary } from '../src/types';

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

// Rezimei propisa (data/summaries.json): svaka referenca "(čl. N)" mora postojati u propisu, inače build pada.
const summaries: Record<string, LawSummary> = existsSync('data/summaries.json') ? JSON.parse(readFileSync('data/summaries.json', 'utf8')) : {};
const summaryErrors: string[] = [];
for (const [id, s] of Object.entries(summaries)) {
  const law = laws.find((l) => l.id === id);
  if (!law) {
    summaryErrors.push(`nepoznat propis ${id}`);
    continue;
  }
  const bad = [s.overview, ...s.points, ...(s.forestry ?? []), ...(s.wood ?? []), s.caution ?? '']
    .flatMap(refNumbers)
    .filter((n) => !resolveRef(law, n, (x) => byId.has(x)));
  if (bad.length) summaryErrors.push(`${id}: nepostojeći članovi ${[...new Set(bad)].join(', ')}`);
  law.summary = s;
}
if (summaryErrors.length) throw new Error(`Rezimei:\n  ${summaryErrors.join('\n  ')}`);

// Česta pitanja: reference [@lawId#broj] -> [n]; nepostojeća referenca ruši build.
type RawFaq = Omit<FaqEntry, 'sourceIds'>;
const rawFaq: RawFaq[] = existsSync('data/faq.json') ? JSON.parse(readFileSync('data/faq.json', 'utf8')) : [];
const faq: FaqEntry[] = rawFaq.map((f) => {
  const sourceIds: string[] = [];
  // Citat izmijenjenog člana dobija ispred sebe citat važeće izmjene (ako ga odgovor već ne navodi).
  const withCurrent = f.answer.replace(/\[@([^\]]+)\]/g, (m, id: string) => {
    const add = (byId.get(id)?.amendedBy ?? []).filter((x) => !f.answer.includes(`[@${x}]`));
    return `${add.map((x) => `[@${x}]`).join('')}${m}`;
  });
  const answer = withCurrent.replace(/\[@([^\]]+)\]/g, (_m, id: string) => {
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
// Interni akti ŠPD-a idu u aplikaciju samo šifrovani (vidi scripts/private-bundle.ts).
if (existsSync('data/private/spd.enc.json')) copyFileSync('data/private/spd.enc.json', 'public/data/spd.enc.json');
console.log(`Ukupno: ${laws.length} propisa, ${articles.length} članova, ${links} veza izmjena, ${faq.length} provjerenih odgovora`);
