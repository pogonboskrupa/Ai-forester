import { useState } from 'preact/hooks';
import {
  complete, DEFAULT_GEMINI_MODEL, getAccessCode, getGeminiKey, getGeminiModel, getProxyUrl,
  setAccessCode, setGeminiKey, setGeminiModel, setProxyUrl,
} from '../llm';
import { conversations, projects } from '../store';

export function Settings() {
  const [gKey, setGKey] = useState(getGeminiKey());
  const [gModel, setGModel] = useState(getGeminiModel());
  const [url, setUrl] = useState(getProxyUrl());
  const [code, setCode] = useState(getAccessCode());
  const [status, setStatus] = useState('');

  const test = async () => {
    setGeminiKey(gKey);
    setGeminiModel(gModel);
    setProxyUrl(url);
    setAccessCode(code);
    setStatus('Provjeravam…');
    try {
      await complete('Odgovori jednom riječju.', [{ role: 'user', text: 'Reci: OK' }]);
      setStatus('Veza radi ✓');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Greška');
    }
  };

  const backup = () => {
    const blob = new Blob([JSON.stringify({ projects: projects.value, conversations: conversations.value }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'ai-sumar-backup.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section class="panel">
      <h2>Postavke</h2>

      <h3>Gemini (besplatno, direktno iz browsera)</h3>
      <p class="muted">
        Ključ napravite na aistudio.google.com/apikey. Čuva se samo u ovom pregledniku i šalje direktno Googleu.
        Besplatni nivo ima dnevna ograničenja, a Google ga može koristiti za unapređenje svojih modela, pa ne unosite povjerljive podatke.
      </p>
      <label>Gemini API ključ
        <input type="password" autocomplete="off" value={gKey} onInput={(e) => setGKey(e.currentTarget.value)} placeholder="AIza…" />
      </label>
      <label>Model
        <input list="gemini-models" value={gModel} onInput={(e) => setGModel(e.currentTarget.value)} placeholder={DEFAULT_GEMINI_MODEL} />
        <datalist id="gemini-models">
          <option value="gemini-2.5-flash" />
          <option value="gemini-2.5-pro" />
          <option value="gemini-2.5-flash-lite" />
        </datalist>
      </label>

      <h3>Proxy (napredno, ima prednost ako je postavljen)</h3>
      <label>Adresa proxyja (Cloudflare Worker)
        <input value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://ai-forester-proxy.<korisnik>.workers.dev" />
      </label>
      <label>Pristupni kod proxyja
        <input type="password" value={code} onInput={(e) => setCode(e.currentTarget.value)} />
      </label>

      <div class="row"><button class="primary" onClick={test}>Sačuvaj i testiraj</button><span class="muted">{status}</span></div>

      <h3>Podaci</h3>
      <p class="muted">Razgovori i projekti se čuvaju samo u ovom pregledniku (IndexedDB).</p>
      <button onClick={backup}>Izvezi sve (JSON)</button>
    </section>
  );
}
