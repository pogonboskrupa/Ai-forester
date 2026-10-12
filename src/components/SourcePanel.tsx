import { articleById, lawById, libraryFocus, openSourceId, toast, view } from '../store';
import { Icon } from './Icon';

export function SourcePanel() {
  const a = openSourceId.value ? articleById(openSourceId.value) : undefined;
  if (!a) return null;
  const law = lawById(a.lawId);
  const close = () => (openSourceId.value = null);
  return (
    <aside class="source-panel" aria-label="Izvor">
      <header>
        <div>
          <span class={`badge lvl-${a.level}`}>{a.level}</span>
          <h3>Član {a.number}{a.heading ? ` – ${a.heading}` : ''}</h3>
          <p class="muted small">{a.lawTitle}</p>
          <p class="muted xs">{a.gazette}</p>
        </div>
        <button class="icon-btn" aria-label="Zatvori" onClick={close}><Icon name="x" /></button>
      </header>
      {a.amendedBy?.length ? (
        <div class="amend-note">
          <Icon name="alert" size={16} />
          <div>
            <strong>Ovaj član je izmijenjen.</strong>
            {a.amendedBy.map((id) => {
              const am = articleById(id);
              return am ? (
                <button key={id} class="link small" onClick={() => (openSourceId.value = id)}>{am.lawTitle} ({am.gazette}), član {am.number}</button>
              ) : null;
            })}
          </div>
        </div>
      ) : null}
      <div class="source-body">{a.text}</div>
      <footer>
        <button class="btn sm" onClick={() => void navigator.clipboard?.writeText(`${a.lawTitle}, član ${a.number}\n\n${a.text}`).then(() => toast('Član kopiran'))}>
          <Icon name="copy" size={14} /> Kopiraj
        </button>
        <button class="btn sm" onClick={() => { libraryFocus.value = { lawId: a.lawId, articleId: a.id }; view.value = 'library'; close(); }}>
          <Icon name="book" size={14} /> Otvori propis
        </button>
        {law?.sourceUrl && (
          <a class="btn sm" href={law.sourceUrl} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} /> Izvor</a>
        )}
      </footer>
    </aside>
  );
}
