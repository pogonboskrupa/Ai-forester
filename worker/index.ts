// Cloudflare Worker: čuva API ključ izvan browsera.
// Secrets: ANTHROPIC_API_KEY (ili GEMINI_API_KEY kao besplatna rezerva), ACCESS_CODE (opcionalno)
// Vars: ALLOWED_ORIGIN, CLAUDE_MODEL
interface Env {
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ACCESS_CODE?: string;
  ALLOWED_ORIGIN: string;
  CLAUDE_MODEL?: string;
}
interface ChatMsg { role: 'user' | 'assistant'; text: string }

const MAX_CHARS = 40_000;

async function claude(env: Env, system: string, messages: ChatMsg[]): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL ?? 'claude-sonnet-5-5',
      max_tokens: 1500,
      temperature: 0.2,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const j = (await r.json()) as { content?: { type: string; text?: string }[] };
  return j.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('') ?? '';
}

async function gemini(env: Env, system: string, messages: ChatMsg[]): Promise<string> {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || req.headers.get('Origin') !== env.ALLOWED_ORIGIN)
      return new Response('Forbidden', { status: 403, headers: cors });
    if (env.ACCESS_CODE && req.headers.get('X-Access-Code') !== env.ACCESS_CODE)
      return new Response('Unauthorized', { status: 401, headers: cors });

    let body: { system?: string; messages?: ChatMsg[] };
    try {
      body = await req.json();
    } catch {
      return new Response('Bad request', { status: 400, headers: cors });
    }
    const messages = body.messages;
    const size = JSON.stringify(body).length;
    if (!messages?.length || messages.at(-1)?.role !== 'user' || size > MAX_CHARS)
      return new Response('Bad request', { status: 400, headers: cors });

    try {
      const system = body.system ?? '';
      const text = env.ANTHROPIC_API_KEY ? await claude(env, system, messages) : await gemini(env, system, messages);
      return Response.json({ text }, { headers: cors });
    } catch {
      return new Response('Upstream error', { status: 502, headers: cors });
    }
  },
};
