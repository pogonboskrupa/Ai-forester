import { tokenize, fold } from './text';
import type { LawInfo, LawSummary } from './types';

/** "čl. 14", "čl. 5, 7 i 9", "čl. 5–7", "dio 2" */
// Referenca na član drugog propisa ("čl. 14 Zakona o šumama", "čl. 26 osnovnog zakona") se ne provjerava i ne linkuje.
export const REF_RE = /(čl\.|članovi?|dio)\s*(\d+[a-z]?(?:\s*(?:,|i|–|-)\s*\d+[a-z]?)*)(?![\da-z])(?!\s*(?:,|i|–|-)\s*\d)(?!\s+(?:st\.\s*\d+\s+)?(?:osnovnog\s+)?(?:zakona|pravilnika|uredbe|odluke|uputstva|statuta|poslovnika))/giu;
const NUM_RE = /\d+[a-z]?/g;

/** Brojevi članova iz teksta rezimea, u obliku koji se koristi u id-ju člana ("14", "dio 2"). */
export function refNumbers(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(REF_RE)) {
    const prefix = m[1]!.toLowerCase() === 'dio' ? 'dio ' : '';
    // "čl. 122–136": raspon se provjerava samo po prvom članu (ostali mogu biti objedinjeni u jedan)
    const body = m[2]!.replace(/\s*[–-]\s*\d+[a-z]?/g, '');
    for (const n of body.match(NUM_RE) ?? []) out.push(`${prefix}${n}`);
  }
  return out;
}

/** Id člana na koji se referenca odnosi: prvo u samom propisu, zatim u propisu koji on mijenja. */
export const resolveRef = (law: { id: string; amends?: string }, num: string, exists: (id: string) => boolean): string | null =>
  [law.id, law.amends].filter((x): x is string => !!x).map((l) => `${l}#${num}`).find(exists) ?? null;

export type Piece = string | { label: string; id: string };

/** Dijeli tekst na komade; reference koje postoje u propisu postaju klikabilne. */
export function linkRefs(text: string, law: { id: string; amends?: string }, exists: (id: string) => boolean): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(REF_RE)) {
    out.push(text.slice(last, m.index));
    const prefix = m[1]!.toLowerCase() === 'dio' ? 'dio ' : '';
    out.push(`${m[1]} `);
    const body = m[2]!;
    let pos = 0;
    for (const n of body.matchAll(NUM_RE)) {
      out.push(body.slice(pos, n.index));
      const id = resolveRef(law, `${prefix}${n[0]}`, exists);
      out.push(id ? { label: n[0], id } : n[0]);
      pos = n.index! + n[0].length;
    }
    out.push(body.slice(pos));
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return out.filter((p) => p !== '');
}

/** Rezime kao markdown za chat: reference postaju [n] citati. */
export function summaryMarkdown(law: LawInfo, s: LawSummary, exists: (id: string) => boolean): { text: string; sourceIds: string[] } {
  const sourceIds: string[] = [];
  const citeRef = (kind: string, body: string): string => {
    const prefix = kind.toLowerCase() === 'dio' ? 'dio ' : '';
    const cites = (body.match(NUM_RE) ?? []).map((n) => {
      const id = resolveRef(law, `${prefix}${n}`, exists);
      if (!id) return '';
      let i = sourceIds.indexOf(id);
      if (i === -1) i = sourceIds.push(id) - 1;
      return `[${i + 1}]`;
    });
    return cites.some(Boolean) ? cites.join('') : '';
  };
  // "(čl. 21)" → " [2]"; referenca koja ne postoji u propisu ostaje kao tekst.
  const cite = (t: string) =>
    t
      .replace(/\s*\(((?:čl\.|članovi?|dio)\s*[^)]*)\)/giu, (whole, inner: string) => {
        const m = new RegExp(REF_RE.source, 'iu').exec(inner);
        const c = m ? citeRef(m[1]!, m[2]!) : '';
        return c ? ` ${c}` : whole;
      })
      .replace(REF_RE, (whole, kind: string, body: string) => citeRef(kind, body) || whole);
  const bold = (t: string) => emphasize(t).map((e) => (e.kind ? `**${e.text}**` : e.text)).join('');
  const list = (items: string[] | undefined) => (items ?? []).map((p) => `- ${bold(cite(p))}`).join('\n');
  const parts = [`**Rezime: ${law.title}** (${law.gazette})`, cite(s.overview), `**Najbitnije**\n${list(s.points)}`];
  if (s.forestry?.length) parts.push(`**Za šumarstvo**\n${list(s.forestry)}`);
  if (s.wood?.length) parts.push(`**Za promet i preradu drveta**\n${list(s.wood)}`);
  if (s.caution) parts.push(`> ${s.caution}`);
  return { text: parts.join('\n\n'), sourceIds };
}

