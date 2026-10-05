import type { Article, Msg, Project } from './types';

const SYSTEM = `Ti si pravni asistent za šumarstvo u BiH, FBiH i Unsko-sanskom kantonu. Odgovaraj na bosanskom (latinica).
Pravila:
- Koristi ISKLJUČIVO dostavljene izvode. Ako ne sadrže odgovor, reci: "Nisam pronašao odgovor u dostupnim propisima."
- Uz svaku tvrdnju navedi izvor u formatu [Naziv akta, član N].
- Ako se norme sukobljavaju, navedi obje i napomeni da kantonalni propis važi u okviru nadležnosti kantona.
- Na kraju dodaj: "Informativno, nije pravni savjet."`;

const KEY = 'proxyUrl';
export const getProxyUrl = (): string => {
  try {
    return localStorage.getItem(KEY) || (import.meta.env.VITE_PROXY_URL as string | undefined) || '';
  } catch {
    return (import.meta.env.VITE_PROXY_URL as string | undefined) || '';
  }
};
export const setProxyUrl = (v: string): void => {
  try {
    localStorage.setItem(KEY, v.trim());
  } catch {
    /* privatni mod: ostaje default */
  }
};

const CODE_KEY = 'accessCode';
export const getAccessCode = (): string => {
  try { return localStorage.getItem(CODE_KEY) ?? ''; } catch { return ''; }
};
export const setAccessCode = (v: string): void => {
  try { localStorage.setItem(CODE_KEY, v.trim()); } catch { /* privatni mod */ }
};

export function buildPrompt(question: string, ctx: Article[]): string {
  const excerpts = ctx
    .map((a) => `### ${a.lawTitle} (${a.gazette}), član ${a.number}${a.heading ? ` – ${a.heading}` : ''}\n${a.text}`)
    .join('\n\n');
  return `IZVODI IZ PROPISA:\n${excerpts || '(nema rezultata)'}\n\nPITANJE: ${question}`;
}

export interface AskInput {
  question: string;
  ctx: Article[];
  history: Msg[]; // prethodne poruke (bez tekuće)
  project: Project | null;
}

export async function ask({ question, ctx, history, project }: AskInput): Promise<string> {
  const url = getProxyUrl();
  if (!url) throw new Error('Proxy adresa nije postavljena (Postavke).');
  const system = project?.instructions.trim()
    ? `${SYSTEM}\n\nDodatne upute projekta "${project.name}":\n${project.instructions.trim()}`
    : SYSTEM;
  const messages = [
    ...history.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, text: m.text })),
    { role: 'user' as const, text: buildPrompt(question, ctx) },
  ];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Code': getAccessCode() },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok) throw new Error(`Proxy greška ${res.status}`);
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error('Prazan odgovor.');
  return data.text;
}
