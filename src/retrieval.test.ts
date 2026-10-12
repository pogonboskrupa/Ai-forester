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
  it('prepoznaje nove teme (čekići, požar, Uprava, krš, čuvari, zdravlje bilja)', () => {
    expect(m('Šta mora sadržavati registar šumskih čekića?')).toBe('registar-sumskih-cekica');
    expect(m('izgubljen šumski čekić šta raditi')).toBe('registar-sumskih-cekica');
    expect(m('područja velike opasnosti od požara')).toBe('pozar-klasifikacija');
    expect(m('ko izrađuje plan zaštite šuma od požara')).toBe('pozar-planovi');
    expect(m('koje poslove obavlja uprava za šumarstvo')).toBe('poslovi-uprave');
    expect(m('rok za dostavu katastra šuma')).toBe('katastar-suma');
    expect(m('šume na kršu sufinansiranje')).toBe('krs-rezim');
    expect(m('šta sadrži elaborat za šumsko privredno područje')).toBe('elaborat-spp');
    expect(m('kako čuvar šuma pravi zapisnik o protivpravnoj radnji')).toBe('cuvar-zapisnik');
    expect(m('ko izdaje biljni pasoš')).toBe('bilje-pasos');
    expect(m('fitosanitarni certifikat za izvoz drveta')).toBe('bilje-fitosanitarni-certifikat');
  });
  it('prepoznaje pitanja o dužnostima po ulogama', () => {
    expect(m('Koje su dužnosti lugara?')).toBe('duznosti-lugar');
    expect(m('dužnosti čuvara šuma')).toBe('duznosti-lugar');
    expect(m('šta radi šumarija')).toBe('duznosti-sumarija');
    expect(m('dužnosti upravnika šumarije')).toBe('duznosti-upravnik-sumarije');
    expect(m('obaveze kantonalne uprave za šumarstvo')).toBe('duznosti-kantonalna-uprava');
    expect(m('obaveze vlasnika privatne šume')).toBe('duznosti-privatni-vlasnik');
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

import { isModelGone, pickBestGemini, pickBestOpenAI, suggestedModel } from './ai/models';
describe('izbor modela', () => {
  it('čita Googleov prijedlog iz greške', () => {
    expect(suggestedModel('This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite for the latest features')).toBe('gemini-3.5-flash-lite');
    expect(isModelGone(404, '')).toBe(true);
    expect(isModelGone(429, 'quota exceeded')).toBe(false);
  });
  it('bira najnoviji stabilni flash/mini model', () => {
    expect(pickBestGemini(['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-4.0-flash-preview'])).toBe('gemini-3.5-flash');
    expect(pickBestOpenAI(['gpt-4.1-mini', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano'])).toBe('gpt-5-mini');
  });
});
