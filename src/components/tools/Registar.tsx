import { useEffect, useState } from 'preact/hooks';
import { load, save } from '../../storage';
import { toast } from '../../store';
import { Cite } from '../Cite';
import { Icon } from '../Icon';

interface Hammer { id: string; kind: string; no: string; inventory: string; holder: string; issued: string; returned: string; note: string }
interface Block { id: string; no: string; year: string; holder: string; issued: string; returned: string; status: string; note: string }

const HAMMER_KINDS = ['Doznaka (šesterokut)', 'Prijem kod panja / kontrola (krug)', 'Otprema', 'Šumokvar – ŠK (kvadrat)', 'Privatne šume (elipsa)', 'Pohranjen – van upotrebe'];
const BLOCK_STATUS = ['zadužen', 'iskorišten – vraćen', 'djelimično iskorišten – vraćen', 'neiskorišten – vraćen'];
// Lokalni datum (toISOString je UTC – između 00 i 02 h dao bi jučerašnji datum).
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const uid = () => crypto.randomUUID();

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
function exportCsv(name: string, header: string[], rows: string[][]) {
  // BOM da Excel prepozna UTF-8 (š, č, ć, ž, đ)
  const csv = `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useList<T extends { id: string }>(key: string) {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => void load<T>(key).then(setList), [key]);
  const persist = (next: T[]) => {
    setList(next);
    void save(key, next);
  };
  return [list, persist] as const;
}

function Hammers() {
  const [list, persist] = useList<Hammer>('reg-cekici');
  const blank = (): Hammer => ({ id: uid(), kind: HAMMER_KINDS[0]!, no: '', inventory: '', holder: '', issued: today(), returned: '', note: '' });
  const [cur, setCur] = useState<Hammer>(blank);
  const set = (k: keyof Hammer, v: string) => setCur({ ...cur, [k]: v });
  const add = () => {
    if (!cur.no.trim()) return toast('Upišite redni broj čekića', 'err');
    persist([cur, ...list.filter((x) => x.id !== cur.id)]);
    setCur(blank());
  };
  return (
    <>
      <p class="muted small">Registar sadrži vrstu i namjenu, redni broj, broj inventara, lice kojem je čekić izdat te datume preuzimanja i vraćanja. Jedan čekić u toku godine koristi samo jedan izvršilac. <Cite id="usk-pravilnik-zigosanje-otpremni#6" /></p>
      <div class="tool-grid">
        <label class="field">Vrsta / namjena<select class="select" value={cur.kind} onChange={(e) => set('kind', e.currentTarget.value)}>{HAMMER_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label class="field">Redni broj<input value={cur.no} onInput={(e) => set('no', e.currentTarget.value)} /></label>
        <label class="field">Broj i stavka inventara<input value={cur.inventory} onInput={(e) => set('inventory', e.currentTarget.value)} /></label>
        <label class="field">Zadužio (ime, prezime, adresa)<input value={cur.holder} onInput={(e) => set('holder', e.currentTarget.value)} /></label>
        <label class="field">Datum preuzimanja<input type="date" value={cur.issued} onInput={(e) => set('issued', e.currentTarget.value)} /></label>
        <label class="field">Datum vraćanja<input type="date" value={cur.returned} onInput={(e) => set('returned', e.currentTarget.value)} /></label>
        <label class="field wide">Napomena<input value={cur.note} onInput={(e) => set('note', e.currentTarget.value)} /></label>
      </div>
      <div class="row gap wrap">
        <button class="btn primary sm" onClick={add}><Icon name="check" size={14} /> Sačuvaj čekić</button>
        {list.length > 0 && <button class="btn sm" onClick={() => exportCsv('registar-sumskih-cekica.csv', ['Vrsta', 'Redni broj', 'Inventar', 'Zadužio', 'Preuzeto', 'Vraćeno', 'Napomena'], list.map((h) => [h.kind, h.no, h.inventory, h.holder, h.issued, h.returned, h.note]))}><Icon name="download" size={14} /> CSV za Excel</button>}
      </div>
      <div class="reg-table">
        {list.map((h) => (
          <div key={h.id} class={`reg-row ${h.returned ? 'muted' : ''}`}>
            <button class="link" onClick={() => setCur(h)}><strong>{h.no}</strong> · {h.kind}</button>
            <span>{h.holder || '—'}</span>
            <span class="xs">{h.issued}{h.returned ? ` → ${h.returned}` : ' · zadužen'}</span>
            <button class="icon-btn sm danger" aria-label="Obriši" onClick={() => confirm('Obrisati iz registra?') && persist(list.filter((x) => x.id !== h.id))}><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function Blocks() {
  const [list, persist] = useList<Block>('reg-blokovi');
  const blank = (): Block => ({ id: uid(), no: '', year: String(new Date().getFullYear()), holder: '', issued: today(), returned: '', status: BLOCK_STATUS[0]!, note: '' });
  const [cur, setCur] = useState<Block>(blank);
  const set = (k: keyof Block, v: string) => setCur({ ...cur, [k]: v });
  const add = () => {
    if (!cur.no.trim()) return toast('Upišite broj bloka', 'err');
    persist([cur, ...list.filter((x) => x.id !== cur.id)]);
    setCur(blank());
  };
  const open = list.filter((b) => b.status === 'zadužen').length;
  return (
    <>
      <p class="muted small">Blokovi se obrojčavaju za svaku godinu od broja 1, zadužuju se licima koja vrše otpremu, a iskorišteni i djelimično iskorišteni vraćaju se i razdužuju (neiskorišteni listovi se poništavaju komisijski). <Cite id="usk-pravilnik-zigosanje-otpremni#11" /></p>
      <div class="tool-grid">
        <label class="field">Broj bloka<input value={cur.no} onInput={(e) => set('no', e.currentTarget.value)} /></label>
        <label class="field">Godina<input inputMode="numeric" value={cur.year} onInput={(e) => set('year', e.currentTarget.value)} /></label>
        <label class="field">Zadužio<input value={cur.holder} onInput={(e) => set('holder', e.currentTarget.value)} /></label>
        <label class="field">Datum zaduženja<input type="date" value={cur.issued} onInput={(e) => set('issued', e.currentTarget.value)} /></label>
        <label class="field">Status<select class="select" value={cur.status} onChange={(e) => set('status', e.currentTarget.value)}>{BLOCK_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label class="field">Datum razduženja<input type="date" value={cur.returned} onInput={(e) => set('returned', e.currentTarget.value)} /></label>
        <label class="field wide">Napomena<input value={cur.note} onInput={(e) => set('note', e.currentTarget.value)} /></label>
      </div>
      <div class="row gap wrap">
        <button class="btn primary sm" onClick={add}><Icon name="check" size={14} /> Sačuvaj blok</button>
        {list.length > 0 && <button class="btn sm" onClick={() => exportCsv('registar-blokova-otpremnih-iskaza.csv', ['Broj bloka', 'Godina', 'Zadužio', 'Zaduženo', 'Status', 'Razduženo', 'Napomena'], list.map((b) => [b.no, b.year, b.holder, b.issued, b.status, b.returned, b.note]))}><Icon name="download" size={14} /> CSV za Excel</button>}
      </div>
      {list.length > 0 && <p class="muted xs">{list.length} blokova · {open} trenutno zaduženo</p>}
      <div class="reg-table">
        {list.map((b) => (
          <div key={b.id} class={`reg-row ${b.status !== 'zadužen' ? 'muted' : ''}`}>
            <button class="link" onClick={() => setCur(b)}><strong>{b.no}/{b.year}</strong></button>
            <span>{b.holder || '—'}</span>
            <span class="xs">{b.status}{b.returned ? ` · ${b.returned}` : ''}</span>
            <button class="icon-btn sm danger" aria-label="Obriši" onClick={() => confirm('Obrisati iz registra?') && persist(list.filter((x) => x.id !== b.id))}><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Registar šumskih čekića i blokova otpremnih iskaza (lokalno na uređaju, izvoz u CSV). */
export function Registar() {
  const [tab, setTab] = useState<'cekici' | 'blokovi'>('cekici');
  return (
    <section class="card tool">
      <h2>Registar</h2>
      <div class="segmented xs">
        <button class={tab === 'cekici' ? 'on' : ''} onClick={() => setTab('cekici')}>Šumski čekići</button>
        <button class={tab === 'blokovi' ? 'on' : ''} onClick={() => setTab('blokovi')}>Blokovi otpremnih iskaza</button>
      </div>
      {tab === 'cekici' ? <Hammers /> : <Blocks />}
      <p class="muted xs">Podaci se čuvaju samo na ovom uređaju; za rezervnu kopiju ili predaju koristite CSV izvoz.</p>
    </section>
  );
}
