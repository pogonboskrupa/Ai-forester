import { useEffect, useRef, useState } from 'preact/hooks';
import { ORG } from '../org';
import { procedure } from '../procedure';
import { PROVIDER_NAMES, configuredProviders, isConfigured, modelOf, settings, updateSettings } from '../settings';
import {
  activeConv, articles, busy, conversationToMarkdown, draft, drawerOpen, faq, filterProjectId, laws, moveConversation, projectOf,
  projects, renameConversation, sendMessage, stopGeneration, streaming, toast, view,
} from '../store';
import type { Conversation } from '../types';
import { Icon, type IconName } from './Icon';
import { AssistantMessage, UserMessage } from './Message';

const FALLBACK_SUGGESTIONS = [
  { t: 'Doznaka i sječa', q: 'Kako dobiti doznaku i dozvolu za sječu u privatnoj šumi?' },
  { t: 'Promet drveta', q: 'Šta je otpremni iskaz i šta mora sadržavati?' },
  { t: 'Kazne', q: 'Koje su kazne za bespravnu sječu i prevoz drveta bez otpremnice?' },
  { t: 'Naknade', q: 'Ko plaća naknadu za općekorisne funkcije šuma i koliko?' },
];

/** Po jedno pitanje iz različitih tema baze čestih pitanja. */
function suggestions(): { t: string; q: string }[] {
  const seen = new Set<string>();
  const out = faq.value.filter((f) => !seen.has(f.topic) && seen.add(f.topic)).slice(0, 4).map((f) => ({ t: f.topic, q: f.q }));
  return out.length >= 2 ? out : FALLBACK_SUGGESTIONS;
}

