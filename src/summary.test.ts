import { describe, expect, it } from 'vitest';
import { findSummaryLaw, linkRefs, refNumbers, summaryMarkdown } from './summary';
import type { LawInfo, LawSummary } from './types';

const S: LawSummary = { overview: 'Uređuje rad (čl. 1).', points: ['Probni rad najviše šest mjeseci (čl. 21).', 'Otkaz (čl. 96, 97 i 105).'], forestry: ['Sezonski rad (čl. 22–23).'], wood: [], caution: 'Neslužbeni tekst.' };
const law = (id: string, title: string, summary?: LawSummary): LawInfo =>
  ({ id, file: '', title, level: 'FBiH', gazette: 'Sl. novine 1/20', inForce: true, sourceUrl: '', articleCount: 1, summary }) as LawInfo;

describe('reference u rezimeu', () => {
  it('izvlači brojeve članova iz lista i raspona', () => {
    expect(refNumbers('Otkaz (čl. 96, 97 i 105).')).toEqual(['96', '97', '105']);
    expect(refNumbers('vidi čl. 5a i dio 2')).toEqual(['5a', 'dio 2']);
    expect(refNumbers('bez referenci')).toEqual([]);
    expect(refNumbers('mijenja čl. 26 osnovnog zakona i čl. 14 Zakona o šumama, te čl. 3')).toEqual(['3']);
  });
  it('linkRefs pravi klikabilne brojeve samo za postojeće članove', () => {
    const pieces = linkRefs('Otkaz (čl. 96, 97).', { id: 'z' }, (id) => id === 'z#96');
    expect(pieces).toContainEqual({ label: '96', id: 'z#96' });
    expect(pieces).toContain('97');
    expect(pieces.map((p) => (typeof p === 'string' ? p : p.label)).join('')).toBe('Otkaz (čl. 96, 97).');
  });
});

describe('rezime u chatu', () => {
  it('reference postaju numerisani citati, a sourceIds odgovaraju', () => {
    const l = law('zor', 'Zakon o radu FBiH', S);
    const { text, sourceIds } = summaryMarkdown(l, S, (id) => id !== 'zor#23');
    expect(sourceIds).toEqual(['zor#1', 'zor#21', 'zor#96', 'zor#97', 'zor#105', 'zor#22']);
    expect(text).toContain('Probni rad najviše šest mjeseci [2].');
    expect(text).toContain('**Za šumarstvo**');
    expect(text).not.toContain('Za promet i preradu drveta');
  });
  it('prepoznaje zahtjev za rezime i bira pravi propis', () => {
    const laws = [law('zor', 'Zakon o radu FBiH', S), law('zzn', 'Zakon o zaštiti na radu FBiH', S), law('zjp', 'Zakon o javnim preduzećima u FBiH', S)];
    expect(findSummaryLaw('daj mi rezime zakona o radu', laws)?.id).toBe('zor');
    expect(findSummaryLaw('ukratko zakon o zaštiti na radu', laws)?.id).toBe('zzn');
    expect(findSummaryLaw('sažetak zakona o javnim preduzećima', laws)?.id).toBe('zjp');
    expect(findSummaryLaw('koliko traje probni rad', laws)).toBeNull();
    expect(findSummaryLaw('rezime nepoznatog propisa', laws)).toBeNull();
  });
});

import { existsSync, readFileSync } from 'node:fs';
describe.skipIf(!existsSync('data/summaries.json'))('rezimei javnih propisa', () => {
  const reg = JSON.parse(readFileSync('data/registry.json', 'utf8')) as { id: string }[];
  const sums = JSON.parse(readFileSync('data/summaries.json', 'utf8')) as Record<string, LawSummary>;
  it('svaki propis iz registra ima rezime s najmanje 3 stavke', () => {
    for (const { id } of reg) {
      expect(sums[id], id).toBeDefined();
      expect(sums[id]!.points.length, id).toBeGreaterThanOrEqual(3);
      expect(sums[id]!.overview.length, id).toBeGreaterThan(20);
    }
  });
});
