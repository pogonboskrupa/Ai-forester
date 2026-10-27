import { describe, expect, it } from 'vitest';
import { leadershipRoles, nextDated, normalizeProcedure, type KeyRole, type Procedure } from './procedure';
import { fold, reflow } from './text';

const base = normalizeProcedure({ title: 'T' }) as Procedure;
const withDeadlines = (deadlines: Procedure['deadlines']): Procedure => ({ ...base, deadlines });
const annual = (when: string) => ({ when, kind: 'godišnje' as const, what: when, who: '' });

describe('nextDated', () => {
  it('prelazi u sljedeću godinu nakon roka', () => {
    const r = nextDated(withDeadlines([annual('15.01.'), annual('31.12.')]), new Date(2026, 11, 31, 18));
    expect(r?.what).toBe('31.12.');
    const r2 = nextDated(withDeadlines([annual('15.01.')]), new Date(2026, 11, 31));
    expect(r2?.date).toEqual(new Date(2027, 0, 15));
  });
  it('29.02. preskače neprestupne godine, a nevalidan datum ignoriše', () => {
    expect(nextDated(withDeadlines([annual('29.02.')]), new Date(2026, 2, 1))?.date).toEqual(new Date(2028, 1, 29));
    expect(nextDated(withDeadlines([annual('31.04.')]), new Date(2026, 0, 1))).toBeNull();
  });
  it('uzima samo godišnje rokove', () => {
    expect(nextDated(withDeadlines([{ when: '01.05.', kind: 'događaj', what: 'x', who: '' }]), new Date(2026, 0, 1))).toBeNull();
  });
});

describe('normalizeProcedure', () => {
  it('dopunjava nedostajuće liste', () => {
    expect(normalizeProcedure({ title: 'T' })?.codes).toEqual([]);
    expect(normalizeProcedure(undefined)).toBeNull();
  });
});

describe('reflow', () => {
  it('spaja prelome unutar rečenice, čuva kraj rečenice i nabrajanja', () => {
    expect(reflow('način korištenja,\npopunjavanja dokumenata.\nNovi pasus')).toBe('način korištenja, popunjavanja dokumenata.\nNovi pasus');
    expect(reflow('Obaveze su\n- prva stavka\n- druga')).toBe('Obaveze su\n- prva stavka\n- druga');
    expect(reflow('šumsko-\nuzgojnih radova')).toBe('šumsko-uzgojnih radova');
  });
});

describe('fold', () => {
  it('normalizuje NFD dijakritike', () => {
    expect(fold('Šuma'.normalize('NFD'))).toBe('suma');
  });
});

describe('leadershipRoles', () => {
  const role = (id: string, tier?: 'rukovodstvo'): KeyRole => ({
    id, name: id, group: 'g', purpose: '', requirements: [], duties: [], documents: [], deadlines: [], responsibility: [], collaborates: [], tier,
  });
  it('vraća samo rukovodstvo, redoslijedom iz podataka', () => {
    const p = { ...base, keyRoles: [role('a'), role('izvrsni', 'rukovodstvo'), role('b'), role('upravnik', 'rukovodstvo')] };
    expect(leadershipRoles(p).map((r) => r.id)).toEqual(['izvrsni', 'upravnik']);
  });
  it('bez rukovodstva vraća prazan niz', () => {
    expect(leadershipRoles({ ...base, keyRoles: [role('a')] })).toEqual([]);
    expect(leadershipRoles({ ...base, keyRoles: undefined })).toEqual([]);
  });
});
