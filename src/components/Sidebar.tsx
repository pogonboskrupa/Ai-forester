import { signal } from '@preact/signals';
import {
  activeConvId, conversations, deleteConversation, drawerOpen, editingProjectId, filterProjectId,
  newConversation, openConversation, projects, togglePin, view,
} from '../store';
import type { Conversation } from '../types';
import { Icon } from './Icon';

const q = signal('');

const DAY = 86_400_000;
function bucket(ts: number): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t = start.getTime();
  if (ts >= t) return 'Danas';
  if (ts >= t - DAY) return 'Jučer';
  if (ts >= t - 7 * DAY) return 'Prethodnih 7 dana';
  if (ts >= t - 30 * DAY) return 'Prethodnih 30 dana';
  return 'Starije';
}

function group(list: Conversation[]): [string, Conversation[]][] {
  const out = new Map<string, Conversation[]>();
  for (const c of list) {
    const key = c.pinned ? 'Zakačeno' : bucket(c.updatedAt);
    out.set(key, [...(out.get(key) ?? []), c]);
  }
  const order = ['Zakačeno', 'Danas', 'Jučer', 'Prethodnih 7 dana', 'Prethodnih 30 dana', 'Starije'];
  return order.filter((k) => out.has(k)).map((k) => [k, out.get(k)!]);
}

const go = (v: typeof view.value) => {
  view.value = v;
  drawerOpen.value = false;
};

export function Sidebar() {
  const f = filterProjectId.value;
  const term = q.value.trim().toLowerCase();
  const list = conversations.value
    .filter((c) => f === 'all' || c.projectId === f)
    .filter((c) => !term || c.title.toLowerCase().includes(term) || c.messages.some((m) => m.text.toLowerCase().includes(term)))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside class={`side ${drawerOpen.value ? 'open' : ''}`} aria-label="Navigacija">
      <div class="side-head">
        <div class="brand"><span class="brand-mark"><Icon name="tree" size={16} /></span> AI Šumar</div>
        <button class="icon-btn only-mobile" aria-label="Zatvori meni" onClick={() => (drawerOpen.value = false)}><Icon name="x" /></button>
      </div>

      <button class="btn primary block" onClick={() => newConversation(f === 'all' ? null : f)}>
        <Icon name="plus" /> Novi razgovor <kbd>Ctrl K</kbd>
      </button>

      <div class="side-search">
        <Icon name="search" size={16} />
        <input placeholder="Pretraži razgovore" value={q.value} onInput={(e) => (q.value = e.currentTarget.value)} aria-label="Pretraži razgovore" />
      </div>

      <div class="side-section">
        <div class="side-label">
          Projekti
          <button class="icon-btn sm" title="Novi projekat" onClick={() => { editingProjectId.value = 'new'; go('project'); }}><Icon name="plus" size={16} /></button>
        </div>
        <button class={`nav-item ${f === 'all' ? 'on' : ''}`} onClick={() => (filterProjectId.value = 'all')}>
          <Icon name="sparkle" size={16} /> Svi razgovori
        </button>
        {projects.value.map((p) => (
          <div key={p.id} class={`nav-item row ${f === p.id ? 'on' : ''}`}>
            <button class="grow" onClick={() => (filterProjectId.value = p.id)}>
              <Icon name="folder" size={16} /> <span class="ellipsis">{p.name}</span>
            </button>
            <button class="icon-btn sm ghost-hover" title="Uredi projekat" onClick={() => { editingProjectId.value = p.id; go('project'); }}><Icon name="edit" size={14} /></button>
          </div>
        ))}
      </div>

      <nav class="convs" aria-label="Historija razgovora">
        {list.length === 0 && <p class="muted small pad">{term ? 'Nema rezultata.' : 'Još nema razgovora.'}</p>}
        {group(list).map(([label, items]) => (
          <div key={label} class="conv-group">
            <div class="side-label">{label}</div>
            {items.map((c) => (
              <div key={c.id} class={`conv ${c.id === activeConvId.value && view.value === 'chat' ? 'on' : ''}`}>
                <button class="conv-title" onClick={() => openConversation(c.id)} title={c.title}>{c.title}</button>
                <div class="conv-actions">
                  <button class="icon-btn sm" title={c.pinned ? 'Otkači' : 'Zakači'} onClick={() => togglePin(c.id)}><Icon name="pin" size={14} /></button>
                  <button class="icon-btn sm danger" title="Obriši" onClick={() => confirm('Obrisati razgovor?') && deleteConversation(c.id)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div class="side-foot">
        <button class={`nav-item ${view.value === 'library' ? 'on' : ''}`} onClick={() => go('library')}><Icon name="book" size={16} /> Biblioteka propisa</button>
        <button class={`nav-item ${view.value === 'settings' ? 'on' : ''}`} onClick={() => go('settings')}><Icon name="settings" size={16} /> Postavke</button>
      </div>
    </aside>
  );
}
