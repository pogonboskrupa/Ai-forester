import { useRef, useState } from 'preact/hooks';
import { AiError, streamCompletion } from '../ai/client';
import { LOCAL_PRESETS, detectLocal, listLocalModels, normalizeLocalUrl } from '../ai/local';
import { listGeminiModels, listOpenAIModels, pickBestGemini, pickBestOpenAI } from '../ai/models';
import {
  CLAUDE_MODELS, GEMINI_MODELS, OPENAI_MODELS, PROVIDER_NAMES, configuredProviders, hasKey, settings, updateSettings,
  type Provider, type Settings as S, type Theme,
} from '../settings';
import { conversations, drawerOpen, exportAll, importAll, toast } from '../store';
import { Icon, type IconName } from './Icon';
import { InstallCard } from './InstallCard';
import { UpdateCard } from './Update';
import { PrivateCard } from './PrivateCard';

interface ProviderDef {
  id: Provider;
  hint: string;
  keyField?: 'geminiKey' | 'openaiKey' | 'claudeKey';
  modelField?: 'geminiModel' | 'openaiModel' | 'claudeModel';
  models?: readonly string[];
  placeholder?: string;
  url?: string;
}

const PROVIDERS: ProviderDef[] = [
  { id: 'gemini', hint: 'Besplatni nivo uz dnevna ograničenja. Ako model prestane raditi, aplikacija sama prelazi na dostupni.', keyField: 'geminiKey', modelField: 'geminiModel', models: GEMINI_MODELS, placeholder: 'AIza…', url: 'https://aistudio.google.com/apikey' },
  { id: 'openai', hint: 'ChatGPT modeli, plaća se po upotrebi.', keyField: 'openaiKey', modelField: 'openaiModel', models: OPENAI_MODELS, placeholder: 'sk-…', url: 'https://platform.openai.com/api-keys' },
  { id: 'claude', hint: 'Plaća se po upotrebi. claude-haiku-4-5 je najjeftiniji; sonnet i opus su precizniji, ali skuplji.', keyField: 'claudeKey', modelField: 'claudeModel', models: CLAUDE_MODELS, placeholder: 'sk-ant-…', url: 'https://console.anthropic.com/settings/keys' },
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

type Status = { ok: boolean; text: string } | null;

async function testProvider(p: Provider): Promise<Status> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), p === 'local' ? 180000 : 30000); // model na telefonu je spor pri prvom odgovoru
  try {
    let out = '';
    // Test samo ovog provajdera, bez prelaska na druge.
    const only: S = { ...settings.value, provider: p, fallback: false };
    await streamCompletion({ system: 'Odgovori jednom riječju.', messages: [{ role: 'user', text: 'Napiši: OK' }], onText: (d) => (out += d), signal: ctrl.signal }, only);
    return { ok: true, text: `Radi (${out.trim().slice(0, 16) || 'OK'})` };
  } catch (e) {
    return { ok: false, text: e instanceof AiError || e instanceof Error ? e.message : 'Greška' };
  } finally {
    clearTimeout(t);
  }
}

const CTX_OPTIONS = [2048, 4096, 8192, 16384];

