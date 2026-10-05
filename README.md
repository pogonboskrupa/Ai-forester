# AI Šumar – asistent za šumarske propise BiH / FBiH / USK

Statički PWA (GitHub Pages). Pretraga propisa je u browseru (MiniSearch nad članovima), LLM ide preko Cloudflare Workera da API ključ ne bude javan.

## Tok
1. Tekst propisa → `data/raw/*.txt` + unos u `data/registry.json`
2. `npm run ingest` → `public/data/articles.json` (dijeljenje po članovima)
3. Pitanje → retrieval top‑k članova (USK > FBiH > BiH) → LLM odgovara samo iz izvoda i citira član

## Pokretanje
```
npm install
npm run dev
npm test
```

## Proxy (besplatno)
```
cd worker
npx wrangler secret put GEMINI_API_KEY   # besplatni ključ: aistudio.google.com
npx wrangler deploy
```
URL workera postaviti kao GitHub repo variable `VITE_PROXY_URL` (Settings → Variables), a Pages source na "GitHub Actions".

Vidi `docs/propisi.md` za status liste propisa.
