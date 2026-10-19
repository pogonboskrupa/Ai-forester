/**
 * Interni akti ŠPD-a: grade se iz izvora IZVAN repozitorija i u repozitorij ulaze samo šifrovani
 * (data/private/spd.enc.json). Šifra se zadaje varijablom SPD_PASS i nikad se ne upisuje u fajl.
 *
 *   SPD_PASS=… npx tsx scripts/private-bundle.ts add <manifest.json>   dodaje/zamjenjuje akte iz manifesta
 *   SPD_PASS=… npx tsx scripts/private-bundle.ts list                  ispisuje sadržaj paketa
 *   SPD_PASS=… npx tsx scripts/private-bundle.ts remove <lawId>
 *   SPD_PASS=… npx tsx scripts/private-bundle.ts summaries <summaries.json>  upisuje rezimee ({ lawId: LawSummary }) u akte
 *   SPD_PASS=… SPD_NEW_PASS=… npx tsx scripts/private-bundle.ts rekey  mijenja šifru
 *
 * Manifest: [{ id, title, gazette, topic?, kind: "articles" | "positions" | "sections" | "procedure", file }]
 *  - "sections": JSON [{ title, duties: [tekst] }] – odjeljak dokumenta bez članova postaje jedan "član"
 *  - "procedure": JSON strukturiranog pregleda (src/procedure.ts) – čuva se u bundle.procedure
 *  - "articles": tekst s "Član N." (parsira se kao zakon)
 *  - "positions": JSON [{ section, title, duties[] }] – svako radno mjesto postaje jedan "član"
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { decryptJson, encryptJson, type EncryptedBundle } from '../src/crypto';
import { parseArticles } from '../src/parse';
import { reflow } from '../src/text';
import { refNumbers } from '../src/summary';
import type { Article, LawInfo, LawMeta, LawSummary } from '../src/types';
import type { PrivateBundle } from '../src/private';
import { PROCEDURE_LAW_ID, type Procedure } from '../src/procedure';

const OUT = 'data/private/spd.enc.json';

interface ManifestItem {
  id: string;
  title: string;
  gazette: string;
  topic?: string;
  group?: string;
  notice?: string;
  kind: 'articles' | 'positions' | 'sections' | 'procedure';
  file: string;
}
interface Position {
  section: string;
  title: string;
  duties: string[];
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Nedostaje varijabla okruženja ${name}`);
  return v;
}

async function load(pass: string): Promise<PrivateBundle> {
  if (!existsSync(OUT)) return { v: 1, updatedAt: 0, laws: [], articles: [] };
  return decryptJson<PrivateBundle>(JSON.parse(readFileSync(OUT, 'utf8')) as EncryptedBundle, pass);
}

async function save(bundle: PrivateBundle, pass: string): Promise<void> {
  const enc = await encryptJson({ ...bundle, updatedAt: Date.now() }, pass);
  writeFileSync(OUT, `${JSON.stringify(enc)}\n`);
  console.log(`Sačuvano: ${OUT} (${bundle.laws.length} akata, ${bundle.articles.length} članova)`);
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[-–•]\s*/, '').trim();
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function sectionsToArticles(rows: Position[], law: LawMeta): Article[] {
  return rows.map((r, i) => ({
    id: `${law.id}#${i + 1}`,
    lawId: law.id,
    lawTitle: law.title,
    level: law.level,
    gazette: law.gazette,
    number: String(i + 1),
    heading: r.title.trim(),
    text: reflow(r.duties.join('\n')).trim(),
  }));
}

function positionsToArticles(rows: Position[], law: LawMeta): Article[] {
  return rows
    .filter((r) => tidy(r.title) && r.duties.length)
    .map((r, i) => ({
      id: `${law.id}#${i + 1}`,
      lawId: law.id,
      lawTitle: law.title,
      level: law.level,
      gazette: law.gazette,
      number: String(i + 1),
      heading: `${titleCase(tidy(r.title))} – ${tidy(r.section)}`,
      text: r.duties.map((d) => `• ${tidy(d)}`).join('\n'),
    }));
}

async function add(manifestPath: string, pass: string): Promise<void> {
  const base = dirname(resolve(manifestPath));
  const items = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestItem[];
  const bundle = await load(pass);
  for (const it of items) {
    const meta: LawMeta = { id: it.id, file: '', title: it.title, level: 'ŠPD', gazette: it.gazette, inForce: true, sourceUrl: '', topic: it.topic ?? 'Interni akti ŠPD', ...(it.group ? { group: it.group } : {}), ...(it.notice ? { notice: it.notice } : {}) };
    const raw = readFileSync(resolve(base, it.file), 'utf8');
    if (it.kind === 'procedure') {
      bundle.procedure = JSON.parse(raw) as Procedure;
      console.log(`${it.id}: strukturirani pregled procedure`);
      continue;
    }
    const arts =
      it.kind === 'positions' ? positionsToArticles(JSON.parse(raw) as Position[], meta)
      : it.kind === 'sections' ? sectionsToArticles(JSON.parse(raw) as Position[], meta)
      : parseArticles(raw, meta);
    if (!arts.length) throw new Error(`${it.id}: nije pronađen nijedan član`);
    const old = bundle.laws.find((l) => l.id === it.id);
    bundle.laws = [...bundle.laws.filter((l) => l.id !== it.id), { ...meta, articleCount: arts.length, ...(old?.summary ? { summary: old.summary } : {}) } satisfies LawInfo];
    bundle.articles = [...bundle.articles.filter((a) => a.lawId !== it.id), ...arts];
    console.log(`${it.id}: ${arts.length} članova`);
  }
  await save(bundle, pass);
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  const pass = env('SPD_PASS');
  if (cmd === 'add' && arg) return add(arg, pass);
  if (cmd === 'list') {
    const b = await load(pass);
    for (const l of b.laws) console.log(`${l.id}\t${l.articleCount} čl.\t${l.title} (${l.gazette})`);
    return;
  }
  if (cmd === 'remove' && arg) {
    const b = await load(pass);
    const procedure = arg === PROCEDURE_LAW_ID ? undefined : b.procedure;
    return save({ ...b, laws: b.laws.filter((l) => l.id !== arg), articles: b.articles.filter((a) => a.lawId !== arg), procedure }, pass);
  }
  if (cmd === 'summaries' && arg) {
    const b = await load(pass);
    const sums = JSON.parse(readFileSync(arg, 'utf8')) as Record<string, LawSummary>;
    for (const [id, s] of Object.entries(sums)) {
      const law = b.laws.find((l) => l.id === id);
      if (!law) throw new Error(`Rezime: nepoznat akt ${id}`);
      const bad = [s.overview, ...s.points, ...(s.forestry ?? []), ...(s.wood ?? []), s.caution ?? '']
        .flatMap(refNumbers)
        .filter((n) => !b.articles.some((a) => a.id === `${id}#${n}`));
      if (bad.length) throw new Error(`Rezime "${id}": nepostojeći članovi ${[...new Set(bad)].join(', ')}`);
      law.summary = s;
    }
    console.log(`Rezimei upisani: ${Object.keys(sums).length}`);
    return save(b, pass);
  }
  if (cmd === 'rekey') return save(await load(pass), env('SPD_NEW_PASS'));
  console.error('Upotreba: add <manifest.json> | list | remove <lawId> | summaries <json> | rekey');
  process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
