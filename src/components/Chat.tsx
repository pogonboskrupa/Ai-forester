import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { renderMarkdown } from '../md';
import {
  activeConv, articleById, busy, conversationToMarkdown, moveConversation, projectOf, projects, renameConversation, sendMessage,
} from '../store';
import type { Article, Conversation, Msg } from '../types';

const draft = signal('');
const SUGGESTIONS = [
  'Ko izdaje doznaku za sječu u privatnoj šumi?',
  'Koje su obaveze šumoposjednika kod obnove šume?',
  'Šta propisuje zakon o prijevozu šumskih sortimenata?',
];

function download(c: Conversation): void {
  const url = URL.createObjectURL(new Blob([conversationToMarkdown(c)], { type: 'text/markdown' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${c.title.slice(0, 40)}.md` });
  a.click();
  URL.revokeObjectURL(url);
}

function Sources({ ids }: { ids: string[] }) {
  const src = ids.map(articleById).filter((a): a is Article => !!a);
  if (!src.length) return null;
  return (
    <div class="src">
      <strong>Izvori ({src.length})</strong>
      {src.map((a) => (
        <details key={a.id}>
          <summary>{a.lawTitle}, član {a.number}{a.heading ? ` – ${a.heading}` : ''}</summary>
          <p>{a.text}</p>
          <small class="muted">{a.gazette}</small>
        </details>
      ))}
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === 'user') return <div class="msg user">{m.text}</div>;
  return (
    <div class={m.error ? 'msg bot err' : 'msg bot'}>
      <div class="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
      {!m.error && <button class="icon copy" title="Kopiraj" onClick={() => void navigator.clipboard?.writeText(m.text)}>⧉</button>}
      <Sources ids={m.sourceIds} />
    </div>
  );
}

export function Chat() {
  const c = activeConv.value;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [c?.messages.length, busy.value]);

  const project = projectOf(c?.projectId ?? null);
  const submit = (e: Event) => {
    e.preventDefault();
    const t = draft.value;
    draft.value = '';
    void sendMessage(t);
  };

  return (
    <section class="chat">
      {c && (
        <div class="chat-head">
          <input
            class="title-edit" value={c.title} aria-label="Naslov razgovora"
            onChange={(e) => renameConversation(c.id, e.currentTarget.value)}
          />
          <select
            title="Projekat" value={c.projectId ?? ''}
            onChange={(e) => moveConversation(c.id, e.currentTarget.value || null)}
          >
            <option value="">Bez projekta (svi propisi)</option>
            {projects.value.map((p) => <option value={p.id}>{p.name}</option>)}
          </select>
          <button class="icon" title="Izvezi (.md)" onClick={() => download(c)}>⤓</button>
        </div>
      )}
      {project && <div class="banner">Projekat: <b>{project.name}</b> · izvora: {project.lawIds.length || 'svi'}</div>}

      <div class="log">
        {(!c || c.messages.length === 0) && (
          <div class="empty">
            <h2>Kako mogu pomoći?</h2>
            <p class="muted">Pitanja o šumarskim propisima BiH, FBiH i USK. Odgovori citiraju član zakona.</p>
            {SUGGESTIONS.map((s) => <button class="chip big" onClick={() => void sendMessage(s)}>{s}</button>)}
          </div>
        )}
        {c?.messages.map((m) => <Bubble key={m.id} m={m} />)}
        {busy.value && <div class="msg bot muted">Tražim u propisima…</div>}
        <div ref={end} />
      </div>

      <form class="composer" onSubmit={submit}>
        <textarea
          rows={1} placeholder="Postavi pitanje…" value={draft.value}
          onInput={(e) => (draft.value = e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
        />
        <button class="primary" disabled={busy.value || !draft.value.trim()}>Pitaj</button>
      </form>
      <footer>Informativno, nije pravni savjet. Provjerite u Službenom glasniku.</footer>
    </section>
  );
}
