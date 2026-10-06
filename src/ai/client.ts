import { configuredProviders, hasKey, modelOf, PROVIDER_NAMES, settings, type Provider, type Settings } from '../settings';
import { readSse } from './sse';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

export interface StreamRequest {
  system: string;
  messages: Turn[];
  onText: (delta: string) => void;
  signal: AbortSignal;
}

export class AiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS = [2000, 5000, 10000];

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/** Gemini direktno iz browsera, uz streaming. Preopterećenje (503/429) je obično prolazno. */
async function streamGemini(s: Settings, req: StreamRequest): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}:streamGenerateContent?alt=sse`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.2 },
  });

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey },
      body,
      signal: req.signal,
    });
    if (res.ok) {
      let got = false;
      for await (const data of readSse(res, req.signal)) {
        const chunk = JSON.parse(data) as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
          promptFeedback?: { blockReason?: string };
        };
        if (chunk.promptFeedback?.blockReason) throw new AiError(`Gemini je blokirao upit (${chunk.promptFeedback.blockReason}).`);
        const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        if (text) {
          got = true;
          req.onText(text);
        }
      }
      if (!got) throw new AiError('Prazan odgovor modela.');
      return;
    }
    const delay = RETRY_DELAYS[attempt];
    if (RETRY_STATUS.has(res.status) && delay !== undefined) {
      await sleep(delay, req.signal);
      continue;
    }
    const detail = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
    throw new AiError(
      `Gemini ${res.status}${detail ? `: ${detail}` : ''}`,
      RETRY_STATUS.has(res.status),
    );
  }
}

/** Claude preko službenog SDK-a; učitava se tek kad je odabran (manji početni bundle). */
async function streamClaude(s: Settings, req: StreamRequest): Promise<void> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // Ključ je korisnikov i ostaje u njegovom browseru; zato je browser upotreba ovdje namjerna.
  const client = new Anthropic({ apiKey: s.claudeKey, dangerouslyAllowBrowser: true, maxRetries: 3 });
  try {
    const stream = client.beta.messages.stream(
      {
        model: s.claudeModel,
        max_tokens: 16000,
        system: req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.text })),
        // Ako sigurnosni klasifikator odbije upit, API ga sam ponovi na preporučenom modelu.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal: req.signal },
    );
    stream.on('text', (t) => req.onText(t));
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new AiError('Model je odbio odgovoriti na ovaj upit.');
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('Claude API ključ nije ispravan.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new AiError('Ključ nema pristup ovom modelu.');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('Previše zahtjeva prema Claude API-ju. Pokušajte za minut.', true);
    if (e instanceof Anthropic.APIError) throw new AiError(`Claude ${e.status ?? ''}: ${e.message}`, (e.status ?? 0) >= 500);
    throw e;
  }
}

/** OpenAI Chat Completions uz streaming (direktno iz browsera, korisnikov ključ). */
async function streamOpenAI(s: Settings, req: StreamRequest): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.openaiKey}` },
      body: JSON.stringify({
        model: s.openaiModel,
        stream: true,
        messages: [{ role: 'system', content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.text }))],
      }),
      signal: req.signal,
    });
    if (res.ok) {
      let got = false;
      for await (const data of readSse(res, req.signal)) {
        if (data === '[DONE]') break;
        const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string; refusal?: string } }[] };
        const delta = chunk.choices?.[0]?.delta;
        const text = delta?.content ?? '';
        if (text) {
          got = true;
          req.onText(text);
        }
        if (delta?.refusal) throw new AiError('Model je odbio odgovoriti na ovaj upit.');
      }
      if (!got) throw new AiError('Prazan odgovor modela.');
      return;
    }
    const delay = RETRY_DELAYS[attempt];
    if ((res.status === 429 || res.status >= 500) && delay !== undefined && attempt < 2) {
      await sleep(delay, req.signal);
      continue;
    }
    const detail = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
    if (res.status === 401) throw new AiError('OpenAI API ključ nije ispravan.');
    throw new AiError(`ChatGPT ${res.status}${detail ? `: ${detail}` : ''}`, res.status === 429 || res.status >= 500);
  }
}

/** Proxy (Cloudflare Worker) ne streamuje: cijeli odgovor stiže odjednom. */
async function streamProxy(s: Settings, req: StreamRequest): Promise<void> {
  const res = await fetch(s.proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Code': s.accessCode },
    body: JSON.stringify({ system: req.system, messages: req.messages }),
    signal: req.signal,
  });
  if (res.status === 401) throw new AiError('Pogrešan pristupni kod proxyja.');
  if (!res.ok) throw new AiError(`Proxy greška ${res.status}`, res.status >= 500);
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new AiError('Prazan odgovor.');
  req.onText(data.text);
}

function streamWith(p: Provider, s: Settings, req: StreamRequest): Promise<void> {
  if (p === 'claude') return streamClaude(s, req);
  if (p === 'openai') return streamOpenAI(s, req);
  if (p === 'proxy') return streamProxy(s, req);
  return streamGemini(s, req);
}

/**
 * Pokušava odabrani AI, a ako ne odgovori prije prvog teksta (kvota, preopterećenje, mreža)
 * i uključen je fallback, prelazi na sljedeći s unesenim ključem. Vraća oznaku AI-ja koji je odgovorio.
 */
export async function streamCompletion(req: StreamRequest, s: Settings = settings.value): Promise<string> {
  const others = configuredProviders(s).filter((p) => p !== s.provider);
  const order = hasKey(s.provider, s) ? [s.provider, ...(s.fallback ? others : [])] : others.slice(0, s.fallback ? undefined : 1);
  if (!order.length) throw new AiError('Nije povezan nijedan AI. Unesite API ključ u Postavkama ili uključite režim bez AI-ja.');

  const failures: string[] = [];
  for (const p of order) {
    let started = false;
    try {
      await streamWith(p, s, { ...req, onText: (d) => { started = true; req.onText(d); } });
      return `${PROVIDER_NAMES[p]} · ${modelOf(p, s)}`;
    } catch (e) {
      if (isAbort(e) || started) throw e;
      failures.push(`${PROVIDER_NAMES[p]}: ${e instanceof Error ? e.message : 'greška'}`);
    }
  }
  throw new AiError(failures.join('\n'));
}

export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError' || (e as { name?: string })?.name === 'APIUserAbortError';
