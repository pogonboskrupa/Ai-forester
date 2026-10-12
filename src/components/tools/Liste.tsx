import { useEffect, useState } from 'preact/hooks';
import { CHECKLISTS } from '../../tools/checklists';
import { Cite } from '../Cite';
import { Icon } from '../Icon';

const KEY = 'ai-sumar-liste';
type State = Record<string, number[]>;

function loadState(): State {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as State) ?? {};
  } catch {
    return {};
  }
}

/** Kontrolne liste za teren; označene stavke ostaju zapamćene na uređaju. */
export function Liste() {
  const [listId, setListId] = useState(CHECKLISTS[0]!.id);
  const [state, setState] = useState<State>(loadState);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* bez trajnog čuvanja */
    }
  }, [state]);
  const list = CHECKLISTS.find((l) => l.id === listId)!;
  const done = new Set(state[list.id] ?? []);
  const toggle = (i: number) => setState({ ...state, [list.id]: done.has(i) ? [...done].filter((x) => x !== i) : [...done, i] });
  return (
    <section class="card tool">
      <h2>Kontrolne liste</h2>
      <div class="row gap wrap">
        {CHECKLISTS.map((l) => <button key={l.id} class={`chip ${l.id === listId ? 'on' : ''}`} onClick={() => setListId(l.id)}>{l.title}</button>)}
      </div>
      <p class="muted small">{list.who} · {done.size}/{list.items.length} provjereno</p>
      <div class="progress"><span style={{ width: `${(done.size / list.items.length) * 100}%` }} /></div>
      <ul class="checklist">
        {list.items.map((it, i) => (
          <li key={i} class={done.has(i) ? 'done' : ''}>
            <label><input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} /> <span>{it.text}</span></label>
            {it.source && <Cite id={it.source} />}
          </li>
        ))}
      </ul>
      <button class="btn ghost sm" onClick={() => setState({ ...state, [list.id]: [] })}><Icon name="refresh" size={14} /> Poništi listu</button>
    </section>
  );
}
