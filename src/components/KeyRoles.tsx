import { useState } from 'preact/hooks';
import { articleById, openSourceId } from '../store';
import { emphasize } from '../summary';
import type { KeyRole, KeyRoleDuty, Procedure } from '../procedure';
import { Icon } from './Icon';

const ACT_LABEL: Record<string, string> = {
  'spd-opis-poslova-2026': 'Opis poslova',
  'spd-sumarska-procedura': 'Procedura',
  'spd-pravilnik-o-radu-2026': 'Pravilnik o radu',
  'spd-zastita-na-radu': 'Zaštita na radu',
  'spd-statut-2012': 'Statut',
  'spd-disciplinska-2012': 'Disciplinska',
  'spd-materijalna-disciplinska-2011': 'Mat. odgovornost',
  'spd-poslovnik-uprave': 'Poslovnik Uprave',
  'spd-koeficijenti-2026': 'Koeficijenti',
  'fbih-zakon-o-javnim-preduzecima': 'Zakon o jav. preduzećima',
};

export function Em({ text }: { text: string }) {
  return <>{emphasize(text, false).map((e, i) => (e.kind ? <strong key={i} class="em num">{e.text}</strong> : e.text))}</>;
}

function List({ title, items, icon }: { title: string; items: string[]; icon: Parameters<typeof Icon>[0]['name'] }) {
  if (!items.length) return null;
  return (
    <section class="proc-card kr-block">
      <h3><Icon name={icon} size={16} /> {title}</h3>
      <ul class="proc-list">{items.map((t, i) => <li key={i}><Em text={t} /></li>)}</ul>
    </section>
  );
}


export function Facts({ facts }: { facts: NonNullable<KeyRole['facts']> }) {
  return (
    <dl class="kr-facts">
      {facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
    </dl>
  );
}

function Chain({ chain }: { chain: NonNullable<KeyRole['chain']> }) {
  return (
    <section class="proc-card kr-block">
      <h3><Icon name="tree" size={16} /> Linija odgovornosti</h3>
      <ol class="kr-chain">{chain.map((c, i) => <li key={i} class={c.on ? 'on' : ''}>{c.t}</li>)}</ol>
    </section>
  );
}

function DutyItem({ d, n }: { d: KeyRoleDuty; n: number }) {
  return (
    <li>
      <span class="kr-n">{n}</span>
      <div>
        <strong class="kr-t">{d.t}</strong>
        <p><Em text={d.d} /></p>
        <div class="kr-refs">
          {d.refs.filter((x) => articleById(`${x.act}#${x.n}`)).map((x) => (
            <button key={`${x.act}#${x.n}`} class="ref-link" onClick={() => (openSourceId.value = `${x.act}#${x.n}`)}>{ACT_LABEL[x.act] ?? x.act} · čl. {x.n}</button>
          ))}
        </div>
      </div>
    </li>
  );
}

/** Zadaci grupisani po `cat` (ako postoji), sa filterom; redni brojevi ostaju stalni pri filtriranju. */
function Duties({ r }: { r: KeyRole }) {
  const [cat, setCat] = useState('');
  const cats = [...new Set(r.duties.map((d) => d.cat).filter((c): c is string => !!c))];
  const numbered = r.duties.map((d, i) => ({ d, n: i + 1 }));
  const groups = cats.length ? cats.map((c) => ({ c, items: numbered.filter((x) => x.d.cat === c) })) : [{ c: '', items: numbered }];
  const shown = groups.filter((g) => !cat || g.c === cat);
  return (
    <section class="proc-card kr-block">
      <h3><Icon name="check" size={16} /> Zadaci i obaveze <span class="muted xs">({r.duties.length})</span></h3>
      {cats.length > 1 && (
        <div class="kr-cats" role="group" aria-label="Grupa zadataka">
          <button class={!cat ? 'on' : ''} aria-pressed={!cat} onClick={() => setCat('')}>Sve</button>
          {cats.map((c) => <button key={c} class={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>)}
        </div>
      )}
      {shown.map((g) => (
        <div key={g.c} class="kr-group-block">
          {g.c && <h4 class="kr-cat">{g.c} <span class="muted xs">{g.items.length}</span></h4>}
          <ol class="kr-duties">{g.items.map((x) => <DutyItem key={x.n} d={x.d} n={x.n} />)}</ol>
        </div>
      ))}
    </section>
  );
}

export function RoleDetail({ r }: { r: KeyRole }) {
  return (
    <div class="proc-stack kr-detail">
      <header class="kr-head">
        <span class="kr-group">{r.group}</span>
        <h2>{r.name}</h2>
        <p>{r.purpose}</p>
        {r.requirements.length > 0 && <div class="kr-req">{r.requirements.map((q, i) => <span key={i} class="pill">{q}</span>)}</div>}
      </header>
      {r.facts && r.facts.length > 0 && <Facts facts={r.facts} />}
      {r.chain && r.chain.length > 0 && <Chain chain={r.chain} />}
      <Duties r={r} />
      {r.limits && r.limits.length > 0 && (
        <section class="proc-card kr-block kr-limits">
          <h3><Icon name="alert" size={16} /> Ovlasti i ograničenja <span class="muted xs">(šta ne smije sam)</span></h3>
          <ul class="proc-list">{r.limits.map((t, i) => <li key={i}><Em text={t} /></li>)}</ul>
        </section>
      )}
      <List title="Knjige, obrasci i evidencije" items={r.documents} icon="folder" />
      <List title="Rokovi" items={r.deadlines} icon="calendar" />
      <List title="Odgovornost" items={r.responsibility} icon="scale" />
      <List title="Saradnja i izvještavanje" items={r.collaborates} icon="send" />
      {r.caution && <p class="notice"><Icon name="alert" size={14} /> {r.caution}</p>}
    </div>
  );
}

/** Ključna radna mjesta: šta tačno radi tehnolog, upravnik, pomoćnik, evidentičar, primač, otpremač… */
export function KeyRoles({ p }: { p: Procedure }) {
  const roles = (p.keyRoles ?? []).filter((r) => r.tier !== 'rukovodstvo'); // rukovodstvo ima vlastitu cjelinu
  const [id, setId] = useState(roles[0]?.id ?? '');
  const role = roles.find((r) => r.id === id) ?? roles[0];
  if (!role) return <p class="muted">Opisi radnih mjesta nisu dostupni u ovoj verziji internih akata.</p>;
  return (
    <div class="kr">
      <nav class="kr-nav" aria-label="Radna mjesta">
        {roles.map((r) => (
          <button key={r.id} class={r.id === role.id ? 'on' : ''} onClick={() => setId(r.id)}>
            <strong>{r.name}</strong>
            <small>{r.group} · {r.duties.length} zadataka</small>
          </button>
        ))}
      </nav>
      <RoleDetail r={role} />
    </div>
  );
}
