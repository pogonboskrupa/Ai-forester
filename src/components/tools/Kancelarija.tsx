import { useMemo, useState } from 'preact/hooks';
import { ORG } from '../../org';
import { faq, toast } from '../../store';
import {
  DIRECTIONS, STATUSES, TEMPLATES, bsDate, daysToDue, filterEntries, isOverdue, nextNumber,
  type Direction, type DocEntry, type EntryStatus, type LetterFields, type Template,
} from '../../tools/office';
import { Cite } from '../Cite';
import { Icon } from '../Icon';
import { FaqItem } from '../Library';
import { esc, exportCsv, printHtml, today, uid, useList } from './shared';

export const OFFICE_TOPIC = 'Kancelarijsko poslovanje';
const DIR_LABEL: Record<Direction, string> = { ulazni: 'Ulazni (zaprimljeni)', izlazni: 'Izlazni (poslani)', interni: 'Interni' };

export function Djelovodnik() {
  const [list, persist] = useList<DocEntry>('kanc-djelovodnik');
  const blank = (): DocEntry => ({ id: uid(), no: nextNumber(list, new Date().getFullYear()), date: today(), dir: 'ulazni', party: '', subject: '', cls: '', due: '', assignee: '', status: 'u radu', note: '' });
  const [cur, setCur] = useState<DocEntry>(blank);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<EntryStatus | 'sve'>('sve');
  const [dir, setDir] = useState<Direction | 'sve'>('sve');
  const [formOpen, setFormOpen] = useState(false);
  const set = <K extends keyof DocEntry>(k: K, v: DocEntry[K]) => setCur({ ...cur, [k]: v });
  const now = today();
  const shown = useMemo(() => filterEntries(list, term, status, dir).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no, 'bs', { numeric: true })), [list, term, status, dir]);
  const open = list.filter((e) => e.status === 'u radu').length;
  const late = list.filter((e) => isOverdue(e, now)).length;

  // Novi unos dobija sljedeći broj tek kad se lista učita (useList je asinkron).
  const isNew = !list.some((e) => e.id === cur.id);
  const showForm = formOpen || list.length === 0;
  const save = () => {
    if (!cur.subject.trim()) return toast('Upišite predmet akta', 'err');
    persist([cur, ...list.filter((x) => x.id !== cur.id)]);
    setCur({ ...blank(), no: nextNumber([cur, ...list], new Date().getFullYear()) });
    setFormOpen(false);
    toast('Akt zaveden');
  };
  const setStatusOf = (e: DocEntry, s: EntryStatus) => persist(list.map((x) => (x.id === e.id ? { ...x, status: s } : x)));
  const header = ['Broj', 'Datum', 'Vrsta', 'Pošiljalac/primalac', 'Predmet', 'Klasifikacija', 'Rok', 'Zaduženo', 'Status', 'Napomena'];
  const rows = (l: DocEntry[]) => l.map((e) => [e.no, bsDate(e.date), e.dir, e.party, e.subject, e.cls, bsDate(e.due), e.assignee, e.status, e.note]);

  const print = () => {
    const table = `<h1>Djelovodnik – ${esc(ORG.short)}</h1><p>Stanje na dan ${esc(bsDate(now))}</p><table><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${rows(shown).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    if (!printHtml('Djelovodnik', table, '@page{size:A4 landscape}')) toast('Preglednik je blokirao prozor za štampu', 'err');
  };

  return (
    <>
      <p class="muted small">Zavedite svaki zaprimljeni, poslani i interni akt: dobija redni broj u godini, rok i zaduženog. Podaci ostaju samo na ovom uređaju; za predaju ili rezervnu kopiju koristite CSV ili štampu.</p>
      <div class="office-stats">
        <span><b>{list.length}</b> ukupno</span>
        <span><b>{open}</b> u radu</span>
        <span class={late ? 'bad' : ''}><b>{late}</b> kasni</span>
      </div>
      <div class="row gap wrap">
        <button class={`btn sm ${showForm ? '' : 'primary'}`} onClick={() => { setCur(blank()); setFormOpen(!showForm); }}><Icon name={showForm ? 'x' : 'plus'} size={14} /> {showForm ? 'Zatvori' : 'Novi akt'}</button>
        {list.length > 0 && <button class="btn sm" onClick={() => exportCsv('djelovodnik.csv', header, rows(shown))}><Icon name="download" size={14} /> CSV</button>}
        {list.length > 0 && <button class="btn sm" onClick={print}><Icon name="print" size={14} /> Štampaj</button>}
      </div>
      {showForm && <div class="office-form">
      <div class="tool-grid">
        <label class="field">Broj akta<input value={cur.no} onInput={(e) => set('no', e.currentTarget.value)} /></label>
        <label class="field">Datum prijema / slanja<input type="date" value={cur.date} onInput={(e) => set('date', e.currentTarget.value)} /></label>
        <label class="field">Vrsta<select class="select" value={cur.dir} onChange={(e) => set('dir', e.currentTarget.value as Direction)}>{DIRECTIONS.map((d) => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}</select></label>
        <label class="field">Pošiljalac / primalac<input value={cur.party} onInput={(e) => set('party', e.currentTarget.value)} /></label>
        <label class="field wide">Predmet<input value={cur.subject} onInput={(e) => set('subject', e.currentTarget.value)} /></label>
        <label class="field">Klasifikaciona oznaka<input placeholder="npr. 01-02-" value={cur.cls} onInput={(e) => set('cls', e.currentTarget.value)} /></label>
        <label class="field">Rok za postupanje<input type="date" value={cur.due} onInput={(e) => set('due', e.currentTarget.value)} /></label>
        <label class="field">Zaduženo<input value={cur.assignee} onInput={(e) => set('assignee', e.currentTarget.value)} /></label>
        <label class="field">Status<select class="select" value={cur.status} onChange={(e) => set('status', e.currentTarget.value as EntryStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label class="field wide">Napomena<input value={cur.note} onInput={(e) => set('note', e.currentTarget.value)} /></label>
      </div>
      <div class="row gap wrap">
        <button class="btn primary sm" onClick={save}><Icon name="check" size={14} /> {isNew ? 'Zavedi akt' : 'Sačuvaj izmjene'}</button>
        {!isNew && <button class="btn ghost sm" onClick={() => { setCur(blank()); setFormOpen(false); }}>Odustani</button>}
      </div>
      </div>}

      {list.length > 0 && (
        <div class="office-filter">
          <div class="searchbox"><Icon name="search" size={16} /><input placeholder="Traži po broju, predmetu, stranci…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
          <div class="filters">
            {(['sve', ...STATUSES] as const).map((s) => <button key={s} class={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s === 'sve' ? 'Svi statusi' : s}</button>)}
            {(['sve', ...DIRECTIONS] as const).map((d) => <button key={d} class={`chip ${dir === d ? 'on' : ''}`} onClick={() => setDir(d)}>{d === 'sve' ? 'Sve vrste' : d}</button>)}
          </div>
        </div>
      )}

      <div class="office-list">
        {shown.map((e) => {
          const left = daysToDue(e.due, now);
          const overdue = isOverdue(e, now);
          return (
            <article key={e.id} class={`office-item ${e.status !== 'u radu' ? 'done' : ''} ${overdue ? 'late' : ''}`}>
              <button class="office-main" onClick={() => { setCur(e); setFormOpen(true); document.querySelector('.page-inner')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span class="office-no">{e.no}</span>
                <span class="office-body">
                  <strong>{e.subject}</strong>
                  <small class="muted">{bsDate(e.date)} · {e.dir}{e.party ? ` · ${e.party}` : ''}{e.cls ? ` · ${e.cls}` : ''}{e.assignee ? ` · ${e.assignee}` : ''}</small>
                </span>
              </button>
              <div class="office-side">
                {e.due && e.status === 'u radu' && <span class={`pill xs ${overdue ? 'warn' : ''}`}>{left === 0 ? 'rok: danas' : left! < 0 ? `kasni ${-left!} d.` : `još ${left} d.`}</span>}
                <select class="select xs" aria-label="Status" value={e.status} onChange={(ev) => setStatusOf(e, ev.currentTarget.value as EntryStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                <button class="icon-btn sm danger" aria-label="Obriši" onClick={() => confirm('Obrisati akt iz djelovodnika?') && persist(list.filter((x) => x.id !== e.id))}><Icon name="trash" size={14} /></button>
              </div>
            </article>
          );
        })}
        {list.length > 0 && shown.length === 0 && <p class="muted">Nema akata za ovaj filter.</p>}
      </div>
    </>
  );
}

function letterHtml(t: Template, f: LetterFields): string {
  const para = (s: string) => esc(s).replace(/\n/g, '<br>');
  return `<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:18px"><strong style="font-size:14pt">${esc(ORG.name)}</strong></div>
<p>Broj: ${esc(f.ref || '__________')}<br>${esc(f.place)}, ${esc(bsDate(f.date))}</p>
${f.recipient.trim() ? `<p style="margin-left:50%">${para(f.recipient)}</p>` : ''}
<p><strong>${esc(f.subject || t.subject)}</strong></p>
<p class="pre">${esc(f.body)}</p>
<p style="margin-top:36px;margin-left:55%;text-align:center">${esc(f.role)}<br><br>____________________<br>${esc(f.signer)}</p>`;
}

export function Predlosci() {
  const [id, setId] = useState(TEMPLATES[0]!.id);
  const t = TEMPLATES.find((x) => x.id === id)!;
  const fresh = (tt: Template): LetterFields => ({ place: 'Bosanska Krupa', date: today(), ref: '', recipient: '', subject: tt.subject, body: tt.body, role: '', signer: '' });
  const [f, setF] = useState<LetterFields>(() => fresh(t));
  const pick = (next: Template) => {
    setId(next.id);
    setF(fresh(next));
  };
  const set = <K extends keyof LetterFields>(k: K, v: LetterFields[K]) => setF({ ...f, [k]: v });
  const text = `${ORG.name}\nBroj: ${f.ref || '—'}\n${f.place}, ${bsDate(f.date)}\n\n${f.recipient ? `${f.recipient}\n\n` : ''}${f.subject}\n\n${f.body}\n\n${f.role}\n${f.signer}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Tekst kopiran');
    } catch {
      toast('Kopiranje nije podržano na ovom uređaju', 'err');
    }
  };
  return (
    <>
      <p class="muted small">Odaberite predložak, dopunite tekst i štampajte (ili sačuvajte kao PDF). Zaglavlje preduzeća se dodaje automatski. Predlošci su polazna osnova; provjerite ih prema internim aktima i pravilima o potpisivanju.</p>
      <div class="tpl-grid">
        {TEMPLATES.map((x) => (
          <button key={x.id} class={`tpl ${x.id === id ? 'on' : ''}`} onClick={() => pick(x)}>
            <strong>{x.title}</strong>
            <small class="muted">{x.hint}</small>
          </button>
        ))}
      </div>
      {t.cite && <p class="muted xs">Podsjetnik: <Cite id={t.cite} /></p>}
      <div class="tool-grid">
        <label class="field">Broj akta<input value={f.ref} onInput={(e) => set('ref', e.currentTarget.value)} /></label>
        <label class="field">Mjesto<input value={f.place} onInput={(e) => set('place', e.currentTarget.value)} /></label>
        <label class="field">Datum<input type="date" value={f.date} onInput={(e) => set('date', e.currentTarget.value)} /></label>
        <label class="field wide">Primalac (adresa)<textarea rows={2} value={f.recipient} onInput={(e) => set('recipient', e.currentTarget.value)} /></label>
        <label class="field wide">Predmet<input value={f.subject} onInput={(e) => set('subject', e.currentTarget.value)} /></label>
        <label class="field wide">Tekst<textarea rows={12} value={f.body} onInput={(e) => set('body', e.currentTarget.value)} /></label>
        <label class="field">Funkcija potpisnika<input placeholder="npr. Direktor" value={f.role} onInput={(e) => set('role', e.currentTarget.value)} /></label>
        <label class="field">Ime i prezime<input value={f.signer} onInput={(e) => set('signer', e.currentTarget.value)} /></label>
      </div>
      <div class="row gap wrap">
        <button class="btn primary sm" onClick={() => printHtml(f.subject || t.title, letterHtml(t, f)) || toast('Preglednik je blokirao prozor za štampu', 'err')}><Icon name="print" size={14} /> Štampaj / PDF</button>
        <button class="btn sm" onClick={() => void copy()}><Icon name="copy" size={14} /> Kopiraj tekst</button>
        <button class="btn ghost sm" onClick={() => setF(fresh(t))}>Vrati predložak</button>
      </div>
    </>
  );
}

export function Pitanja() {
  const items = faq.value.filter((x) => x.topic === OFFICE_TOPIC);
  return (
    <div class="articles">
      {items.map((f) => <FaqItem key={f.id} f={f} />)}
      {!items.length && <p class="muted">Pripremljeni odgovori o kancelarijskom poslovanju nisu dostupni.</p>}
      <p class="muted xs">Tekst Uredbe o kancelarijskom poslovanju i Pravilnika o uredskom poslovanju FBiH nije u bazi; za klasifikaciju i rokove čuvanja arhivske građe koristite interni akt preduzeća (Pravilnici ŠPD, kad su otključani).</p>
    </div>
  );
}
