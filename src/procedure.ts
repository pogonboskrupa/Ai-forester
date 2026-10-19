import { signal } from '@preact/signals';

/** Strukturirani pregled interne šumarske procedure ŠPD-a; sadržaj dolazi samo iz šifrovanog paketa. */
export interface ProcedureDoc {
  code: string;
  name: string;
  group: string;
  keeper: string;
  users: string;
  deadline?: string;
  rules: string[];
  section?: string; // naslov odjeljka u tekstu procedure
}
export interface ProcedureFlow {
  id: string;
  title: string;
  steps: { who: string; what: string }[];
}
export interface ProcedureRole {
  id: string;
  name: string;
  duties: string[];
}
export interface ProcedureDeadline {
  when: string;
  kind: 'periodično' | 'godišnje' | 'događaj';
  what: string;
  who: string;
}
export interface ProcedureForm {
  code: string;
  name: string;
  who: string;
  freq: string;
  to: string;
}
export interface ProcedureCodeTable {
  title: string;
  rows: { code: string; label: string; color?: string }[];
}
/** Detaljan opis ključnog radnog mjesta (iz opisa poslova, procedure i pravilnika). refs upućuju na odjeljke internih akata. */
export interface KeyRoleDuty {
  t: string;
  d: string;
  refs: { act: string; n: string }[];
}
export interface KeyRole {
  id: string;
  name: string;
  group: string;
  purpose: string;
  requirements: string[];
  duties: KeyRoleDuty[];
  documents: string[];
  deadlines: string[];
  responsibility: string[];
  collaborates: string[];
  caution?: string;
}

export interface Procedure {
  title: string;
  subtitle: string;
  revision: string;
  pages: number;
  purpose: string;
  scope: string;
  legalBasis: string[];
  legalNote?: string;
  rules: string[];
  documents: ProcedureDoc[];
  flows: ProcedureFlow[];
  roles: ProcedureRole[];
  deadlines: ProcedureDeadline[];
  forms: ProcedureForm[];
  codes: ProcedureCodeTable[];
  keyRoles?: KeyRole[]; // detaljan opis ključnih radnih mjesta
}

export const PROCEDURE_LAW_ID = 'spd-sumarska-procedura';
export const procedure = signal<Procedure | null>(null);

/** Dešifrovani podaci se ne validiraju shemom; nedostajuće liste ne smiju srušiti render. */
export function normalizeProcedure(p: Partial<Procedure> | undefined | null): Procedure | null {
  if (!p || typeof p !== 'object' || !p.title) return null;
  return {
    subtitle: '', revision: '', pages: 0, purpose: '', scope: '',
    ...p,
    title: p.title,
    legalBasis: p.legalBasis ?? [], rules: p.rules ?? [], documents: p.documents ?? [], flows: p.flows ?? [],
    roles: p.roles ?? [], deadlines: p.deadlines ?? [], forms: p.forms ?? [], codes: p.codes ?? [], keyRoles: p.keyRoles ?? [],
  };
}

/** Validan datum dd.mm. u datoj godini (29.02. u neprestupnoj godini nije validan). */
function dayOf(year: number, dd: number, mm: number): Date | null {
  const d = new Date(year, mm - 1, dd);
  return d.getMonth() === mm - 1 && d.getDate() === dd ? d : null;
}

/** Sljedeći godišnji rok oblika "dd.mm." od danas. */
export function nextDated(p: Procedure, today = new Date()): { date: Date; what: string; who: string } | null {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dated = p.deadlines
    .map((d) => {
      const m = d.kind === 'godišnje' ? /^(\d{1,2})\.(\d{1,2})\.$/.exec(d.when.trim()) : null;
      if (!m) return null;
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      // Do 8 godina naprijed pokriva i 29.02.; nevalidan datum (npr. 31.04.) se preskače.
      for (let y = t0.getFullYear(); y <= t0.getFullYear() + 8; y++) {
        const date = dayOf(y, dd, mm);
        if (date && date >= t0) return { date, what: d.what, who: d.who };
      }
      return null;
    })
    .filter((x): x is { date: Date; what: string; who: string } => !!x)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return dated[0] ?? null;
}
