import { useMemo, useState } from 'preact/hooks';
import { renderMarkdown } from '../md';
import { PROCEDURE_LAW_ID, nextDated, procedure, type Procedure, type ProcedureDoc } from '../procedure';
import { articles, drawerOpen, openSourceId } from '../store';
import { fold } from '../text';
import { Icon, type IconName } from './Icon';
import { OfficeBody } from './Office';
import { KeyRoles } from './KeyRoles';

type Tab = 'pregled' | 'dokumenti' | 'tokovi' | 'uloge' | 'radna' | 'rokovi' | 'obrasci' | 'sifre' | 'tekst' | 'kancelarija';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'pregled', label: 'Pregled', icon: 'book' },
  { id: 'dokumenti', label: 'Dokumenti', icon: 'folder' },
  { id: 'tokovi', label: 'Tokovi', icon: 'send' },
  { id: 'uloge', label: 'Ko šta radi', icon: 'check' },
  { id: 'radna', label: 'Radna mjesta', icon: 'tree' },
  { id: 'rokovi', label: 'Rokovi', icon: 'calendar' },
  { id: 'obrasci', label: 'Obrasci', icon: 'edit' },
  { id: 'sifre', label: 'Šifre i boje', icon: 'scale' },
  { id: 'tekst', label: 'Cijeli tekst', icon: 'search' },
  { id: 'kancelarija', label: 'Kancelarijsko', icon: 'folder' },
];

const sectionArticles = () => articles.value.filter((a) => a.lawId === PROCEDURE_LAW_ID);
const findSection = (title?: string) => {
  if (!title) return undefined;
  const t = fold(title.trim());
  const all = sectionArticles();
  return all.find((x) => fold(x.heading?.trim() ?? '') === t) ?? all.find((x) => fold(x.heading ?? '').startsWith(t));
};
const openSection = (title?: string) => {
  const a = findSection(title);
  if (a) openSourceId.value = a.id;
};

