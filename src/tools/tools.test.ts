import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Article } from '../types';
import { huber, parseNum, smalian, stackedToSolid, standingTree } from './volume';
import { parseOffences } from './penalties';
import { addDays, addYears, nextAnnual } from './deadlines';

describe('kubikator', () => {
  it('Huber: trupac 40 cm × 4 m ≈ 0,503 m³', () => {
    expect(huber(40, 4)).toBeCloseTo(0.5027, 3);
    expect(huber(0, 4)).toBe(0);
  });
  it('Smalian, prostorni metri, stablo', () => {
    expect(smalian(40, 40, 4)).toBeCloseTo(huber(40, 4), 6);
    expect(stackedToSolid(10, 0.7)).toBeCloseTo(7);
    expect(standingTree(40, 25, 0.5)).toBeCloseTo(1.5708, 3);
  });
  it('unos sa zarezom', () => {
    expect(parseNum('12,5')).toBe(12.5);
    expect(parseNum('abc')).toBe(0);
  });
});

describe('rokovi', () => {
  it('računa rokove od datuma', () => {
    expect(addDays(new Date(2026, 0, 30), 5).getDate()).toBe(4);
    expect(addYears(new Date(2026, 1, 28), 2).getFullYear()).toBe(2028);
    expect(nextAnnual(new Date(2026, 11, 2), 12, 1).getFullYear()).toBe(2027);
    expect(nextAnnual(new Date(2026, 10, 2), 12, 1).getFullYear()).toBe(2026);
  });
});

const A = 'public/data/articles.json';
describe.skipIf(!existsSync(A))('kaznene odredbe Zakona o šumama USK', () => {
  const arts = (JSON.parse(readFileSync(A, 'utf8')) as Article[]).filter((a) => a.lawId === 'usk-zakon-o-sumama');
  const off = parseOffences(arts);
  it('prepoznaje raspone i subjekte', () => {
    const fiz = off.filter((o) => o.articleNo === '81');
    expect(fiz.length).toBeGreaterThan(15);
    expect(fiz[0]!.min).toBe(200);
    expect(fiz[0]!.max).toBe(1500);
    expect(fiz[0]!.subject).toBe('fizičko lice');
    const p78 = off.find((o) => o.articleNo === '78')!;
    expect([p78.min, p78.max]).toEqual([8000, 10000]);
    expect(p78.responsible).toEqual({ min: 1500, max: 2000 });
    expect(off.some((o) => /otpremnog iskaza/.test(o.item))).toBe(true);
  });
});

import { CHECKLISTS } from './checklists';
import { ANNUAL, EVENTS, SEASONS } from './deadlines';
describe.skipIf(!existsSync(A))('izvori alata postoje u bazi', () => {
  const ids = new Set((JSON.parse(readFileSync(A, 'utf8')) as Article[]).map((a) => a.id));
  it('svaki citirani član postoji', () => {
    const cited = [...ANNUAL, ...SEASONS, ...EVENTS].map((x) => x.source).concat(CHECKLISTS.flatMap((c) => c.items.map((i) => i.source ?? '')).filter(Boolean));
    expect(cited.filter((id) => !ids.has(id))).toEqual([]);
  });
});

import { date, num } from '../format';
describe('format', () => {
  it('bosanski brojevi i datumi', () => {
    expect(num(1234.5, 2)).toBe('1.234,50');
    expect(num(10000)).toBe('10.000');
    expect(date(new Date(2026, 11, 1, 14, 5), true)).toBe('1. 12. 2026. u 14:05');
  });
});

describe('ispravke rubnih slučajeva', () => {
  it('addYears s 29.02. pada na 28.02.', () => {
    expect(addYears(new Date(2028, 1, 29), 2)).toEqual(new Date(2030, 1, 28));
  });
  it('parseNum prihvata tačku za hiljade', () => {
    expect(parseNum('1.234,5')).toBe(1234.5);
    expect(parseNum('12.5')).toBe(12.5);
    expect(parseNum(' 7 ')).toBe(7);
  });
  it('num ne ispisuje -0', () => {
    expect(num(-0.0004, 3)).toBe('0,000');
    expect(num(-1.5, 1)).toBe('-1,5');
  });
});
