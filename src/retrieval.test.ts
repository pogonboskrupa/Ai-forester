import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIndex, retrieve } from './search';
import type { Article } from './types';

const file = 'public/data/articles.json';

// Pokreće se samo kad je baza generirana (npm run ingest).
describe.skipIf(!existsSync(file))('retrieval nad stvarnom bazom', () => {
  const idx = buildIndex(JSON.parse(readFileSync(file, 'utf8')) as Article[]);
  const top = (q: string, ids?: string[]) => retrieve(idx, q, 5, ids).map((a) => `${a.lawId}#${a.number}`);

  it('doznaka stabala vraća pravilnik o doznaci', () => {
    expect(top('Ko vrši doznaku stabala za sječu?').some((r) => r.startsWith('usk-pravilnik-doznaka'))).toBe(true);
  });
  it('filter po izvorima poštuje projekat', () => {
    expect(top('doznaka sječa', ['usk-pravilnik-cuvari']).every((r) => r.startsWith('usk-pravilnik-cuvari'))).toBe(true);
  });
  it('otpremni iskaz', () => {
    expect(top('otpremni iskaz za drvo').some((r) => r.startsWith('usk-pravilnik-zigosanje'))).toBe(true);
  });
});

describe.skipIf(!existsSync(file))('sinonimi', () => {
  const idx = buildIndex(JSON.parse(readFileSync(file, 'utf8')) as Article[]);
  it('prijevoz šumskih sortimenata nalazi pravilnik o otpremnom iskazu', () => {
    const top = retrieve(idx, 'Šta propisuje zakon o prijevozu šumskih sortimenata?', 6).map((a) => a.lawId);
    expect(top).toContain('usk-pravilnik-zigosanje-otpremni');
  });
});