/** Lokalni model (npr. Phi-4 mini) preko OpenAI-kompatibilnog servera na telefonu ili u mreži. */
function LocalCard() {
  const s = settings.value;
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const connected = hasKey('local', s);
  const primary = s.provider === 'local';

  const apply = (url: string, found: string[]) => {
    setModels(found);
    const patch: Partial<S> = { localUrl: url };
    // Ako postavljeni model ne postoji na serveru, uzmi onaj koji liči na Phi, inače prvi.
    if (found.length && !found.includes(s.localModel)) patch.localModel = found.find((m) => /phi/i.test(m)) ?? found[0]!;
    updateSettings(patch);
  };
  const find = async () => {
    setBusy(true);
    setStatus(null);
    const r = await detectLocal();
    if (r) {
      apply(r.url, r.models);
      setStatus({ ok: true, text: `Pronađen server: ${r.url} (${r.models.length} modela)` });
    } else {
      setStatus({ ok: false, text: 'Nije pronađen lokalni server na uobičajenim portovima. Pokrenite ga ili upišite adresu ručno.' });
    }
    setBusy(false);
  };
  const loadModels = async () => {
    setBusy(true);
    try {
      const url = normalizeLocalUrl(s.localUrl);
      const found = await listLocalModels(url, s.localKey);
      apply(url, found);
      setStatus({ ok: true, text: `${found.length} modela na serveru` });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'Server ne odgovara' });
    }
    setBusy(false);
  };

  return (
    <div class={`provider-card ${primary ? 'primary' : ''}`}>
      <div class="row between">
        <div class="row gap">
          <strong>{PROVIDER_NAMES.local}</strong>
          {connected ? <span class="pill ok">povezan</span> : <span class="pill">nije povezan</span>}
          {primary && connected && <span class="pill accent">glavni</span>}
        </div>
        {connected && !primary && <button class="btn ghost sm" onClick={() => updateSettings({ provider: 'local' })}>Postavi kao glavni</button>}
      </div>
      <p class="muted xs">Model koji radi na vašem telefonu (npr. Phi-4 mini), bez interneta i bez ključa. Treba aplikacija koja pokreće OpenAI-kompatibilan server: llama.cpp ili Ollama (npr. u Termuxu) ili LM Studio u istoj mreži. Aplikacije koje samo otvaraju chat (bez servera) ne mogu se povezati.</p>
      <div class="row gap wrap">
        {LOCAL_PRESETS.map((p) => <button key={p.name} class="chip" onClick={() => { updateSettings({ localUrl: p.url }); setStatus(null); }}>{p.name}</button>)}
        <button class="btn sm" disabled={busy} onClick={() => void find()}>{busy ? 'Tražim…' : 'Pronađi na ovom uređaju'}</button>
      </div>
      <label class="field">Adresa servera<input value={s.localUrl} placeholder="http://localhost:8080/v1" onInput={(e) => { updateSettings({ localUrl: e.currentTarget.value.trim() }); setStatus(null); }} onBlur={() => s.localUrl && updateSettings({ localUrl: normalizeLocalUrl(s.localUrl) })} /></label>
      <div class="row gap">
        <input class="grow" list="models-local" value={s.localModel} aria-label="Model" placeholder="phi-4-mini" onInput={(e) => updateSettings({ localModel: e.currentTarget.value.trim() })} />
        <datalist id="models-local">{models.map((m) => <option key={m} value={m} />)}</datalist>
        <button class="btn sm" disabled={!connected || busy} onClick={() => void loadModels()}>Učitaj modele</button>
        <button class="btn sm" disabled={!connected || busy} onClick={async () => { setBusy(true); setStatus(await testProvider('local')); setBusy(false); }}>{busy ? 'Provjeravam…' : 'Testiraj'}</button>
      </div>
      <label class="field">Kontekst modela (tokeni)
        <select class="select" value={s.localCtx} onChange={(e) => updateSettings({ localCtx: Number(e.currentTarget.value) })}>
          {CTX_OPTIONS.map((n) => <option key={n} value={n}>{n}{n === 4096 ? ' (zadano)' : ''}</option>)}
        </select>
        <span class="muted xs">Što je kontekst veći, više izvoda ide u upit, ali je model sporiji. Postavite onoliko koliko je server pokrenut (npr. llama.cpp -c 4096).</span>
      </label>
      <details class="advanced"><summary>Napredno: ključ servera</summary>
        <SecretInput value={s.localKey} onChange={(v) => updateSettings({ localKey: v })} placeholder="neobavezno (većina lokalnih servera ga ne traži)" />
      </details>
      {status && <p class={`status ${status.ok ? 'ok' : 'err'} small`}>{status.text}</p>}
    </div>
  );
}

