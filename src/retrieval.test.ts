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

import { buildFaqIndex, extractiveAnswer, matchFaq } from './answer';
import type { FaqEntry } from './types';

const faqFile = 'public/data/faq.json';
describe.skipIf(!existsSync(faqFile))('provjereni odgovori', () => {
  const faq = JSON.parse(readFileSync(faqFile, 'utf8')) as FaqEntry[];
  const ms = buildFaqIndex(faq);
  const m = (q: string) => matchFaq(ms, faq, q)?.id ?? null;

  it('prepoznaje česta pitanja različito formulisana', () => {
    expect(m('Kako dobiti dozvolu za sječu u privatnoj šumi?')).toBe('doznaka-privatna');
    expect(m('Šta je otpremni iskaz?')).toBe('otpremni-iskaz-sta');
    expect(m('koja je kazna za bespravnu sječu')).toBe('kazne-fizicka-lica');
    expect(m('smijem li ložiti vatru blizu šume')).toBe('vatra-u-sumi');
    expect(m('ko plaća naknadu za općekorisne funkcije')).toBe('naknada-opcekorisne');
  });
  it('ne vraća gotov odgovor za nepovezana pitanja', () => {
    expect(m('Koliko košta lovačka karta za divlju svinju?')).toBeNull();
    expect(m('Kako se registruje rasadnik sadnica?')).toBeNull();
  });
});

describe.skipIf(!existsSync(file))('odgovor bez AI-ja', () => {
  const arts = JSON.parse(readFileSync(file, 'utf8')) as Article[];
  const idx = buildIndex(arts);
  it('izdvaja rečenice s citatima', () => {
    const ans = extractiveAnswer('rok važenja otpremnog iskaza', retrieve(idx, 'rok važenja otpremnog iskaza', 5));
    expect(ans).toContain('[1]');
    expect(ans).toMatch(/48 sati/);
  });
});
