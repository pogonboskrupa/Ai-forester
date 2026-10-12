/** Otkrivanje modela dostupnih za korisnikov ključ (provajderi gase stare modele bez najave). */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiModel { name: string; supportedGenerationMethods?: string[] }

export async function listGeminiModels(key: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key }, signal });
  if (!res.ok) throw new Error(`Gemini ${res.status}: spisak modela nije dostupan`);
  const data = (await res.json()) as { models?: GeminiModel[] };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-/.test(n) && !/(embed|tts|image|audio|live|vision|thinking-exp|robotics|computer)/i.test(n));
}

export async function listOpenAIModels(key: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` }, signal });
  if (!res.ok) throw new Error(`ChatGPT ${res.status}: spisak modela nije dostupan`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? [])
    .map((m) => m.id)
    .filter((id) => /^(gpt-|o\d)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|instruct|embedding|codex|\d{4}-\d{2}-\d{2})/.test(id));
}

/** Verzija iz naziva ("gemini-3.5-flash" -> 3.5, "gpt-5.1-mini" -> 5.1); preview/exp modeli imaju manju prednost. */
function version(name: string): number {
  const m = /-(\d+(?:\.\d+)?)/.exec(name);
  return m ? Number(m[1]) : 0;
}
const isUnstable = (n: string) => /(preview|exp|latest|-\d{3,}$)/.test(n);

/** Najnoviji stabilni model; "flash" (Gemini) i "mini" (OpenAI) su najbolji omjer brzine, cijene i kvaliteta. */
export function pickBest(models: string[], prefer: RegExp, avoid: RegExp): string | undefined {
  const score = (n: string) => version(n) * 10 + (prefer.test(n) ? 3 : 0) - (avoid.test(n) ? 2 : 0) - (isUnstable(n) ? 15 : 0);
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

export const pickBestGemini = (models: string[]) => pickBest(models, /flash/, /lite|pro/);
export const pickBestOpenAI = (models: string[]) => pickBest(models, /mini/, /nano|pro|^o\d/);

/** Google u grešci često navede zamjenu: "...use models/gemini-3.5-flash-lite for...". */
export function suggestedModel(message: string): string | undefined {
  return /use (?:models\/)?(gemini-[\w.-]+)/i.exec(message)?.[1];
}

/** Greška znači "ovaj model ne postoji/ugašen", a ne problem s ključem ili kvotom. */
export const isModelGone = (status: number, message: string): boolean =>
  status === 404 || /(no longer available|not found|does not exist|model_not_found|deprecated)/i.test(message);
