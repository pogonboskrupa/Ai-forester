import { useState } from 'preact/hooks';
import { getAccessCode, getProxyUrl, setAccessCode, setProxyUrl } from '../llm';
import { conversations, projects } from '../store';

export function Settings() {
  const [url, setUrl] = useState(getProxyUrl());
  const [code, setCode] = useState(getAccessCode());
  const [status, setStatus] = useState('');

  const test = async () => {
    setProxyUrl(url);
    setAccessCode(code);
    setStatus('Provjeravam…');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Code': code }, body: JSON.stringify({ system: '', messages: [{ role: 'user', text: 'Odgovori samo: OK' }] }) });
      setStatus(r.ok ? 'Veza radi ✓' : `Greška ${r.status}`);
    } catch {
      setStatus('Nije moguće povezati se (CORS ili adresa).');
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
      <label>Adresa AI proxyja (Cloudflare Worker)
        <input value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://ai-forester-proxy.<korisnik>.workers.dev" />
      </label>
      <label>Pristupni kod (ako je postavljen na proxyju)
        <input type="password" value={code} onInput={(e) => setCode(e.currentTarget.value)} />
      </label>
      <div class="row"><button class="primary" onClick={test}>Sačuvaj i testiraj</button><span class="muted">{status}</span></div>
      <h3>Podaci</h3>
      <p class="muted">Razgovori i projekti se čuvaju samo u ovom pregledniku (IndexedDB).</p>
      <button onClick={backup}>Izvezi sve (JSON)</button>
    </section>
  );
}