function Overview({ p, go }: { p: Procedure; go: (t: Tab) => void }) {
  const next = nextDated(p);
  const days = next ? Math.round((next.date.getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : 0;
  return (
    <div class="proc-stack">
      {next && (
        <button class="proc-next" onClick={() => go('rokovi')}>
          <span class="proc-next-date"><strong>{next.date.getDate()}.{next.date.getMonth() + 1}.</strong><small>za {days} d.</small></span>
          <span><small class="muted">Sljedeći godišnji rok</small><br />{next.what}<br /><small class="muted">{next.who}</small></span>
          <Icon name="chevron" size={16} />
        </button>
      )}
      <section class="proc-card">
        <h3><Icon name="check" size={16} /> Zlatna pravila dokumentacije</h3>
        <ol class="proc-rules">{p.rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
      </section>
      <section class="proc-card">
        <h3><Icon name="scale" size={16} /> Pravni osnov naveden u proceduri</h3>
        <ul class="proc-list">{p.legalBasis.map((l, i) => <li key={i}>{l}</li>)}</ul>
        {p.legalNote && <p class="notice"><Icon name="alert" size={14} /> {p.legalNote}</p>}
      </section>
    </div>
  );
}

function DocCard({ d }: { d: ProcedureDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <article class={`proc-doc ${open ? 'open' : ''}`}>
      <button class="proc-doc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span class="proc-code">{d.code}</span>
        <span class="proc-doc-title"><strong>{d.name}</strong><small class="muted">{d.group}</small></span>
        <Icon name="chevron" size={14} class="chev" />
      </button>
      <dl class="proc-meta">
        <div><dt>Vodi / zadužuje</dt><dd>{d.keeper}</dd></div>
        <div><dt>Koriste</dt><dd>{d.users}</dd></div>
        {d.deadline && <div><dt>Rok</dt><dd><span class="proc-pill">{d.deadline}</span></dd></div>}
      </dl>
      {open && (
        <div class="proc-doc-body">
          <ul class="proc-list">{d.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
          {findSection(d.section) && <button class="btn sm" onClick={() => openSection(d.section)}><Icon name="book" size={14} /> Tekst procedure</button>}
        </div>
      )}
    </article>
  );
}

function Documents({ p }: { p: Procedure }) {
  const [term, setTerm] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const groups = [...new Set(p.documents.map((d) => d.group))];
  const t = fold(term);
  const shown = p.documents.filter((d) => (!group || d.group === group) && (!t || fold(`${d.code} ${d.name} ${d.group} ${d.keeper} ${d.users} ${d.deadline ?? ''} ${d.rules.join(' ')}`).includes(t)));
  return (
    <div class="proc-stack">
      <div class="searchbox"><Icon name="search" size={16} /><input placeholder="Traži dokument, šifru ili pravilo (npr. RSZT, primka, 31.12.)" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
      <div class="row gap wrap">
        <button class={`chip ${!group ? 'on' : ''}`} onClick={() => setGroup(null)}>Sve ({p.documents.length})</button>
        {groups.map((g) => <button key={g} class={`chip ${group === g ? 'on' : ''}`} onClick={() => setGroup(group === g ? null : g)}>{g}</button>)}
      </div>
      <div class="proc-grid">{shown.map((d) => <DocCard key={`${d.group}|${d.code}|${d.name}`} d={d} />)}</div>
      {!shown.length && <p class="muted">Nema dokumenata za ovaj upit.</p>}
    </div>
  );
}

function Flows({ p }: { p: Procedure }) {
  const [id, setId] = useState(p.flows[0]?.id);
  const flow = p.flows.find((f) => f.id === id) ?? p.flows[0];
  if (!flow) return null;
  return (
    <div class="proc-stack">
      <div class="row gap wrap">{p.flows.map((f) => <button key={f.id} class={`chip ${f.id === flow.id ? 'on' : ''}`} onClick={() => setId(f.id)}>{f.title}</button>)}</div>
      <ol class="proc-steps">
        {flow.steps.map((s, i) => (
          <li key={i}>
            <span class="proc-step-n">{i + 1}</span>
            <div><strong>{s.who}</strong><p>{s.what}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Roles({ p }: { p: Procedure }) {
  const [id, setId] = useState(p.roles[0]?.id);
  const role = p.roles.find((r) => r.id === id) ?? p.roles[0];
  if (!role) return null;
  return (
    <div class="proc-roles">
      <nav class="proc-role-list" aria-label="Uloge">
        {p.roles.map((r) => <button key={r.id} class={r.id === role.id ? 'on' : ''} onClick={() => setId(r.id)}>{r.name}<small>{r.duties.length}</small></button>)}
      </nav>
      <section class="proc-card">
        <h3>{role.name}</h3>
        <ul class="proc-duties">{role.duties.map((d, i) => <li key={i}><Icon name="check" size={14} /> <span>{d}</span></li>)}</ul>
      </section>
    </div>
  );
}

const KIND_LABEL = { periodično: 'Redovno', godišnje: 'Godišnji rokovi', događaj: 'Rokovi od događaja' } as const;

function Deadlines({ p }: { p: Procedure }) {
  return (
    <div class="proc-stack">
      {(['periodično', 'godišnje', 'događaj'] as const).map((k) => (
        <section key={k} class="proc-card">
          <h3>{KIND_LABEL[k]}</h3>
          <ol class="proc-timeline">
            {p.deadlines.filter((d) => d.kind === k).map((d, i) => (
              <li key={i}><span class="proc-when">{d.when}</span><div><p>{d.what}</p><small class="muted">{d.who}</small></div></li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Forms({ p }: { p: Procedure }) {
  return (
    <div class="proc-forms">
      {p.forms.map((f) => (
        <div key={`${f.code}|${f.name}`} class="proc-form">
          <span class="proc-form-code">{f.code}</span>
          <div class="proc-form-main">
            <strong>{f.name}</strong>
            <div class="proc-form-meta"><span><Icon name="edit" size={12} /> {f.who}</span><span><Icon name="send" size={12} /> {f.to}</span></div>
          </div>
          <span class="proc-pill">{f.freq}</span>
        </div>
      ))}
    </div>
  );
}

function Codes({ p }: { p: Procedure }) {
  return (
    <div class="proc-grid">
      {p.codes.map((t) => (
        <section key={t.title} class="proc-card">
          <h3>{t.title}</h3>
          <table class="proc-table">
            <tbody>
              {t.rows.map((r) => (
                <tr key={`${r.code}|${r.label}`} class={r.code.length > 8 ? 'long' : undefined}>
                  <td>{r.color ? <span class="proc-swatch" style={{ background: r.color }} /> : null}<strong>{r.code}</strong></td>
                  <td>{r.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function FullText() {
  const [term, setTerm] = useState('');
  const secs = sectionArticles();
  const t = fold(term);
  const shown = t.length > 1 ? secs.filter((a) => fold(`${a.heading} ${a.text}`).includes(t)) : secs;
  return (
    <div class="proc-stack">
      <div class="searchbox"><Icon name="search" size={16} /><input placeholder="Pretraži tekst procedure…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
      <p class="muted xs">{shown.length} od {secs.length} odjeljaka</p>
      <div class="articles">
        {shown.map((a) => (
          <details key={a.id} class="article">
            <summary><span class="art-no">{a.number}</span><span class="grow">{a.heading}</span><Icon name="chevron" size={14} class="chev" /></summary>
            <div class="article-body"><div class="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.text.replace(/\n(?=\S)/g, '\n\n')) }} /></div>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Odjeljak "Šumarska procedura": pregled internog uputstva o šumarskoj dokumentaciji. */
export function ProcedureView() {
  const p = procedure.value;
  const [tab, setTab] = useState<Tab>('pregled');
  const stats = useMemo(() => (p ? [
    { n: p.documents.length, label: 'dokumenata i evidencija', t: 'dokumenti' as Tab },
    { n: p.forms.length, label: 'obrazaca', t: 'obrasci' as Tab },
    { n: p.roles.length, label: 'uloga', t: 'uloge' as Tab },
    { n: p.deadlines.length, label: 'rokova', t: 'rokovi' as Tab },
  ] : []), [p]);
  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <span class="topbar-title">Šumarska procedura</span>
      </header>
      <div class="page-inner">
        {!p ? (
          <p class="muted">Procedura je dio internih akata ŠPD-a. Otključajte ih u Postavkama → Interni akti ŠPD.</p>
        ) : (
          <>
            <div class="proc-hero">
              <div class="proc-hero-top">
                <span class="proc-hero-icon"><Icon name="tree" size={22} /></span>
                <div>
                  <span class="proc-eyebrow">Interni akt ŠPD · obavezan za sve zaposlenike</span>
                  <h1>{p.title}</h1>
                  <p>{p.subtitle}</p>
                </div>
              </div>
              <p class="proc-purpose">{p.purpose}</p>
              <div class="proc-badges"><span>Revizija {p.revision}</span><span>{p.pages} strana</span><span>Sve poslovne jedinice i direkcija</span></div>
              <div class="proc-stats">
                {stats.map((s) => <button key={s.label} onClick={() => setTab(s.t)}><strong>{s.n}</strong><small>{s.label}</small></button>)}
              </div>
            </div>
            <div class="segmented proc-tabs" role="tablist">
              {TABS.map((x) => <button key={x.id} role="tab" aria-selected={tab === x.id} class={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}><Icon name={x.icon} size={14} /> {x.label}</button>)}
            </div>
            {tab === 'pregled' && <Overview p={p} go={setTab} />}
            {tab === 'dokumenti' && <Documents p={p} />}
            {tab === 'tokovi' && <Flows p={p} />}
            {tab === 'uloge' && <Roles p={p} />}
            {tab === 'radna' && <KeyRoles p={p} />}
            {tab === 'rokovi' && <Deadlines p={p} />}
            {tab === 'obrasci' && <Forms p={p} />}
            {tab === 'sifre' && <Codes p={p} />}
            {tab === 'tekst' && <FullText />}
            {tab === 'kancelarija' && <OfficeBody nested />}
          </>
        )}
      </div>
    </section>
  );
}
