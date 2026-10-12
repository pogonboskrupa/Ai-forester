import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSubtopicIndex } from './subtopics';
import type { Article, LawInfo } from './types';

const A = 'public/data/articles.json';
const L = 'public/data/laws.json';

describe.skipIf(!existsSync(A))('podkategorije šumarstva', () => {
  const idx = buildSubtopicIndex(JSON.parse(readFileSync(A, 'utf8')) as Article[], JSON.parse(readFileSync(L, 'utf8')) as LawInfo[]);
  const ids = (k: Parameters<typeof idx.get>[0]) => new Set(idx.get(k)!.map((a) => a.id));

  it('promet: pravilnik o otpremnom iskazu i čl. 26 Zakona o šumama', () => {
    const t = ids('promet');
    expect(t.has('usk-pravilnik-zigosanje-otpremni#10')).toBe(true);
    expect(t.has('usk-zakon-o-sumama#26')).toBe(true);
  });
  it('zaštita: šumski red, požari, preventivne mjere', () => {
    const z = ids('zastita');
    expect(z.has('usk-pravilnik-sumski-red#2')).toBe(true);
    expect(z.has('usk-zakon-o-sumama#33')).toBe(true);
    expect(z.has('usk-zakon-o-sumama#23')).toBe(true);
  });
  it('doznaka i sječa odvojeno od uzgoja; krš u uzgoju', () => {
    expect(ids('sjeca').has('usk-pravilnik-doznaka#5')).toBe(true);
    expect(ids('sjeca').has('usk-zakon-o-sumama#14')).toBe(true);
    const u = ids('uzgoj');
    expect(u.has('usk-zakon-o-sumama#21')).toBe(true);
    expect(u.has('usk-zakon-o-sumama#32')).toBe(true);
  });
  it('kaznene odredbe samo u nadzoru, definicije i prijelazne odredbe u ostalom', () => {
    expect(ids('nadzor').has('usk-zakon-o-sumama#63')).toBe(true);
    expect(ids('nadzor').has('usk-zakon-o-sumama#78')).toBe(true);
    expect(ids('promet').has('usk-zakon-o-sumama#78')).toBe(false);
    expect(ids('ostalo').has('usk-zakon-o-sumama#4')).toBe(true);
    expect(ids('ostalo').has('usk-zakon-o-sumama#87')).toBe(true);
  });
  it('lovstvo nije u šumarstvu', () => {
    const all = [...idx.values()].flat();
    expect(all.some((a) => a.lawId.startsWith('fbih-pravilnik-lov'))).toBe(false);
  });
});
