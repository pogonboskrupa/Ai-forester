import { signal } from '@preact/signals';
import {
  activeConvId, conversations, deleteConversation, drawerOpen, editingProjectId, filterProjectId,
  newConversation, openConversation, projects, view,
} from '../store';

const q = signal('');

export function Sidebar() {
  const f = filterProjectId.value;
  const term = q.value.trim().toLowerCase();
  const list = [...conversations.value]
    .filter((c) => f === 'all' || c.projectId === f)
    .filter((c) => !term || c.title.toLowerCase().includes(term) || c.messages.some((m) => m.text.toLowerCase().includes(term)))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside class={`side ${drawerOpen.value ? 'open' : ''}`}>
      <div class="brand">🌲 AI Šumar</div>
      <button class="primary" onClick={() => newConversation(f === 'all' ? null : f)}>+ Novi razgovor</button>

      <div class="section-title">
        Projekti
        <button class="icon" title="Novi projekat" onClick={() => { editingProjectId.value = 'new'; view.value = 'project'; drawerOpen.value = false; }}>＋</button>
      </div>
      <div class="chips">
        <button class={f === 'all' ? 'chip on' : 'chip'} onClick={() => (filterProjectId.value = 'all')}>Svi</button>
        <button class={f === null ? 'chip on' : 'chip'} onClick={() => (filterProjectId.value = null)}>Bez projekta</button>
        {projects.value.map((p) => (
          <span key={p.id} class={f === p.id ? 'chip on' : 'chip'}>
            <button onClick={() => (filterProjectId.value = p.id)}>{p.name}</button>
            <button class="edit" title="Uredi" onClick={() => { editingProjectId.value = p.id; view.value = 'project'; drawerOpen.value = false; }}>✎</button>
          </span>
        ))}
      </div>

      <input class="search" placeholder="Pretraži historiju…" value={q.value} onInput={(e) => (q.value = e.currentTarget.value)} />
      <nav class="convs">
        {list.length === 0 && <p class="muted">Nema razgovora.</p>}
        {list.map((c) => (
          <div key={c.id} class={c.id === activeConvId.value && view.value === 'chat' ? 'conv on' : 'conv'}>
            <button class="title" onClick={() => openConversation(c.id)}>{c.title}</button>
            <button class="icon del" title="Obriši" onClick={() => confirm('Obrisati razgovor?') && deleteConversation(c.id)}>✕</button>
          </div>
        ))}
      </nav>

      <div class="foot">
        <button onClick={() => { view.value = 'library'; drawerOpen.value = false; }}>📚 Biblioteka propisa</button>
        <button onClick={() => { view.value = 'settings'; drawerOpen.value = false; }}>⚙ Postavke</button>
      </div>
    </aside>
  );
}
