import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSubtopicIndex } from './subtopics';
import type { Article, LawInfo } from './types';

const A = 'public/data/articles.json';
const L = 'public/data/laws.json';

describe.skipIf(!existsSync(A))('podkategorije šumarstva', () => {
  const idx = buildSubtopicIndex(JSON.parse(readFileSync(A, 'utf8')) as Article[], JSON.parse(readFileSync(L, 'utf8')) as LawInfo[]);
  const ids = (k: Parameters<typeof idx.get>[0]) => new Set(idx.get(k)!.map((a) => a.id));

  it('transport: pravilnik o otpremnom iskazu i čl. 26 Zakona o šumama', () => {
    const t = ids('transport');
    expect(t.has('usk-pravilnik-zigosanje-otpremni#10')).toBe(true);
    expect(t.has('usk-zakon-o-sumama#26')).toBe(true);
  });
  it('šumski red: pravilnik o šumskom redu', () => {
    expect(ids('sumski-red').has('usk-pravilnik-sumski-red#2')).toBe(true);
  });
  it('uzgoj i pošumljavanje: doznaka, pošumljavanje, krš', () => {
    const u = ids('uzgoj');
    expect(u.has('usk-pravilnik-doznaka#5')).toBe(true);
    expect(u.has('usk-zakon-o-sumama#21')).toBe(true);
    expect(u.has('usk-zakon-o-sumama#32')).toBe(true);
  });
  it('ostalo sadrži ono što nije razvrstano, a lovstvo nije u šumarstvu', () => {
    expect(ids('ostalo').has('usk-zakon-o-sumama#63')).toBe(true);
    const all = [...idx.values()].flat();
    expect(all.some((a) => a.lawId.startsWith('fbih-pravilnik-lov'))).toBe(false);
  });
});
