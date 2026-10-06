import { useState } from 'preact/hooks';
import { citedNumbers, renderMarkdown } from '../md';
import { isConfigured } from '../settings';
import { articleById, editLastQuestion, openSourceId, regenerate, toast } from '../store';
import type { Article, Msg } from '../types';
import { Icon } from './Icon';

function Chip({ a, n }: { a: Article; n: number }) {
  return (
    <button class={`source-chip ${openSourceId.value === a.id ? 'on' : ''}`} onClick={() => (openSourceId.value = a.id)} title={a.lawTitle}>
      <span class="n">{n}</span>
      <span class="ellipsis">{a.lawTitle.replace(/\s*\((USK|FBiH|BiH)\)$/, '')}</span>
      <span class="art">čl. {a.number}</span>
    </button>
  );
}

/** Citirani izvori su vidljivi; ostali pronađeni (ali necitirani) su sklopljeni. */
function SourceChips({ ids, text }: { ids: string[]; text: string }) {
  const [showAll, setShowAll] = useState(false);
  const src = ids.map((id, i) => ({ a: articleById(id), n: i + 1 })).filter((x): x is { a: Article; n: number } => !!x.a);
  if (!src.length) return null;
  const cited = citedNumbers(text);
  const main = src.filter((x) => cited.has(x.n));
  const rest = src.filter((x) => !cited.has(x.n));
  return (
    <div class="sources">
      {main.map((x) => <Chip key={x.a.id} {...x} />)}
      {showAll && rest.map((x) => <Chip key={x.a.id} {...x} />)}
      {rest.length > 0 && (
        <button class="source-more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Sakrij' : main.length ? `+${rest.length} pretraženih` : `Pretraženi izvori (${rest.length})`}
        </button>
      )}
    </div>
  );
}

export function UserMessage({ m, last }: { m: Msg; last: boolean }) {
  return (
    <div class="msg-user">
      <div class="bubble">{m.text}</div>
      {last && (
        <button class="icon-btn sm hover-reveal" title="Uredi pitanje" onClick={editLastQuestion}><Icon name="edit" size={14} /></button>
      )}
    </div>
  );
}

export function AssistantMessage({ m, last, streamingText }: { m: Msg | null; last: boolean; streamingText?: string }) {
  const text = streamingText ?? m?.text ?? '';
  const ids = m?.sourceIds ?? [];
  const onClick = (e: MouseEvent) => {
    const cite = (e.target as HTMLElement).closest<HTMLElement>('[data-cite]');
    if (!cite) return;
    const id = ids[Number(cite.dataset.cite) - 1];
    if (id) openSourceId.value = id;
  };

  if (m?.error) {
    return (
      <div class="msg-ai">
        <div class="alert">
          <Icon name="alert" />
          <div>
            <strong>Odgovor nije stigao.</strong>
            <p>{m.text}</p>
          </div>
        </div>
        {last && <button class="btn sm" onClick={() => void regenerate()}><Icon name="refresh" size={14} /> Pokušaj ponovo</button>}
      </div>
    );
  }

  return (
    <div class="msg-ai">
      {streamingText !== undefined && !streamingText ? (
        <div class="typing" aria-label="Pišem odgovor"><span /><span /><span /></div>
      ) : (
        <div class={`md ${streamingText !== undefined ? 'caret' : ''}`} onClick={onClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(text, ids.length) }} />
      )}
      {m && <SourceChips ids={ids} text={text} />}
      {m && last && (m.kind === 'faq' || m.kind === 'search') && isConfigured() && (
        <button class="btn sm ask-ai" onClick={() => void regenerate({ forceAi: true })}><Icon name="sparkle" size={14} /> Pitaj AI za detaljniji odgovor</button>
      )}
      {m && (
        <div class="msg-actions">
          <button class="icon-btn sm" title="Kopiraj" onClick={() => void navigator.clipboard?.writeText(text).then(() => toast('Kopirano'))}><Icon name="copy" size={14} /></button>
          {last && m.kind !== 'faq' && m.kind !== 'search' && <button class="icon-btn sm" title="Generiši ponovo" onClick={() => void regenerate()}><Icon name="refresh" size={14} /></button>}
          {m.kind === 'faq' && (
            <span class="pill ok" title={m.model?.includes('nacrt') ? 'Pripremljen odgovor još nije stručno pregledan – provjerite citirane članove' : 'Stručno pregledan odgovor'}>
              {m.model ?? 'Pripremljen odgovor'}
            </span>
          )}
          {m.kind === 'search' && <span class="pill" title="Izdvojeno iz propisa bez AI-ja">Bez AI</span>}
          {m.kind !== 'faq' && m.kind !== 'search' && m.model && <span class="muted xs">{m.model}{m.stopped ? ' · zaustavljeno' : ''}</span>}
        </div>
      )}
    </div>
  );
}
