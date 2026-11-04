/** Lokalni AI model (Ollama, llama.cpp, LM Studio…): OpenAI-kompatibilan server na telefonu ili u mreži. */
import type { Turn } from './client';

/** Adresa kakvu korisnik upiše ("localhost:11434") u oblik koji očekuje OpenAI-kompatibilan API. */
export function normalizeLocalUrl(input: string): string {
  let u = input.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  u = u.replace(/\/+$/, '');
  return /\/v1$/i.test(u) ? u : `${u}/v1`;
}

export const LOCAL_PRESETS = [
  { name: 'Ollama', url: 'http://localhost:11434/v1' },
  { name: 'llama.cpp', url: 'http://localhost:8080/v1' },
  { name: 'LM Studio', url: 'http://localhost:1234/v1' },
] as const;

// Mali modeli imaju mali kontekst (Phi-4 mini na telefonu obično 2–8k tokena); bosanski ~2,8 znaka po tokenu.
const CHARS_PER_TOKEN = 2.8;
const RESERVED_TOKENS = 700; // odgovor + oznake poruka
const KEEP_TURNS = 2;

const OPEN = '<izvodi>\n';
const CLOSE = '\n</izvodi>';

/**
 * Prilagođava upit kontekstu malog modela: zadržava pitanje i najvažnije izvode (prvi su najrelevantniji),
 * izbacuje izvode s kraja dok ne stane, i pamti samo zadnje poruke razgovora.
 */
export function fitForLocal(system: string, messages: Turn[], contextTokens: number): { messages: Turn[] } {
  const budget = Math.max(1500, Math.floor((contextTokens - RESERVED_TOKENS) * CHARS_PER_TOKEN) - system.length);
  const last = messages[messages.length - 1];
  if (!last) return { messages };
  const history = messages.slice(0, -1).slice(-KEEP_TURNS);
  const used = history.reduce((n, m) => n + m.text.length, 0);
  const room = Math.max(1200, budget - used);

  const start = last.text.indexOf(OPEN);
  const end = last.text.indexOf(CLOSE);
  if (last.text.length <= room || start < 0 || end < start) return { messages: [...history, { ...last, text: last.text.slice(0, last.text.length <= room ? undefined : room) }] };

  const head = last.text.slice(0, start + OPEN.length);
  const tail = last.text.slice(end);
  const blocks = last.text.slice(start + OPEN.length, end).split(/\n\n(?=\[\d+\] )/);
  const size = (b: string[]) => head.length + tail.length + b.join('\n\n').length;
  while (blocks.length > 1 && size(blocks) > room) blocks.pop();
  if (size(blocks) > room) blocks[0] = `${blocks[0]!.slice(0, Math.max(200, room - head.length - tail.length - 1))}…`;
  return { messages: [...history, { ...last, text: `${head}${blocks.join('\n\n')}${tail}` }] };
}

const PROBES = ['http://localhost:11434', 'http://localhost:8080', 'http://localhost:1234', 'http://127.0.0.1:11434', 'http://127.0.0.1:8080'];

export async function listLocalModels(baseUrl: string, key = '', signal?: AbortSignal, f: typeof fetch = fetch): Promise<string[]> {
  const res = await f(`${baseUrl}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, signal });
  if (!res.ok) throw new Error(`Server je odgovorio ${res.status}`);
  const data = (await res.json()) as { data?: { id?: string }[]; models?: { name?: string; model?: string }[] };
  const ids = (data.data ?? []).map((m) => m.id).concat((data.models ?? []).map((m) => m.model ?? m.name));
  return ids.filter((x): x is string => !!x);
}

/** Traži lokalni server na uobičajenim portovima (Ollama 11434, llama.cpp 8080, LM Studio 1234). */
export async function detectLocal(f: typeof fetch = fetch): Promise<{ url: string; models: string[] } | null> {
  for (const base of PROBES) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    try {
      const url = normalizeLocalUrl(base);
      return { url, models: await listLocalModels(url, '', ctrl.signal, f) };
    } catch {
      /* sljedeći port */
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}