function download(c: Conversation): void {
  const url = URL.createObjectURL(new Blob([conversationToMarkdown(c)], { type: 'text/markdown' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${c.title.replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 50) || 'razgovor'}.md` });
  a.click();
  URL.revokeObjectURL(url);
  toast('Razgovor izvezen');
}

const STARTERS: { id: string; icon: IconName; t: string }[] = [
  { id: 'doznaka-privatna', icon: 'tree', t: 'Doznaka i sječa' },
  { id: 'otpremni-iskaz-sta', icon: 'send', t: 'Promet drveta' },
  { id: 'kazne-fizicka-lica', icon: 'scale', t: 'Kazne' },
  { id: 'radni-otkaz', icon: 'check', t: 'Radni odnosi' },
  { id: 'poslovanje-organi-jp', icon: 'book', t: 'Javno preduzeće' },
  { id: 'rad-zastita-obaveze-poslodavca', icon: 'alert', t: 'Zaštita na radu' },
];

/** Pripremljena pitanja iz različitih oblasti (šumarstvo, rad, poslovanje); ako ih nema, po jedno iz svake teme. */
function starters(): { t: string; q: string; icon: IconName }[] {
  const byId = new Map(faq.value.map((f) => [f.id, f]));
  const picked = STARTERS.flatMap((s) => {
    const f = byId.get(s.id);
    return f ? [{ t: s.t, q: f.q, icon: s.icon }] : [];
  });
  return picked.length >= 4 ? picked : suggestions().map((x) => ({ ...x, icon: 'sparkle' as IconName }));
}

const CALLOUT_KEY = 'ai-sumar-callout-off';
const readOff = (): boolean => {
  try {
    return localStorage.getItem(CALLOUT_KEY) === '1';
  } catch {
    return false;
  }
};

function Welcome() {
  const configured = isConfigured();
  const [hideCallout, setHideCallout] = useState(readOff);
  const pid = filterProjectId.value;
  const project = pid && pid !== 'all' ? projectOf(pid) : null;
  const dismiss = () => {
    setHideCallout(true);
    try {
      localStorage.setItem(CALLOUT_KEY, '1');
    } catch {
      /* privatni prozor */
    }
  };
  return (
    <div class="welcome">
      <div class="welcome-mark"><Icon name="tree" size={28} /></div>
      <span class="welcome-org">{ORG.short}</span>
      <h1>{project ? project.name : 'Kako mogu pomoći?'}</h1>
      <p class="muted">Odgovori iz propisa BiH, FBiH i Unsko-sanskog kantona, sa citiranim članovima.</p>
      <div class="welcome-stats" aria-label="Sadržaj baze">
        <span><b>{laws.value.length}</b> propisa</span>
        <span><b>{articles.value.length.toLocaleString('de-DE')}</b> članova</span>
        <span><b>{faq.value.length}</b> gotovih odgovora</span>
      </div>
      {!configured && !hideCallout && (
        <div class="callout">
          <Icon name="key" />
          <div>
            <strong>Radi i bez AI-ja</strong>
            <p>Česta pitanja imaju gotove odgovore, a za ostala dobijate izdvojene odredbe. Za objašnjenja vlastitim riječima povežite AI.</p>
            <div class="row gap">
              <button class="btn sm" onClick={() => (view.value = 'settings')}>Poveži AI</button>
              <button class="btn ghost sm" onClick={dismiss}>Sakrij</button>
            </div>
          </div>
        </div>
      )}
      <div class="suggestions">
        {starters().map((s) => (
          <button key={s.q} class="suggestion" onClick={() => void sendMessage(s.q)}>
            <span class="s-ico"><Icon name={s.icon} size={16} /></span>
            <span class="s-body">
              <span class="s-title">{s.t}</span>
              <span class="s-q">{s.q}</span>
            </span>
          </button>
        ))}
      </div>
      <div class="quick">
        <button onClick={() => (view.value = 'tools')}><Icon name="tool" size={16} /> Kubikator, kazne, zapisnik</button>
        <button onClick={() => (view.value = 'library')}><Icon name="book" size={16} /> Biblioteka i rezimei</button>
        {procedure.value && <button onClick={() => (view.value = 'procedure')}><Icon name="tree" size={16} /> Šumarska procedura</button>}
      </div>
    </div>
  );
}

/** Prekidač AI / Bez AI i izbor AI-ja (među povezanim) direktno ispod polja za pitanje. */
function ModeBar() {
  const s = settings.value;
  const providers = configuredProviders(s);
  const aiOn = s.mode === 'ai' && providers.length > 0;
  return (
    <div class="modebar">
      <div class="segmented xs" role="radiogroup" aria-label="Način odgovaranja">
        <button role="radio" aria-checked={aiOn} class={aiOn ? 'on' : ''} onClick={() => (providers.length ? updateSettings({ mode: 'ai' }) : (view.value = 'settings'))}>
          <Icon name="sparkle" size={14} /> AI
        </button>
        <button role="radio" aria-checked={!aiOn} class={!aiOn ? 'on' : ''} onClick={() => updateSettings({ mode: 'search' })}>
          <Icon name="search" size={14} /> Bez AI
        </button>
      </div>
      {aiOn && (
        <select class="select xs" aria-label="AI model" value={providers.includes(s.provider) ? s.provider : providers[0]} onChange={(e) => updateSettings({ provider: e.currentTarget.value as typeof s.provider })}>
          {providers.map((p) => <option key={p} value={p}>{PROVIDER_NAMES[p]} · {modelOf(p, s)}</option>)}
        </select>
      )}
      <span class="muted xs grow right">Informativno, nije pravni savjet.</span>
    </div>
  );
}

function Composer() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };
  useEffect(resize, [draft.value]);
  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', focus);
    return () => window.removeEventListener('keydown', focus);
  }, []);

  const submit = (e?: Event) => {
    e?.preventDefault();
    if (busy.value) return;
    const t = draft.value;
    if (!t.trim()) return;
    draft.value = '';
    void sendMessage(t);
  };

  return (
    <form class="composer" onSubmit={submit}>
      <div class="composer-box">
        <textarea
          ref={ref}
          rows={1}
          placeholder="Postavite pitanje o šumarstvu, radu ili poslovanju…"
          value={draft.value}
          aria-label="Pitanje"
          onInput={(e) => (draft.value = e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) submit(e);
          }}
        />
        {busy.value ? (
          <button type="button" class="send stop" aria-label="Zaustavi" title="Zaustavi (Esc)" onClick={stopGeneration}><Icon name="stop" size={16} /></button>
        ) : (
          <button class="send" aria-label="Pošalji" disabled={!draft.value.trim()}><Icon name="send" size={18} /></button>
        )}
      </div>
      <ModeBar />
    </form>
  );
}

export function Chat() {
  const c = activeConv.value;
  const s = streaming.value;
  const end = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const live = s && c && s.convId === c.id ? s : null;

  // Autoscroll samo ako je korisnik već pri dnu (ne prekidamo čitanje starijih poruka).
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) end.current?.scrollIntoView({ block: 'end' });
  }, [c?.messages.length, live?.text]);
  useEffect(() => { if (c?.messages.length) end.current?.scrollIntoView({ block: 'end' }); }, [c?.id]);

  const project = projectOf(c?.projectId ?? null);
  const empty = !c || c.messages.length === 0;
  const lastUser = c ? c.messages.map((m) => m.role).lastIndexOf('user') : -1;
  const lastAi = c ? c.messages.map((m) => m.role).lastIndexOf('assistant') : -1;
  void settings.value; // re-render na promjenu modela

  return (
    <section class="chat">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        {c && !empty ? (
          <>
            <input key={c.id} class="title-edit" defaultValue={c.title} aria-label="Naslov razgovora" onChange={(e) => renameConversation(c.id, e.currentTarget.value)} />
            <select class="select sm" title="Projekat (određuje izvore)" value={c.projectId ?? ''} onChange={(e) => moveConversation(c.id, e.currentTarget.value || null)}>
              <option value="">Svi propisi</option>
              {projects.value.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button class="icon-btn" title="Izvezi kao Markdown" onClick={() => download(c)}><Icon name="download" /></button>
          </>
        ) : (
          <span class="topbar-title">{project?.name ?? 'Novi razgovor'}</span>
        )}
      </header>

      <div class="log" ref={logRef}>
        <div class="log-inner">
          {empty ? (
            <Welcome />
          ) : (
            c!.messages.map((m, i) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} m={m} last={i === lastUser && !live} />
              ) : (
                <AssistantMessage key={m.id} m={m} last={i === lastAi && !live && lastAi > lastUser} />
              ),
            )
          )}
          {live && <AssistantMessage m={null} last streamingText={live.text} />}
          <div ref={end} />
        </div>
      </div>
      <Composer />
    </section>
  );
}
