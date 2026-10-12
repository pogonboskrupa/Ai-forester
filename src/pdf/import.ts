/** Od PDF-a do propisa u bazi: čitanje, podjela na akte, članovi, povezivanje izmjena. */
import { amendedArticleNumbers, parseArticles } from '../parse';
import type { Article, Level, UserLaw } from '../types';
import { detectMeta, fixLegacyLines, splitActs, type ActDraft, type Meta } from './acts';
import { documentLines } from './layout';
import { readPdf } from './read';

export interface PdfAnalysis {
  fileName: string;
  pageCount: number;
  acts: ActDraft[];
  meta: Meta;
  hasText: boolean;
}

export async function analyzePdf(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfAnalysis> {
  const { pages, pageCount } = await readPdf(await file.arrayBuffer(), onProgress);
  const lines = fixLegacyLines(documentLines(pages));
  const hasText = lines.join('').replace(/\s/g, '').length > 200;
  return { fileName: file.name, pageCount, acts: hasText ? splitActs(lines) : [], meta: detectMeta(lines.slice(0, 60).join(' ')), hasText };
}

export interface ActChoice {
  title: string;
  level: Level;
  gazette: string;
  topic: string;
  amends: string; // '' = ne mijenja drugi propis
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

export function buildUserLaw(act: ActDraft, choice: ActChoice, fileName: string): UserLaw {
  const id = `moj-${slug(choice.title) || 'propis'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const meta = {
    id,
    file: fileName,
    title: choice.title.trim() || act.title,
    level: choice.level,
    gazette: choice.gazette.trim(),
    inForce: true,
    sourceUrl: '',
    topic: choice.topic.trim() || 'Šumarstvo',
    ...(choice.amends ? { amends: choice.amends } : {}),
  };
  const articles = parseArticles(act.text, meta);
  return { law: { ...meta, articleCount: articles.length, custom: true, addedAt: Date.now() }, articles };
}

/** Isto kao u ingestu: član osnovnog akta dobija listu članova iz zakona o izmjenama. */
export function linkAmendments(all: Article[], amendingLaws: { id: string; amends?: string }[]): Article[] {
  const byId = new Map(all.map((a) => [a.id, { ...a }]));
  for (const law of amendingLaws.filter((l) => l.amends)) {
    for (const a of all.filter((x) => x.lawId === law.id)) {
      for (const n of amendedArticleNumbers(a.text)) {
        const base = byId.get(`${law.amends}#${n}`);
        if (base) base.amendedBy = [...new Set([...(base.amendedBy ?? []), a.id])];
      }
    }
  }
  return [...byId.values()];
}
