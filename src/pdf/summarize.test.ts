import { describe, expect, it } from 'vitest';
import type { Article } from '../types';
import { summarizeLocal } from './summarize';

const art = (number: string, heading: string, text: string): Article => ({
  id: `t#${number}`, lawId: 't', lawTitle: 'Pravilnik o doznaci', level: 'USK', gazette: 'g', number, heading, text,
} as Article);

const sample = [
  art('1', 'Predmet', 'Ovim pravilnikom uređuje se doznaka stabala za sječu u šumama.'),
  art('2', 'Doznaka', 'Doznaka se vrši prije sječe. Doznaku vrši ovlašteno lice.'),
  art('3', 'Rokovi', 'Korisnik je dužan prijaviti sječu najkasnije 15 dana prije početka radova.'),
  art('4', 'Kazne', 'Novčanom kaznom od 1.000 KM do 5.000 KM kaznit će se korisnik koji vrši sječu bez doznake.'),
  art('5', 'Završna odredba', 'Ovaj pravilnik stupa na snagu osmog dana od dana objave.'),
];

describe('summarizeLocal', () => {
  it('prvi stav je pregled s brojem članova i naslovima', () => {
    const s = summarizeLocal(sample);
    expect(s.overview).toContain('5 članova');
    expect(s.overview).toContain('Predmet');
  });
  it('izdvaja rokove, iznose i obaveze uz navedeni član', () => {
    const s = summarizeLocal(sample);
    const all = s.points.join('\n');
    expect(all).toMatch(/15 dana.*\(čl\. 3\)/);
    expect(all).toMatch(/1\.000 KM.*\(čl\. 4\)/);
  });
  it('ne izmišlja: svaka tačka ima referencu na postojeći član, a upozorenje kaže da je automatski', () => {
    const s = summarizeLocal(sample);
    const nums = new Set(sample.map((a) => a.number));
    for (const p of s.points) {
      const m = /\(čl\. (\d+)\)$/.exec(p);
      expect(m && nums.has(m[1]!)).toBe(true);
    }
    expect(s.caution).toMatch(/automatski/i);
  });
  it('ograničava dužinu tačaka i njihov broj', () => {
    const long = Array.from({ length: 40 }, (_, i) => art(String(i + 1), '', `Korisnik je dužan ${'platiti '.repeat(60)} u roku od ${i + 1} dana.`));
    const s = summarizeLocal(long);
    expect(s.points.length).toBeLessThanOrEqual(10);
    expect(Math.max(...s.points.map((p) => p.length))).toBeLessThan(330);
  });
  it('prazan skup članova daje prazan rezime bez greške', () => {
    expect(summarizeLocal([]).points).toEqual([]);
  });
});
