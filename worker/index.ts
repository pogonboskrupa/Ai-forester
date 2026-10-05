// Cloudflare Worker (free tier): čuva API ključ izvan browsera, ograničava origin.
// Secrets: GEMINI_API_KEY (besplatni tier). Var: ALLOWED_ORIGIN (npr. https://pogonboskrupa.github.io)
interface Env { GEMINI_API_KEY: string; ALLOWED_ORIGIN: string }

const MODEL = 'gemini-2.0-flash';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || req.headers.get('Origin') !== env.ALLOWED_ORIGIN)
      return new Response('Forbidden', { status: 403, headers: cors });

    const { system, prompt } = (await req.json()) as { system?: string; prompt?: string };
    if (!prompt || prompt.length > 20_000) return new Response('Bad request', { status: 400, headers: cors });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system ?? '' }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (!r.ok) return new Response('Upstream error', { status: 502, headers: cors });
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return Response.json({ text }, { headers: cors });
  },
};
