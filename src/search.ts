import MiniSearch from 'minisearch';
import type { Article } from './types';
import { tokenize } from './text';

// Specifičniji nivo ima prednost kod sukoba normi: USK > FBiH > BiH.
const LEVEL_BOOST = { USK: 1.3, FBiH: 1.1, BiH: 1 } as const;

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
    .search(query, {
      filter: allowed ? (r) => allowed.has(r['lawId'] as string) : undefined,
      boostDocument: (_id, _t, doc) => LEVEL_BOOST[(doc?.['level'] as Article['level']) ?? 'BiH'],
    })
    .slice(0, k)
    .map((r) => r as unknown as Article);
}
