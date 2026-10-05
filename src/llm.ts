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

const GEMINI_KEY = 'geminiKey';
const GEMINI_MODEL = 'geminiModel';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const read = (k: string): string => {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v.trim());
  } catch {
    /* privatni mod */
  }
};
export const getGeminiKey = () => read(GEMINI_KEY);
export const setGeminiKey = (v: string) => write(GEMINI_KEY, v);
export const getGeminiModel = () => read(GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
export const setGeminiModel = (v: string) => write(GEMINI_MODEL, v);

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

interface Turn { role: 'user' | 'assistant'; text: string }

/** Direktno Gemini (free tier): ključ je samo u browseru korisnika, nikad u repozitoriju. */
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Direktno Gemini (free tier): ključ je samo u browseru korisnika, nikad u repozitoriju.
 *  Preopterećenje (503/429) je često prolazno, pa pokušavamo ponovo s pauzom. */
async function askGeminiDirect(key: string, system: string, messages: Turn[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.2 },
  });
  const delays = [2000, 5000, 10000];
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body });
    if (res.ok) {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text) throw new Error('Prazan odgovor (moguće blokiran sadržaj).');
      return text;
    }
    const wait = delays[attempt];
    if (RETRY_STATUS.has(res.status) && wait !== undefined) {
      await sleep(wait);
      continue;
    }
    const detail = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
    const hint = RETRY_STATUS.has(res.status) ? ' Pokušajte ponovo za minut ili u Postavkama izaberite drugi model.' : '';
    throw new Error(`Gemini greška ${res.status}${detail ? `: ${detail}` : ''}${hint}`);
  }
}

async function askProxy(url: string, system: string, messages: Turn[]): Promise<string> {
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

/** Proxy ima prednost; bez njega koristi se direktni Gemini ključ iz Postavki. */
export async function complete(system: string, messages: Turn[]): Promise<string> {
  const proxy = getProxyUrl();
  if (proxy) return askProxy(proxy, system, messages);
  const key = getGeminiKey();
  if (key) return askGeminiDirect(key, system, messages);
  throw new Error('Nije postavljen AI pristup: u Postavkama unesite Gemini API ključ ili adresu proxyja.');
}

export async function ask({ question, ctx, history, project }: AskInput): Promise<string> {
  const system = project?.instructions.trim()
    ? `${SYSTEM}\n\nDodatne upute projekta "${project.name}":\n${project.instructions.trim()}`
    : SYSTEM;
  const messages: Turn[] = [
    ...history.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, text: m.text })),
    { role: 'user', text: buildPrompt(question, ctx) },
  ];
  return complete(system, messages);
}
