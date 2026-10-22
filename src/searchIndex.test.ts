import { describe, expect, it } from 'vitest';
import { createSearchIndex } from './searchIndex';
import type { Article } from './types';

const art = (id: string, text: string): Article => ({ id, lawId: 'z', lawTitle: 'Zakon', level: 'USK', gazette: 'g', number: id, heading: '', text });

describe('searchIndex', () => {
  it('nije izgrađen dok se ne traži; prvi upit ga gradi na zahtjev', () => {
    const s = createSearchIndex();
    s.setArticles([art('1', 'doznaka stabala za sječu')]);
    expect(s.isBuilt()).toBe(false);
    expect(s.search('doznaka', 5).map((a) => a.id)).toEqual(['1']);
    expect(s.isBuilt()).toBe(true);
  });
  it('promjena korpusa poništava indeks – nema zastarjelih rezultata', () => {
    const s = createSearchIndex();
    s.setArticles([art('1', 'doznaka stabala')]);
    expect(s.search('doznaka', 5)).toHaveLength(1);
    s.setArticles([art('2', 'otpremni iskaz')]);
    expect(s.search('doznaka', 5)).toHaveLength(0);
    expect(s.search('otpremni', 5).map((a) => a.id)).toEqual(['2']);
  });
  it('prazan korpus ili prazan upit daje prazan rezultat', () => {
    const s = createSearchIndex();
    expect(s.search('x', 5)).toEqual([]);
    s.setArticles([art('1', 'tekst')]);
    expect(s.search('   ', 5)).toEqual([]);
  });
  it('warm() gradi indeks unaprijed i vraća se ranije izgrađen', () => {
    const s = createSearchIndex();
    s.setArticles([art('1', 'tekst o sječi')]);
    s.warm();
    expect(s.isBuilt()).toBe(true);
  });
});
