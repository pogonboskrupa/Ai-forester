import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ORG, orgAnchorIds, orgAnchors, orgContext } from './org';
import { systemPrompt } from './ai/prompt';
import type { Article } from './types';

describe('profil preduzeća', () => {
  it('prompt sadrži naziv preduzeća, broj uposlenih i vrstu', () => {
    const p = systemPrompt(null);
    expect(p).toContain('Unsko-sanske šume');
    expect(p).toContain('650');
    expect(p).toContain('javno preduzeće');
    expect(orgContext()).toContain(ORG.name);
  });
  it('"naša" pitanja povlače ključne opće propise', () => {
    expect(orgAnchors('Koje obaveze imamo kao poslodavac prema radnicima?')).toContain('fbih-zakon-o-radu#118');
    expect(orgAnchors('Ko imenuje direktora našeg preduzeća?')).toContain('fbih-zakon-o-javnim-preduzecima#12');
    expect(orgAnchors('Kako mi provodimo nabavke?')).toContain('bih-zakon-o-javnim-nabavkama#4');
    expect(orgAnchors('naše obaveze iz zaštite na radu')).toContain('fbih-zakon-o-zastiti-na-radu#33');
  });
  it('šumarska pitanja ne povlače opće propise', () => {
    expect(orgAnchors('Koje obaveze ima Uprava za šumarstvo?')).toEqual([]);
    expect(orgAnchors('lugar pravi zapisnik o protivpravnoj radnji')).toEqual([]);
    expect(orgAnchors('kako dobiti doznaku u privatnoj šumi')).toEqual([]);
  });
});

const file = 'public/data/articles.json';
describe.skipIf(!existsSync(file))('sidra postoje u bazi', () => {
  const ids = new Set((JSON.parse(readFileSync(file, 'utf8')) as Article[]).map((a) => a.id));
  it('svaki član iz ANCHORS postoji', () => {
    for (const id of orgAnchorIds()) expect(ids.has(id), id).toBe(true);
  });
});