function ProviderCard({ def }: { def: ProviderDef }) {
  const s = settings.value;
  const [status, setStatus] = useState<Status>(null);
  const [testing, setTesting] = useState(false);
  const [live, setLive] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const connected = hasKey(def.id, s);
  const canList = def.id === 'gemini' || def.id === 'openai';

  const loadModels = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const list = def.id === 'gemini' ? await listGeminiModels(s.geminiKey) : await listOpenAIModels(s.openaiKey);
      setLive(list);
      const current = s[def.modelField!];
      // Ako trenutni model nije među dostupnima, odmah postavi najbolji dostupni.
      if (!list.includes(current)) {
        const best = def.id === 'gemini' ? pickBestGemini(list) : pickBestOpenAI(list);
        if (best) updateSettings({ [def.modelField!]: best } as Partial<S>);
        setStatus({ ok: true, text: `${list.length} modela dostupno; postavljen ${best ?? '—'}` });
      } else {
        setStatus({ ok: true, text: `${list.length} modela dostupno` });
      }
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'Greška' });
    } finally {
      setLoading(false);
    }
  };
  const primary = s.provider === def.id;
  return (
    <div class={`provider-card ${primary ? 'primary' : ''}`}>
      <div class="row between">
        <div class="row gap">
          <strong>{PROVIDER_NAMES[def.id]}</strong>
          {connected ? <span class="pill ok">povezan</span> : <span class="pill">nije povezan</span>}
          {primary && connected && <span class="pill accent">glavni</span>}
        </div>
        {connected && !primary && <button class="btn ghost sm" onClick={() => updateSettings({ provider: def.id })}>Postavi kao glavni</button>}
      </div>
      <p class="muted xs">{def.hint} {def.url && <a href={def.url} target="_blank" rel="noreferrer noopener">Napravi ključ ↗</a>}</p>
      {def.keyField && (
        <SecretInput value={s[def.keyField]} placeholder={def.placeholder ?? ''} onChange={(v) => { updateSettings({ [def.keyField!]: v } as Partial<S>); setStatus(null); }} />
      )}
      {def.modelField && (
        <div class="row gap">
          <input class="grow" list={`models-${def.id}`} value={s[def.modelField]} aria-label="Model" onInput={(e) => updateSettings({ [def.modelField!]: e.currentTarget.value.trim() } as Partial<S>)} />
          <datalist id={`models-${def.id}`}>{(live ?? def.models ?? []).map((m) => <option key={m} value={m} />)}</datalist>
          {canList && (
            <button class="btn sm" disabled={!connected || loading} title="Učitaj modele dostupne za ovaj ključ" onClick={() => void loadModels()}>
              {loading ? 'Učitavam…' : 'Učitaj modele'}
            </button>
          )}
          <button class="btn sm" disabled={!connected || testing} onClick={async () => { setTesting(true); setStatus(await testProvider(def.id)); setTesting(false); }}>
            {testing ? 'Provjeravam…' : 'Testiraj'}
          </button>
        </div>
      )}
      {live && live.length > 0 && (
        <select class="select sm" aria-label="Dostupni modeli" value={live.includes(s[def.modelField!]) ? s[def.modelField!] : ''} onChange={(e) => updateSettings({ [def.modelField!]: e.currentTarget.value } as Partial<S>)}>
          <option value="" disabled>Izaberi model…</option>
          {live.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      {status && <span class={`status ${status.ok ? 'ok' : 'err'}`}><Icon name={status.ok ? 'check' : 'alert'} size={14} /> {status.text}</span>}
    </div>
  );
}

export function Settings() {
  const s = settings.value;
  const fileRef = useRef<HTMLInputElement>(null);
  const connected = configuredProviders(s);

  const backup = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' })),
      download: `forester-backup-${new Date().toISOString().slice(0, 10)}.json`,
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
        <InstallCard />
        <UpdateCard />
        <PrivateCard />
        <section class="card">
          <h2>Način odgovaranja</h2>
          <div class="segmented" role="radiogroup">
            <button role="radio" aria-checked={s.mode === 'ai'} class={s.mode === 'ai' ? 'on' : ''} onClick={() => updateSettings({ mode: 'ai' })}><Icon name="sparkle" size={16} /> AI asistent</button>
            <button role="radio" aria-checked={s.mode === 'search'} class={s.mode === 'search' ? 'on' : ''} onClick={() => updateSettings({ mode: 'search' })}><Icon name="search" size={16} /> Bez AI-ja</button>
          </div>
          <p class="muted small">
            U oba načina česta pitanja dobijaju <strong>pripremljene odgovore</strong> odmah i besplatno. Bez AI-ja, ostala pitanja dobijaju izdvojene odredbe iz propisa; s AI-jem, objašnjenje sa citatima.
          </p>
        </section>

        <section class="card">
          <div class="row between"><h2>AI ključevi</h2><span class="muted xs">{connected.length ? `${connected.length} povezano` : 'nijedan povezan'}</span></div>
          <p class="muted small">Možete unijeti ključeve za više servisa. Ključevi se čuvaju samo u ovom pregledniku i šalju direktno servisu. Ne unosite ih na tuđem uređaju.</p>
          {PROVIDERS.map((d) => <ProviderCard key={d.id} def={d} />)}
          <LocalCard />
          <label class="toggle">
            <input type="checkbox" checked={s.fallback} onChange={(e) => updateSettings({ fallback: e.currentTarget.checked })} />
            <span>
              <strong>Automatska zamjena</strong>
              <span class="muted xs">Ako glavni AI ne odgovori (kvota, preopterećenje), pokušaj sljedeći povezani.</span>
            </span>
          </label>
          <details class="advanced">
            <summary>Napredno: vlastiti proxy (za dijeljenje s kolegama)</summary>
            <label class="field">Adresa proxyja<input value={s.proxyUrl} placeholder="https://ai-forester-proxy.<korisnik>.workers.dev" onInput={(e) => updateSettings({ proxyUrl: e.currentTarget.value.trim() })} /></label>
            <label class="field">Pristupni kod<SecretInput value={s.accessCode} onChange={(v) => updateSettings({ accessCode: v })} placeholder="kod postavljen na proxyju" /></label>
            {s.proxyUrl && s.provider !== 'proxy' && <button class="btn sm" onClick={() => updateSettings({ provider: 'proxy' })}>Postavi proxy kao glavni</button>}
          </details>
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
          <h3 class="muted xs">Raspored</h3>
          <div class="segmented" role="radiogroup" aria-label="Raspored">
            <button role="radio" aria-checked={s.layout === 'auto'} class={s.layout === 'auto' ? 'on' : ''} onClick={() => updateSettings({ layout: 'auto' })}><Icon name="sparkle" size={16} /> Automatski</button>
            <button role="radio" aria-checked={s.layout === 'desktop'} class={s.layout === 'desktop' ? 'on' : ''} onClick={() => updateSettings({ layout: 'desktop' })}><Icon name="monitor" size={16} /> Desktop</button>
          </div>
          <p class="muted xs">Automatski: telefon dobija mobilni raspored, računar širok raspored s bočnom trakom. Desktop: i telefon prikazuje računarski raspored (kao „Desktop site“ u pregledniku); na računaru nema efekta.</p>
        </section>

        <section class="card">
          <h2>Podaci</h2>
          <p class="muted small">{conversations.value.length} razgovora sačuvano u ovom pregledniku. Napravite backup prije brisanja podataka preglednika.</p>
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

        <p class="muted xs center-text">Forester · verzija {__APP_VERSION__}</p>
      </div>
    </section>
  );
}
