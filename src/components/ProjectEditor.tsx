import { useState } from 'preact/hooks';
import {
  deleteProject, editingProjectId, laws, newConversation, projectOf, saveProject, view,
} from '../store';
import type { Level } from '../types';

const TOPICS = ['Šumarstvo', 'Sjeme i rasadnici', 'Lovstvo', 'Zdravlje bilja'];
const LEVEL_ORDER: Record<Level, number> = { USK: 0, FBiH: 1, BiH: 2 };

export function ProjectEditor() {
  const id = editingProjectId.value;
  const existing = id && id !== 'new' ? projectOf(id) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [lawIds, setLawIds] = useState<string[]>(existing?.lawIds ?? []);

  const toggle = (lid: string) => setLawIds((s) => (s.includes(lid) ? s.filter((x) => x !== lid) : [...s, lid]));
  const close = () => { editingProjectId.value = null; view.value = 'chat'; };

  const save = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    const pid = saveProject({ id: existing?.id, name: name.trim(), description, instructions, lawIds });
    close();
    if (!existing) newConversation(pid);
  };

  return (
    <form class="panel" onSubmit={save}>
      <h2>{existing ? 'Uredi projekat' : 'Novi projekat'}</h2>
      <label>Naziv<input value={name} required onInput={(e) => setName(e.currentTarget.value)} placeholder="npr. Doznaka i sječa" /></label>
      <label>Opis<input value={description} onInput={(e) => setDescription(e.currentTarget.value)} /></label>
      <label>Upute za AI (opcionalno)
        <textarea rows={3} value={instructions} onInput={(e) => setInstructions(e.currentTarget.value)}
          placeholder="npr. Odgovaraj iz perspektive šumoposjednika; fokus na postupke i rokove." />
      </label>
      <fieldset>
        <legend>Izvori ({lawIds.length ? `${lawIds.length} odabrano` : 'prazno = svi propisi'})</legend>
        {laws.value.length === 0 && <p class="muted">Nema učitanih propisa.</p>}
        {TOPICS.map((tp) => {
          const group = laws.value
            .filter((l) => (l.topic ?? 'Šumarstvo') === tp)
            .sort((x, y) => LEVEL_ORDER[x.level] - LEVEL_ORDER[y.level]);
          if (!group.length) return null;
          const ids = group.map((l) => l.id);
          const all = ids.every((i) => lawIds.includes(i));
          return (
            <div key={tp}>
              <h4>
                {tp}{' '}
                <button type="button" class="chip" onClick={() => setLawIds((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]))}>
                  {all ? 'poništi sve' : 'odaberi sve'}
                </button>
              </h4>
              {group.map((l) => (
                <label class="check" key={l.id}>
                  <input type="checkbox" checked={lawIds.includes(l.id)} onChange={() => toggle(l.id)} />
                  <span><b>{l.level}</b> · {l.title} <small class="muted">({l.articleCount} čl.)</small></span>
                </label>
              ))}
            </div>
          );
        })}
      </fieldset>
      <div class="row">
        <button class="primary">Sačuvaj</button>
        <button type="button" onClick={close}>Odustani</button>
        {existing && (
          <button type="button" class="danger" onClick={() => { if (confirm('Obrisati projekat? Razgovori ostaju.')) { deleteProject(existing.id); close(); } }}>
            Obriši
          </button>
        )}
      </div>
    </form>
  );
}
