import { describe, expect, it } from 'vitest';
import { bsDate, daysToDue, filterEntries, isOverdue, nextNumber, TEMPLATES, type DocEntry } from './office';

const e = (o: Partial<DocEntry>): DocEntry => ({ id: o.no ?? 'x', no: '1/2026', date: '2026-03-05', dir: 'ulazni', party: 'Općina', subject: 'Zahtjev za saglasnost', cls: '', due: '', assignee: '', status: 'u radu', note: '', ...o });

describe('djelovodnik', () => {
  it('redni broj ide po godini i ne miješa godine', () => {
    expect(nextNumber([], 2026)).toBe('1/2026');
    expect(nextNumber([e({ no: '7/2026' }), e({ no: '12/2026' }), e({ no: '40/2025' })], 2026)).toBe('13/2026');
    expect(nextNumber([e({ no: '40/2025' })], 2026)).toBe('1/2026');
    expect(nextNumber([e({ no: 'abc' })], 2026)).toBe('1/2026');
  });
  it('rok: kasni samo akt u radu', () => {
    expect(isOverdue(e({ due: '2026-03-01' }), '2026-03-05')).toBe(true);
    expect(isOverdue(e({ due: '2026-03-01', status: 'riješeno' }), '2026-03-05')).toBe(false);
    expect(isOverdue(e({ due: '2026-03-05' }), '2026-03-05')).toBe(false);
    expect(isOverdue(e({ due: '' }), '2026-03-05')).toBe(false);
  });
  it('dani do roka prelaze granicu mjeseca i godine', () => {
    expect(daysToDue('2026-03-10', '2026-03-05')).toBe(5);
    expect(daysToDue('2027-01-02', '2026-12-31')).toBe(2);
    expect(daysToDue('2026-03-01', '2026-03-05')).toBe(-4);
    expect(daysToDue('', '2026-03-05')).toBeNull();
  });
  it('pretraga ignoriše dijakritike i filtrira po statusu i vrsti', () => {
    const l = [e({ no: '1/2026', subject: 'Zahtjev za saglasnost šumarije' }), e({ no: '2/2026', dir: 'izlazni', status: 'riješeno', subject: 'Odgovor' })];
    expect(filterEntries(l, 'sumarije', 'sve', 'sve').map((x) => x.no)).toEqual(['1/2026']);
    expect(filterEntries(l, '', 'riješeno', 'sve').map((x) => x.no)).toEqual(['2/2026']);
    expect(filterEntries(l, '', 'sve', 'izlazni')).toHaveLength(1);
  });
  it('datum i predlošci', () => {
    expect(bsDate('2026-03-05')).toBe('5. 3. 2026.');
    expect(bsDate('')).toBe('');
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });
});
