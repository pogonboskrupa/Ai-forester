import type { Article } from './types';

// URL Cloudflare Workera (vidi worker/). Postavlja se u .env: VITE_PROXY_URL
const PROXY_URL = import.meta.env.VITE_PROXY_URL as string | undefined;

const SYSTEM = `Ti si pravni asistent za šumarstvo u BiH, FBiH i Unsko-sanskom kantonu. Odgovaraj na bosanskom (latinica).
Pravila:
- Koristi ISKLJUČIVO dostavljene izvode. Ako ne sadrže odgovor, reci: "Nisam pronašao odgovor u dostupnim propisima."
- Uz svaku tvrdnju navedi izvor u formatu [Naziv akta, član N].
- Ako se norme sukobljavaju, navedi obje i napomeni da kantonalni propis važi u okviru nadležnosti kantona.
- Na kraju dodaj: "Informativno, nije pravni savjet."`;

export function buildPrompt(question: string, ctx: Article[]): string {
  const excerpts = ctx
    .map((a) => `### ${a.lawTitle} (${a.gazette}), član ${a.number}${a.heading ? ` – ${a.heading}` : ''}\n${a.text}`)
    .join('\n\n');
  return `IZVODI IZ PROPISA:\n${excerpts || '(nema rezultata)'}\n\nPITANJE: ${question}`;
}

export async function ask(question: string, ctx: Article[]): Promise<string> {
  if (!PROXY_URL) throw new Error('VITE_PROXY_URL nije postavljen.');
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: SYSTEM, prompt: buildPrompt(question, ctx) }),
  });
  if (!res.ok) throw new Error(`Proxy greška ${res.status}`);
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error('Prazan odgovor.');
  return data.text;
}
