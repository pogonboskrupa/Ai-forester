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
}

export const PROCEDURE_LAW_ID = 'spd-sumarska-procedura';
export const procedure = signal<Procedure | null>(null);
