import { describe, expect, it } from 'vitest';
import type { ActDraft } from './acts';
import { buildUserLaw } from './import';

const act = { key: 'k', title: 'Pravilnik o doznaci', number: 1, articleCount: 2, text: 'Član 1.\nKorisnik je dužan prijaviti sječu najkasnije 15 dana prije početka radova.\nČlan 2.\nOvaj pravilnik stupa na snagu danom objave.' } as unknown as ActDraft;
const choice = { title: 'Pravilnik o doznaci', level: 'USK' as const, gazette: 'Sl. glasnik USK 1/26', topic: 'Šumarstvo', amends: '' };

describe('buildUserLaw', () => {
  it('uz propis dodaje automatski rezime s referencom na član', () => {
    const u = buildUserLaw(act, choice, 'glasnik.pdf', 'fk1');
    expect(u.law.summary?.points.join(' ')).toMatch(/15 dana.*\(čl\. 1\)/);
  });
  it('pamti ključ izvornog fajla', () => {
    expect(buildUserLaw(act, choice, 'glasnik.pdf', 'fk1').law.fileKey).toBe('fk1');
    expect(buildUserLaw(act, choice, 'glasnik.pdf').law.fileKey).toBeUndefined();
  });
});
