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
  it('escapuje HTML i pretvara [n] u citat samo za postojeće izvore', () => {
    const h = renderMarkdown('<script>x</script>\n- Tekst [1][2] i [9]', 2);
    expect(h).not.toContain('<script>');
    expect(h.match(/class="cite"/g)?.length).toBe(2);
    expect(h).toContain('[9]');
  });
  it('renderuje tabelu', () => {
    expect(renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |')).toContain('<table>');
  });
});

describe('parseArticles bez članova', () => {
  it('dijeli akt na dijelove', () => {
    const a = parseArticles('NAPUTAK\n\n1.\n\nPrvi paragraf.\n\n2.\n\nDrugi.', law);
    expect(a.length).toBeGreaterThan(0);
    expect(a[0]?.number).toBe('dio 1');
  });
});

import { reflow } from './parse';
describe('reflow', () => {
  it('spaja prelomljene redove, čuva stavove i tačke', () => {
    expect(reflow('(1) Doznaka se vrši\nobilježavanjem stabala.\n(2) Drugi stav\na) prva tačka;\nb) druga')).toBe(
      '(1) Doznaka se vrši obilježavanjem stabala.\n(2) Drugi stav\na) prva tačka;\nb) druga',
    );
  });
  it('spaja red prelomljen na crtici i čuva složenicu', () => {
    expect(reflow('Unsko-\nsanskog kantona')).toBe('Unsko-sanskog kantona');
  });
});
