import { useRef, useState } from 'preact/hooks';
import { AiError, streamCompletion } from '../ai/client';
import { CLAUDE_MODELS, GEMINI_MODELS, settings, updateSettings, type Provider, type Theme } from '../settings';
import { conversations, drawerOpen, exportAll, importAll, toast } from '../store';
import { Icon, type IconName } from './Icon';

const PROVIDERS: { id: Provider; title: string; desc: string }[] = [
  { id: 'gemini', title: 'Google Gemini', desc: 'Besplatni nivo, ključ s aistudio.google.com/apikey' },
  { id: 'claude', title: 'Anthropic Claude', desc: 'Najprecizniji odgovori, ključ s console.anthropic.com (plaća se po upotrebi)' },
  { id: 'proxy', title: 'Vlastiti proxy', desc: 'Cloudflare Worker s ključem na serveru (za dijeljenje s kolegama)' },
];

const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: 'system', label: 'Sistem', icon: 'monitor' },
  { id: 'light', label: 'Svijetla', icon: 'sun' },
  { id: 'dark', label: 'Tamna', icon: 'moon' },
];

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div class="secret">
      {show ? (
        <input type="text" autocomplete="off" spellcheck={false} value={value} placeholder={placeholder} onInput={(e) => onChange(e.currentTarget.value.trim())} />
      ) : (
        <input type="password" autocomplete="off" value={value} placeholder={placeholder} onInput={(e) => onChange(e.currentTarget.value.trim())} />
      )}
      <button type="button" class="btn ghost sm" onClick={() => setShow(!show)}>{show ? 'Sakrij' : 'Prikaži'}</button>
    </div>
  );
}

export function Settings() {
  const s = settings.value;
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const test = async () => {
    setTesting(true);
    setStatus(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      let out = '';
      await streamCompletion({ system: 'Odgovori jednom riječju.', messages: [{ role: 'user', text: 'Napiši: OK' }], onText: (d) => (out += d), signal: ctrl.signal });
      setStatus({ ok: true, text: `Veza radi (${out.trim().slice(0, 20) || 'OK'})` });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof AiError || e instanceof Error ? e.message : 'Greška' });
    } finally {
      clearTimeout(t);
      setTesting(false);
    }
  };

  const backup = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' })),
      download: `ai-sumar-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      toast(`Uvezeno razgovora: ${importAll(await f.text())}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Uvoz nije uspio', 'err');
    }
  };

  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <span class="topbar-title">Postavke</span>
      </header>
      <div class="page-inner narrow">
        <section class="card">
          <h2>AI model</h2>
          <div class="provider-grid" role="radiogroup">
            {PROVIDERS.map((p) => (
              <button key={p.id} role="radio" aria-checked={s.provider === p.id} class={`provider ${s.provider === p.id ? 'on' : ''}`} onClick={() => { updateSettings({ provider: p.id }); setStatus(null); }}>
                <strong>{p.title}</strong>
                <span class="muted xs">{p.desc}</span>
              </button>
            ))}
          </div>

          {s.provider === 'gemini' && (
            <>
              <label class="field">Gemini API ključ<SecretInput value={s.geminiKey} onChange={(v) => updateSettings({ geminiKey: v })} placeholder="AIza…" /></label>
              <label class="field">Model
                <select class="select" value={s.geminiModel} onChange={(e) => updateSettings({ geminiModel: e.currentTarget.value })}>
                  {GEMINI_MODELS.map((m) => <option key={m} value={m}>{m}{m.endsWith('pro') ? ' (precizniji, sporiji)' : m.endsWith('lite') ? ' (najbrži)' : ' (preporučeno)'}</option>)}
                </select>
              </label>
              <p class="muted xs">Besplatni nivo ima dnevna ograničenja, a Google može koristiti upite za unapređenje modela. Ne unosite povjerljive podatke.</p>
            </>
          )}
          {s.provider === 'claude' && (
            <>
              <label class="field">Claude API ključ<SecretInput value={s.claudeKey} onChange={(v) => updateSettings({ claudeKey: v })} placeholder="sk-ant-…" /></label>
              <label class="field">Model
                <select class="select" value={s.claudeModel} onChange={(e) => updateSettings({ claudeModel: e.currentTarget.value })}>
                  {CLAUDE_MODELS.map((m) => <option key={m} value={m}>{m}{m.includes('opus') ? ' (najprecizniji)' : m.includes('haiku') ? ' (najjeftiniji)' : ' (brz i povoljan)'}</option>)}
                </select>
              </label>
              <p class="muted xs">Ključ se šalje direktno Anthropicu iz ovog preglednika. Koristite ga samo na svom uređaju; za dijeljenje s drugima koristite proxy.</p>
            </>
          )}
          {s.provider === 'proxy' && (
            <>
              <label class="field">Adresa proxyja<input value={s.proxyUrl} placeholder="https://ai-forester-proxy.<korisnik>.workers.dev" onInput={(e) => updateSettings({ proxyUrl: e.currentTarget.value.trim() })} /></label>
              <label class="field">Pristupni kod<SecretInput value={s.accessCode} onChange={(v) => updateSettings({ accessCode: v })} placeholder="kod postavljen na proxyju" /></label>
            </>
          )}

          <div class="row gap">
            <button class="btn primary" disabled={testing} onClick={() => void test()}>{testing ? 'Provjeravam…' : 'Testiraj vezu'}</button>
            {status && <span class={`status ${status.ok ? 'ok' : 'err'}`}><Icon name={status.ok ? 'check' : 'alert'} size={14} /> {status.text}</span>}
          </div>
          <p class="muted xs">Postavke se čuvaju automatski, samo u ovom pregledniku.</p>
        </section>

        <section class="card">
          <h2>Izgled</h2>
          <div class="segmented" role="radiogroup">
            {THEMES.map((t) => (
              <button key={t.id} role="radio" aria-checked={s.theme === t.id} class={s.theme === t.id ? 'on' : ''} onClick={() => updateSettings({ theme: t.id })}>
                <Icon name={t.icon} size={16} /> {t.label}
              </button>
            ))}
          </div>
        </section>

        <section class="card">
          <h2>Podaci</h2>
          <p class="muted small">{conversations.value.length} razgovora sačuvano u ovom pregledniku (IndexedDB). Napravite backup prije brisanja podataka preglednika.</p>
          <div class="row gap wrap">
            <button class="btn" onClick={backup}><Icon name="download" size={16} /> Izvezi backup</button>
            <button class="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Uvezi backup</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => void restore(e.currentTarget.files?.[0])} />
          </div>
        </section>

        <section class="card">
          <h2>Prečice</h2>
          <dl class="shortcuts">
            <dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Novi razgovor</dd>
            <dt><kbd>/</kbd></dt><dd>Fokus na polje za pitanje</dd>
            <dt><kbd>Esc</kbd></dt><dd>Zaustavi odgovor / zatvori panel</dd>
          </dl>
        </section>
      </div>
    </section>
  );
}
