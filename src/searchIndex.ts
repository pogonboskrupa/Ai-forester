import type MiniSearch from 'minisearch';
import { lazy } from './lazy';
import { buildIndex, retrieve } from './search';
import type { Article } from './types';

/**
 * Indeks pretrage koji se gradi tek kad zatreba (ili u praznom hodu poslije prvog prikaza):
 * građenje traje stotinjak ms na računaru, a više od sekunde na slabijem telefonu.
 */
export function createSearchIndex() {
  let articles: Article[] = [];
  const index = lazy<MiniSearch<Article>>(() => buildIndex(articles));
  return {
    setArticles(next: Article[]): void {
      articles = next;
      index.reset();
    },
    /** Izvodi za upit; allowedLawIds prazan = svi propisi. */
    search(query: string, k: number, allowedLawIds?: readonly string[]): Article[] {
      if (!query.trim() || !articles.length) return [];
      return retrieve(index.get(), query, k, allowedLawIds);
    },
    warm(): void {
      if (articles.length) index.get();
    },
    isBuilt: () => index.isBuilt(),
    hasArticles: () => articles.length > 0,
  };
}
