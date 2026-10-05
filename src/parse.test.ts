import { describe, expect, it } from 'vitest';
import { parseArticles } from './parse';
import { tokenize } from './text';
import type { LawMeta } from './types';

const law: LawMeta = { id: 't', file: 't', title: 'T', level: 'USK', gazette: 'g', inForce: true, sourceUrl: '' };

describe('parseArticles', () => {
  it('dijeli po članovima i hvata naslov', () => {
    const a = parseArticles('(Doznaka)\nČlan 5.\nSječa se vrši uz doznaku.\nČlan 6.\nDrugi tekst.', law);
    expect(a.map((x) => x.number)).toEqual(['5', '6']);
    expect(a[0]?.heading).toBe('Doznaka');
  });
});

describe('tokenize', () => {
  it('normalizira dijakritike i padeže', () => {
    expect(tokenize('šumama')).toEqual(tokenize('sumama'));
    expect(tokenize('šuma')[0]).toBe('suma');
  });
});

import { renderMarkdown } from './md';
describe('renderMarkdown', () => {
  it('escapuje HTML i označava citate', () => {
    const h = renderMarkdown('<script>x</script>\n- [Zakon o šumama, član 5]');
    expect(h).not.toContain('<script>');
    expect(h).toContain('class="cite"');
  });
});
