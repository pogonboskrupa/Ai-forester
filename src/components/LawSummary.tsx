import { articleById, openSourceId } from '../store';
import { linkRefs } from '../summary';
import type { LawInfo } from '../types';
import { Icon } from './Icon';

function Line({ text, lawId }: { text: string; lawId: string }) {
  return (
    <>
      {linkRefs(text, lawId, (id) => !!articleById(id)).map((p, i) =>
        typeof p === 'string' ? p : (
          <button key={i} class="ref-link" onClick={() => (openSourceId.value = p.id)}>{p.label}</button>
        ),
      )}
    </>
  );
}

function Block({ title, items, lawId }: { title: string; items?: string[]; lawId: string }) {
  if (!items?.length) return null;
  return (
    <div class="sum-block">
      <h3>{title}</h3>
      <ul>{items.map((t, i) => <li key={i}><Line text={t} lawId={lawId} /></li>)}</ul>
    </div>
  );
}

/** Rezime propisa: najbitnije stavke, šumarstvo i prerada drveta; brojevi članova otvaraju tekst člana. */
export function LawSummaryCard({ law }: { law: LawInfo }) {
  const s = law.summary;
  if (!s) return null;
  return (
    <details class="law-summary" open>
      <summary><Icon name="book" size={16} /> Rezime</summary>
      <p class="sum-overview"><Line text={s.overview} lawId={law.id} /></p>
      <Block title="Najbitnije" items={s.points} lawId={law.id} />
      <Block title="Za šumarstvo" items={s.forestry} lawId={law.id} />
      <Block title="Za promet i preradu drveta" items={s.wood} lawId={law.id} />
      {s.caution && <p class="notice"><Icon name="alert" size={14} /> {s.caution}</p>}
      <p class="muted xs">Rezime je pripremljen iz teksta propisa u bazi; za pravno obavezujuću radnju provjerite cijeli član.</p>
    </details>
  );
}
