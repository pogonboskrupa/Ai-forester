import { useEffect, useRef } from 'preact/hooks';
import { isConfigured, providerLabel, settings } from '../settings';
import {
  activeConv, busy, conversationToMarkdown, draft, drawerOpen, filterProjectId, laws, moveConversation, projectOf,
  projects, renameConversation, sendMessage, stopGeneration, streaming, toast, view,
} from '../store';
import type { Conversation } from '../types';
import { Icon } from './Icon';
import { AssistantMessage, UserMessage } from './Message';

const SUGGESTIONS = [
  { t: 'Doznaka i sječa', q: 'Ko vrši doznaku stabala u privatnoj šumi i koji je postupak?' },
  { t: 'Prijevoz drveta', q: 'Šta mora sadržavati otpremni iskaz za prijevoz drveta?' },
  { t: 'Kazne', q: 'Koje su kazne za bespravnu sječu prema Zakonu o šumama USK?' },
  { t: 'Naknade', q: 'Kako se obračunava naknada za zaštitu i unapređenje šuma?' },
];

function download(c: Conversation): void {
  const url = URL.createObjectURL(new Blob([conversationToMarkdown(c)], { type: 'text/markdown' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${c.title.replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 50) || 'razgovor'}.md` });
  a.click();
  URL.revokeObjectURL(url);
  toast('Razgovor izvezen');
}

function Welcome() {
  const configured = isConfigured();
  const pid = filterProjectId.value;
  const project = pid && pid !== 'all' ? projectOf(pid) : null;
  return (
    <div class="welcome">
      <div class="welcome-mark"><Icon name="tree" size={28} /></div>
      <h1>{project ? project.name : 'Kako mogu pomoći?'}</h1>
      <p class="muted">
        Odgovori iz {laws.value.length} propisa BiH, FBiH i Unsko-sanskog kantona, sa citiranim članovima.
      </p>
      {!configured && (
        <div class="callout">
          <Icon name="key" />
          <div>
            <strong>Povežite AI model</strong>
            <p>Za odgovore je potreban API ključ (besplatni Gemini ili Claude). Ključ ostaje samo u ovom pregledniku.</p>
            <button class="btn primary sm" onClick={() => (view.value = 'settings')}>Otvori postavke</button>
          </div>
        </div>
      )}
      <div class="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s.q} class="suggestion" disabled={!configured} onClick={() => void sendMessage(s.q)}>
            <span class="s-title">{s.t}</span>
            <span class="s-q">{s.q}</span>
          </button>
        ))}
      </div>
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
          placeholder="Postavite pitanje o šumarskim propisima…"
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
      <p class="hint">
        <button type="button" class="link" onClick={() => (view.value = 'settings')}>{isConfigured() ? providerLabel() : 'AI nije povezan'}</button>
        <span> · Enter šalje, Shift+Enter novi red · Informativno, nije pravni savjet.</span>
      </p>
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
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [c?.id]);

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
