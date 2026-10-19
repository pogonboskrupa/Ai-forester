import { useState } from 'preact/hooks';
import { articleById, openSourceId } from '../store';
import { emphasize } from '../summary';
import type { KeyRole, Procedure } from '../procedure';
import { Icon } from './Icon';

const ACT_LABEL: Record<string, string> = {
  'spd-opis-poslova-2026': 'Opis poslova',
  'spd-sumarska-procedura': 'Procedura',
  'spd-pravilnik-o-radu-2026': 'Pravilnik o radu',
  'spd-zastita-na-radu': 'Zaštita na radu',
  'spd-statut-2012': 'Statut',
  'spd-disciplinska-2012': 'Disciplinska',
  'spd-materijalna-disciplinska-2011': 'Mat. odgovornost',
};

function Em({ text }: { text: string }) {
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

function RoleDetail({ r }: { r: KeyRole }) {
  return (
    <div class="proc-stack kr-detail">
      <header class="kr-head">
        <span class="kr-group">{r.group}</span>
        <h2>{r.name}</h2>
        <p>{r.purpose}</p>
        {r.requirements.length > 0 && <div class="kr-req">{r.requirements.map((q, i) => <span key={i} class="pill">{q}</span>)}</div>}
      </header>
      <section class="proc-card kr-block">
        <h3><Icon name="check" size={16} /> Zadaci i obaveze <span class="muted xs">({r.duties.length})</span></h3>
        <ol class="kr-duties">
          {r.duties.map((d, i) => (
            <li key={i}>
              <span class="kr-n">{i + 1}</span>
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
          ))}
        </ol>
      </section>
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
  const roles = p.keyRoles ?? [];
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
