import MiniSearch from 'minisearch';
import { fold, tokenize } from './text';
import type { Article, FaqEntry } from './types';

// Upitne i pomoćne riječi ne nose značenje za podudaranje pitanja.
const STOP = new Set(
  ['ko', 'sta', 'sto', 'kako', 'koji', 'koja', 'koje', 'kojem', 'kojim', 'li', 'da', 'je', 'su', 'u', 'i', 'se', 'za', 'na', 'od', 'do', 's', 'sa', 'o', 'a', 'ili', 'mi', 'me', 'moze', 'mogu', 'smije', 'treba', 'mora', 'kada', 'gdje', 'koliko', 'kolika', 'iz', 'po', 'pri', 'bez', 'ako', 'te', 'to', 'ta', 'taj', 'li', 'jel', 'dali']
    .map((w) => tokenize(w)[0])
    .filter((w): w is string => !!w),
);

export const contentTokens = (q: string): string[] => [...new Set(tokenize(q).filter((t) => !STOP.has(t)))];

export function buildFaqIndex(faq: FaqEntry[]): MiniSearch<FaqEntry> {
  const ms = new MiniSearch<FaqEntry>({
    fields: ['q', 'altText', 'topic'],
    storeFields: ['id'],
    extractField: (doc, field) => (field === 'altText' ? doc.alt.join(' · ') : (doc as unknown as Record<string, string>)[field] ?? ''),
    tokenize,
    searchOptions: { tokenize, boost: { q: 2 }, fuzzy: 0.15, prefix: true },
  });
  ms.addAll(faq);
  return ms;
}

const jaccard = (a: string[], b: string[]): number => {
  const sb = new Set(b);
  const inter = a.filter((t) => sb.has(t)).length;
  return inter / (new Set([...a, ...b]).size || 1);
};

/**
 * Provjereni odgovor samo kad pitanje pokriva većinu značajnih riječi nekog FAQ pitanja (ili varijante).
 * Među kandidatima iz pretrage pobjeđuje najveće poklapanje skupova riječi, ne samo BM25 rezultat.
 */
export function matchFaq(ms: MiniSearch<FaqEntry>, faq: FaqEntry[], question: string): FaqEntry | null {
  const tokens = contentTokens(question);
  if (tokens.length === 0) return null;
  const candidates = ms.search(tokens.join(' '), { combineWith: 'OR' }).slice(0, 6);
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const c of candidates) {
    const entry = faq.find((f) => f.id === c.id);
    if (!entry) continue;
    for (const phrase of [entry.q, ...entry.alt]) {
      const pt = contentTokens(phrase);
      const coverage = tokens.filter((t) => pt.includes(t)).length / tokens.length;
      if (coverage < 0.6 || pt.filter((t) => tokens.includes(t)).length < Math.min(2, tokens.length)) continue;
      const score = jaccard(tokens, pt) + coverage * 0.5;
      if (!best || score > best.score) best = { entry, score };
    }
  }
  return best?.entry ?? null;
}

/** Rečenice/stavovi člana poredani po broju riječi iz pitanja. */
function bestSentences(text: string, tokens: string[], max: number): string[] {
  const parts = text
    .split(/\n|(?<=[.;:])\s+(?=[A-ZČĆŠŽĐ(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const scored = parts.map((s, i) => {
    const words = new Set(tokenize(s));
    return { s, i, score: tokens.filter((t) => words.has(t)).length };
  });
  const top = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, max);
  return (top.length ? top : scored.slice(0, 1)).sort((a, b) => a.i - b.i).map((x) => (x.s.length > 420 ? `${x.s.slice(0, 400)}…` : x.s));
}

/** Odgovor bez AI-ja: najrelevantnije odredbe s izdvojenim rečenicama, uz citate [n]. */
export function extractiveAnswer(question: string, ctx: Article[], max = 5): string {
  if (!ctx.length) {
    return 'Nisam pronašao odredbe koje odgovaraju pitanju. Pokušajte drugim riječima (npr. "doznaka", "otpremni iskaz", "kazna za sječu") ili pretražite Biblioteku.';
  }
  const tokens = contentTokens(question);
  const blocks = ctx.slice(0, max).map((a, i) => {
    const title = `**${a.lawTitle}, član ${a.number}${a.heading ? ` – ${a.heading}` : ''}** [${i + 1}]`;
    const quotes = bestSentences(a.text, tokens, 2).map((s) => `> ${s}`).join('\n');
    const amended = a.amendedBy?.length ? '\n_Ovaj član je izmijenjen kasnijim zakonom – otvorite izvor za detalje._' : '';
    return `${title}\n${quotes}${amended}`;
  });
  return `Najrelevantnije odredbe za vaše pitanje:\n\n${blocks.join('\n\n')}`;
}

export const normalizeQuestion = (q: string): string => fold(q).replace(/[^a-z0-9 ]+/g, ' ').trim();