const ASK = /(rezime|sazetak|ukratko|ukratko o|u cemu je|najbitnij\w* (stavk|odredb|iz))/;
const GENERIC = new Set(tokenize('zakon zakona zakonu pravilnik pravilnika odluka uredba propis propisa rezime sazetak ukratko najbitnije stavke odredbe sve'));

/** Prepoznaje zahtjev "rezime zakona o radu" i vraća propis čiji naslov najbolje odgovara (ili null). */
export function findSummaryLaw(question: string, laws: readonly LawInfo[]): LawInfo | null {
  if (!ASK.test(fold(question))) return null;
  const q = new Set(tokenize(question).filter((t) => !GENERIC.has(t)));
  if (!q.size) return null;
  let best: { law: LawInfo; score: number } | null = null;
  let tie = false;
  for (const law of laws) {
    if (!law.summary) continue;
    const t = [...new Set(tokenize(law.title).filter((x) => !GENERIC.has(x)))];
    if (!t.length) continue;
    const hit = t.filter((x) => q.has(x)).length;
    const score = hit / t.length;
    if (hit === 0 || score < 0.5) continue;
    if (!best || score > best.score) { best = { law, score }; tie = false; }
    else if (score === best.score) tie = true;
  }
  return best && !tie ? best.law : null;
}

export type Em = { text: string; kind?: 'role' | 'num' };

// Radna mjesta (naglašavaju se bojom i debljinom) i rokovi/iznosi (debljina) radi kontrasta u gustom tekstu.
const ROLES =
  /(?:pomoćnik\w*\s+upravnika|upravnik\w*|tehnolog\w*(?:\s+za\s+gospodarenje\s+šumama)?|evidentičar\w*|primač\w*|otpremač\w*|poslovođ\w*(?:\s+(?:iskorištavanja|uzgoja)(?:\s+(?:šuma|zaštite(?:\s+i\s+ekologije)?))?)?|čuvar\w*\s+šuma(?:\s*[–-]\s*lugar\w*)?|lugar\w*|doznačar\w*|taksator\w*|projektant\w*|rukovodilac\w*|direktor\w*|blagajnik\w*|knjigovođ\w*)/giu;
const NUMS = /(?:\d{1,3}(?:\.\d{3})*(?:,\d+)?\s?(?:dana|dan|mjeseci|mjeseca|mjesec|sati|sata|godin\w+|KM|%|m3|m³)(?![\p{L}])|\d{1,2}\.\s?\d{1,2}\.(?!\d))/giu;

/** Dijeli tekst na obične i naglašene dijelove (radna mjesta, rokovi, iznosi). */
export function emphasize(text: string, roles = true): Em[] {
  const hits: { s: number; e: number; kind: 'role' | 'num' }[] = [];
  const scan = (re: RegExp, kind: 'role' | 'num') => {
    for (const m of text.matchAll(re)) hits.push({ s: m.index!, e: m.index! + m[0].length, kind });
  };
  if (roles) scan(ROLES, 'role');
  scan(NUMS, 'num');
  hits.sort((a, b) => a.s - b.s || b.e - a.e);
  const out: Em[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.s < pos) continue; // preklapanje: prvi pogodak pobjeđuje
    if (h.s > pos) out.push({ text: text.slice(pos, h.s) });
    out.push({ text: text.slice(h.s, h.e), kind: h.kind });
    pos = h.e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
