import { useState } from 'preact/hooks';
import { leadershipRoles, type KeyRole, type Procedure } from '../procedure';
import { Icon } from './Icon';
import { RoleDetail } from './KeyRoles';

const TAGLINE: Record<string, string> = {
  'izvrsni-direktor-sumarstvo': 'Član Uprave · oblast šumarstva',
  'upravnik-sumarije': 'Rukovodilac šumarije / pogona',
};
const SHORT: Record<string, string> = {
  'izvrsni-direktor-sumarstvo': 'Izvršni direktor za šumarstvo',
  'upravnik-sumarije': 'Upravnik šumarije',
};

const fact = (r: KeyRole, k: string) => r.facts?.find((f) => f.k === k)?.v ?? '—';

function Compare({ a, b }: { a: KeyRole; b: KeyRole }) {
  const keys = (a.facts ?? []).map((f) => f.k).filter((k) => b.facts?.some((f) => f.k === k));
  const rows: [string, string, string][] = [
    ...keys.map((k): [string, string, string] => [k, fact(a, k), fact(b, k)]),
    ['Zadataka', String(a.duties.length), String(b.duties.length)],
    ['Ograničenja ovlasti', String(a.limits?.length ?? 0), String(b.limits?.length ?? 0)],
    ['Rokova', String(a.deadlines.length), String(b.deadlines.length)],
  ];
  return (
    <section class="proc-card kr-block">
      <h3><Icon name="scale" size={16} /> Poređenje</h3>
      <div class="table-wrap">
        <table class="kr-compare">
          <thead><tr><th scope="col"></th><th scope="col">{SHORT[a.id] ?? a.name}</th><th scope="col">{SHORT[b.id] ?? b.name}</th></tr></thead>
          <tbody>{rows.map(([k, x, y]) => <tr key={k}><th scope="row">{k}</th><td>{x}</td><td>{y}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

/** Rukovodstvo: izvršni direktor za šumarstvo i upravnik šumarije – sve obaveze, ovlasti i ograničenja. */
export function Leadership({ p }: { p: Procedure }) {
  const roles = leadershipRoles(p);
  const [id, setId] = useState(roles[0]?.id ?? '');
  const role = roles.find((r) => r.id === id) ?? roles[0];
  if (!role) return <p class="muted">Opisi rukovodećih mjesta nisu dostupni u ovoj verziji internih akata.</p>;
  return (
    <div class="lead">
      <div class="lead-switch" role="tablist" aria-label="Rukovodeća mjesta">
        {roles.map((r, i) => (
          <button key={r.id} role="tab" aria-selected={r.id === role.id} class={r.id === role.id ? 'on' : ''} onClick={() => setId(r.id)}>
            <span class="lead-ico"><Icon name={i === 0 ? 'scale' : 'tree'} size={20} /></span>
            <span class="lead-txt">
              <strong>{SHORT[r.id] ?? r.name}</strong>
              <small>{TAGLINE[r.id] ?? r.group}</small>
            </span>
            <span class="lead-stats"><b>{r.duties.length}</b> zadataka</span>
          </button>
        ))}
      </div>
      <RoleDetail r={role} />
      {roles.length === 2 && <Compare a={roles[0]!} b={roles[1]!} />}
    </div>
  );
}
