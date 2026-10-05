# AI Šumar – asistent za šumarske propise BiH / FBiH / USK

Baza: 45 propisa (USK + FBiH + BiH), vidi docs/propisi.md.

Statički PWA (GitHub Pages, Preact + TypeScript). Pretraga propisa radi u browseru (MiniSearch nad članovima), LLM ide preko Cloudflare Workera da API ključ ne bude javan.

## Mogućnosti
- Razgovori sa historijom (IndexedDB), pretraga po historiji, preimenovanje, izvoz u Markdown
- **Projekti**: tema s vlastitim skupom izvora i uputama za AI; razgovor u projektu pretražuje samo te izvore
- Odgovor citira član; ispod svakog odgovora su rasklopivi izvori
- Biblioteka propisa, instalacija kao PWA, offline baza, tamna tema, mobilni prikaz
- Izvoz svih podataka (JSON)

## Pokretanje
```
npm install
npm run dev
npm test
```

## Dodavanje propisa
Tekst u `data/raw/<id>.txt` (članovi kao `Član N.`), unos u `data/registry.json`, pa `npm run ingest`. Za glasnike u PDF-u: `python3 scripts/extract_acts.py glasnik.pdf <broj_akta> data/raw/<id>.txt`. Status: `docs/propisi.md`.

## Proxy bez instalacije (Cloudflare dashboard)
1. dash.cloudflare.com → Workers & Pages → Create → Create Worker → Deploy → Edit code
2. Zamijeni sadržaj sadržajem `worker/worker.js` → Deploy
3. Settings → Variables and Secrets: dodaj secrete `ANTHROPIC_API_KEY`, `ACCESS_CODE` i varijablu `ALLOWED_ORIGIN` (adresa tvog Pages sajta, npr. `https://pogonboskrupa.github.io`)

## Proxy (Claude API, CLI)
```
cd worker
npx wrangler secret put ANTHROPIC_API_KEY   # Claude ključ (console.anthropic.com)
npx wrangler secret put ACCESS_CODE         # lozinka; unosi se u Postavkama aplikacije
npx wrangler deploy
```
Model: varijabla `CLAUDE_MODEL` u `worker/wrangler.toml` (default `claude-sonnet-5-5`; jeftinije `claude-haiku-4-5-20251001`). Bez Claude ključa proxy koristi `GEMINI_API_KEY` (besplatni tier).

URL workera: GitHub repo variable `VITE_PROXY_URL` ili u Postavkama aplikacije. Pages source: "GitHub Actions".
