import MiniSearch from 'minisearch';
import type { Article } from './types';
import { fold, tokenize } from './text';

// Specifičniji nivo ima prednost kod sukoba normi: USK > FBiH > BiH.
const LEVEL_BOOST = { USK: 1.3, FBiH: 1.1, BiH: 1 } as const;

// Narodni izrazi koji se ne poklapaju s terminologijom propisa (npr. "prijevoz" -> "otpremni iskaz").
const SYNONYMS: Record<string, string> = {
  prijevoz: 'otpremni iskaz otprema transport',
  prevoz: 'otpremni iskaz otprema transport',
  transport: 'otpremni iskaz otprema prijevoz',
  otprema: 'otpremni iskaz prijevoz',
  sortimenti: 'drvo drvni sortiment',
  sortimenata: 'drvo drvni sortiment',
  sjeca: 'sječa doznaka',
  sjecu: 'sječa doznaka',
  rezanje: 'sječa',
  kazna: 'kaznene odredbe novčana kazna prekršaj',
  kazne: 'kaznene odredbe novčana kazna prekršaj',
  privatna: 'privatne šume šumoposjednik',
  privatnoj: 'privatne šume šumoposjednik',
  posjednik: 'šumoposjednik privatne šume',
  pozar: 'požar zaštita šuma od požara',
  zakup: 'zakup šumskog zemljišta',
};

export function expandQuery(query: string): string {
  // prefiks, jer padeži mijenjaju kraj riječi ("prijevozu", "sječu")
  const keys = Object.keys(SYNONYMS);
  const extra = tokenizeRaw(query).flatMap((t) => {
    const k = keys.find((key) => t.startsWith(key));
    return k ? [SYNONYMS[k] as string] : [];
  });
  return extra.length ? `${query} ${extra.join(' ')}` : query;
}

const tokenizeRaw = (q: string): string[] =>
  fold(q).split(/[^a-z0-9]+/).filter(Boolean);

export function buildIndex(articles: Article[]): MiniSearch<Article> {
  const ms = new MiniSearch<Article>({
    fields: ['heading', 'text', 'lawTitle'],
    storeFields: ['lawId', 'lawTitle', 'level', 'gazette', 'number', 'heading', 'text'],
    tokenize,
    searchOptions: { tokenize, boost: { heading: 2, lawTitle: 1.5 }, fuzzy: 0.15, prefix: true },
  });
  ms.addAll(articles);
  return ms;
}

/** allowedLawIds prazan/undefined = bez ograničenja (svi propisi). */
export function retrieve(
  ms: MiniSearch<Article>,
  query: string,
  k = 6,
  allowedLawIds?: readonly string[],
): Article[] {
  const allowed = allowedLawIds?.length ? new Set(allowedLawIds) : null;
  return ms
    .search(expandQuery(query), {
      filter: allowed ? (r) => allowed.has(r['lawId'] as string) : undefined,
      boostDocument: (_id, _t, doc) => LEVEL_BOOST[(doc?.['level'] as Article['level']) ?? 'BiH'],
    })
    .slice(0, k)
    .map((r) => r as unknown as Article);
}
