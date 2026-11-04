import type { Article, LawSummary } from '../types';

const MAX_POINTS = 10;
const MAX_LEN = 240;
const HEADINGS_IN_OVERVIEW = 6;

// Rokovi i iznosi imaju prednost; zatim obaveze, zabrane i kazne.
const NUMERIC = /\d[\d.,]*\s?(?:dana|dan|mjeseci|mjeseca|mjesec|sati|sata|godin\w+|KM|%)(?![\p{L}])/iu;
const DUTY = /(?<!\p{L})(?:dužan|dužni|dužna|obavezan|obavezno|zabranjeno|zabranjuje|ne smije|kaznit|prekršaj)/iu;

const sentences = (text: string): string[] => text.replace(/\s+/g, ' ').split(/(?<=[.;:])\s+(?=\p{Lu})/u).map((s) => s.trim()).filter(Boolean);

function clip(s: string): string {
  const t = s.replace(/[;:]$/, '').trim();
  return t.length <= MAX_LEN ? t : `${t.slice(0, MAX_LEN - 1).replace(/\s+\S*$/, '')}…`;
}

/** Najvažnija rečenica člana: prvo ona s rokom/iznosom, zatim ona s obavezom ili zabranom. */
function keySentence(a: Article): { s: string; score: number } | null {
  let best: { s: string; score: number } | null = null;
  for (const s of sentences(a.text)) {
    const score = (NUMERIC.test(s) ? 2 : 0) + (DUTY.test(s) ? 1 : 0);
    if (score > (best?.score ?? 0)) best = { s, score };
  }
  return best;
}

/**
 * Automatski (bez AI-ja) rezime uploadovanog propisa: pregled sadržaja i izdvojeni rokovi, iznosi i obaveze,
 * svaki uz član iz kojeg dolazi. Ništa se ne dodaje izvan teksta propisa.
 */
export function summarizeLocal(articles: Article[]): LawSummary {
  if (!articles.length) return { overview: '', points: [] };
  const headings = [...new Set(articles.map((a) => a.heading?.trim()).filter((h): h is string => !!h))];
  const shown = headings.slice(0, HEADINGS_IN_OVERVIEW);
  const first = sentences(articles[0]!.text)[0];
  const overview =
    `Propis ima ${articles.length} članova.` +
    (shown.length ? ` Obuhvata: ${shown.join(', ')}${headings.length > shown.length ? ' i drugo' : ''}.` : first ? ` ${clip(first)}` : '');

  const points = articles
    .map((a, i) => ({ a, i, k: keySentence(a) }))
    .filter((x): x is { a: Article; i: number; k: { s: string; score: number } } => !!x.k)
    .sort((x, y) => y.k.score - x.k.score || x.i - y.i)
    .slice(0, MAX_POINTS)
    .sort((x, y) => x.i - y.i) // izbor po važnosti, prikaz redoslijedom propisa
    .map((x) => `${clip(x.k.s)} (${/^\d/.test(x.a.number) ? `čl. ${x.a.number}` : x.a.number})`);

  return {
    overview,
    points,
    caution: 'Automatski izdvojeno iz teksta propisa (bez AI-ja): rokovi, iznosi i obaveze. Za potpun smisao pročitajte cijeli tekst.',
  };
}
