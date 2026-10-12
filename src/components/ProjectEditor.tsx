import { useState } from 'preact/hooks';
import { deleteProject, drawerOpen, editingProjectId, laws, newConversation, projectOf, saveProject, toast, view } from '../store';
import type { Level } from '../types';
import { Icon } from './Icon';

const LEVEL_ORDER: Record<Level, number> = { USK: 0, FBiH: 1, BiH: 2 };

export function ProjectEditor() {
  const id = editingProjectId.value;
  const existing = id && id !== 'new' ? projectOf(id) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [lawIds, setLawIds] = useState<string[]>(existing?.lawIds ?? []);
  const topics = [...new Set(laws.value.map((l) => l.topic ?? 'Šumarstvo'))];

  const toggle = (lid: string) => setLawIds((s) => (s.includes(lid) ? s.filter((x) => x !== lid) : [...s, lid]));
  const close = () => {
    editingProjectId.value = null;
    view.value = 'chat';
  };
  const save = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    const pid = saveProject({ id: existing?.id, name: name.trim(), description, instructions, lawIds });
    toast(existing ? 'Projekat sačuvan' : 'Projekat kreiran');
    close();
    if (!existing) newConversation(pid);
  };

  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <span class="topbar-title">{existing ? 'Uredi projekat' : 'Novi projekat'}</span>
      </header>
      <form class="page-inner narrow" onSubmit={save}>
        <p class="muted">Projekat je tema s vlastitim izborom propisa i uputama. Razgovori u projektu pretražuju samo odabrane propise.</p>
        <label class="field">Naziv<input value={name} required onInput={(e) => setName(e.currentTarget.value)} placeholder="npr. Doznaka i sječa" /></label>
        <label class="field">Opis<input value={description} onInput={(e) => setDescription(e.currentTarget.value)} placeholder="Kratko, za vas" /></label>
        <label class="field">Upute za AI
          <textarea rows={3} value={instructions} onInput={(e) => setInstructions(e.currentTarget.value)} placeholder="npr. Odgovaraj iz perspektive privatnog šumoposjednika; naglasi rokove i nadležni organ." />
        </label>
        <div class="field">
          <div class="row between">
            <span>Izvori</span>
            <span class="muted small">{lawIds.length ? `${lawIds.length} odabrano` : 'Ništa odabrano = svi propisi'}</span>
          </div>
          {topics.map((tp) => {
            const group = laws.value.filter((l) => (l.topic ?? 'Šumarstvo') === tp).sort((x, y) => LEVEL_ORDER[x.level] - LEVEL_ORDER[y.level]);
            const ids = group.map((l) => l.id);
            const all = ids.every((i) => lawIds.includes(i));
            return (
              <fieldset key={tp} class="law-group">
                <legend>
                  {tp}
                  <button type="button" class="link small" onClick={() => setLawIds((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]))}>
                    {all ? 'poništi' : 'odaberi sve'}
                  </button>
                </legend>
                {group.map((l) => (
                  <label class="check" key={l.id}>
                    <input type="checkbox" checked={lawIds.includes(l.id)} onChange={() => toggle(l.id)} />
                    <span class={`badge lvl-${l.level}`}>{l.level}</span>
                    <span class="grow">{l.title}</span>
                    <span class="muted xs">{l.articleCount}</span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
        <div class="row gap sticky-actions">
          <button class="btn primary">Sačuvaj</button>
          <button type="button" class="btn" onClick={close}>Odustani</button>
          {existing && (
            <button type="button" class="btn danger" onClick={() => { if (confirm('Obrisati projekat? Razgovori ostaju.')) { deleteProject(existing.id); toast('Projekat obrisan'); close(); } }}>
              <Icon name="trash" size={14} /> Obriši
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
