import { describe, expect, it } from 'vitest';
import { extractiveAnswer } from './answer';
import { buildPrompt } from './ai/prompt';
import type { Article } from './types';

const art = (id: string, text: string, extra: Partial<Article> = {}): Article => ({
  id, lawId: id.split('#')[0]!, lawTitle: id.split('#')[0]!, level: 'USK', gazette: '1/12', number: id.split('#')[1]!, heading: '', text, ...extra,
});

describe('zastarjeli članovi', () => {
  const oldA = art('zakon#65', 'Ministarstvo putem Uprave za šumarstvo dužno je obezbjediti čuvanje šuma.', { amendedBy: ['izmjene#8'] });
  const newA = art('izmjene#8', 'U članu 65. riječi "Ministarstvo" zamjenjuju se riječima "Korisnik šuma je dužan".');
  it('odgovor bez AI-ja citira izmjenu, a stari tekst precrtava', () => {
    const ans = extractiveAnswer('ko je dužan čuvati šumu', [newA, oldA]);
    expect(ans).toContain('**Važeća izmjena – izmjene, član 8** [1]');
    expect(ans).toMatch(/~~zakon, član 65~~ \[2\] – \*\*zastarjeli tekst\*\*, važi izmjena \[1\]/);
  });
  it('AI dobija oznake zastarjelog i važećeg izvoda', () => {
    const p = buildPrompt('ko čuva šumu', [newA, oldA]);
    expect(p).toContain('[1] izmjene (1/12), član 8 [VAŽEĆA IZMJENA člana iz izvoda [2]]');
    expect(p).toContain('[ZASTARJELI TEKST – izmijenjen izvodom [1]');
  });
});

import { renderMarkdown } from './md';
describe('markdown', () => {
  it('precrtani tekst', () => {
    expect(renderMarkdown('~~staro~~ i **novo**')).toContain('<del>staro</del>');
  });
});
