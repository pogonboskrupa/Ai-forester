import { useEffect, useState } from 'preact/hooks';
import { fmt, huber, parseNum, smalian, stackedToSolid, standingTree } from '../../tools/volume';
import { Icon } from '../Icon';

type Mode = 'oblovina' | 'prostorno' | 'stablo';
interface LogRow { d: string; d2: string; l: string; n: string }

const ROWS_KEY = 'ai-sumar-kubikator';
const emptyRow = (): LogRow => ({ d: '', d2: '', l: '', n: '1' });

function loadRows(): LogRow[] {
  try {
    const v = JSON.parse(localStorage.getItem(ROWS_KEY) ?? 'null') as LogRow[] | null;
    return Array.isArray(v) && v.length ? v : [emptyRow()];
  } catch {
    return [emptyRow()];
  }
}

// Orijentacioni koeficijenti punoće složaja; tačan koeficijent zavisi od vrste, debljine i slaganja.
const FACTORS = [
  { label: 'Cijepano ogrjevno drvo', f: 0.7 },
  { label: 'Oblice (ogrjev, celuloza)', f: 0.65 },
  { label: 'Tanka oblovina / granje', f: 0.55 },
];

function Logs() {
  const [rows, setRows] = useState<LogRow[]>(loadRows);
  const [smal, setSmal] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
    } catch {
      /* bez trajnog čuvanja */
    }
  }, [rows]);
  const vol = (r: LogRow) =>
    (smal ? smalian(parseNum(r.d), parseNum(r.d2), parseNum(r.l)) : huber(parseNum(r.d), parseNum(r.l))) * Math.max(1, Math.round(parseNum(r.n)));
  const total = rows.reduce((s, r) => s + vol(r), 0);
  const pieces = rows.reduce((s, r) => s + (vol(r) > 0 ? Math.max(1, Math.round(parseNum(r.n))) : 0), 0);
  const set = (i: number, k: keyof LogRow, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <>
      <label class="check-row"><input type="checkbox" checked={smal} onChange={(e) => setSmal(e.currentTarget.checked)} /> Smalijanova formula (promjer na oba kraja)</label>
      <div class="calc-rows">
        <div class="calc-row head">
          <span>{smal ? 'd₁ (cm)' : 'd sred. (cm)'}</span>{smal && <span>d₂ (cm)</span>}<span>L (m)</span><span>kom.</span><span>m³</span><span />
        </div>
        {rows.map((r, i) => (
          <div class="calc-row" key={i}>
            <input inputMode="decimal" value={r.d} onInput={(e) => set(i, 'd', e.currentTarget.value)} aria-label="Promjer" />
            {smal && <input inputMode="decimal" value={r.d2} onInput={(e) => set(i, 'd2', e.currentTarget.value)} aria-label="Promjer 2" />}
            <input inputMode="decimal" value={r.l} onInput={(e) => set(i, 'l', e.currentTarget.value)} aria-label="Dužina" />
            <input inputMode="numeric" value={r.n} onInput={(e) => set(i, 'n', e.currentTarget.value)} aria-label="Komada" />
            <output>{fmt(vol(r))}</output>
            <button class="icon-btn sm" aria-label="Ukloni red" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyRow()])}><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
      <div class="row gap wrap">
        <button class="btn sm" onClick={() => setRows([...rows, emptyRow()])}><Icon name="plus" size={14} /> Dodaj trupac</button>
        <button class="btn ghost sm" onClick={() => setRows([emptyRow()])}>Očisti</button>
      </div>
      <div class="calc-total"><span>Ukupno ({pieces} kom.)</span><strong>{fmt(total)} m³</strong></div>
      <p class="muted xs">{smal ? 'V = (g₁ + g₂) / 2 · L' : 'Huber: V = π/4 · d² · L'}, d bez kore u cm, L u m. Za službeni premjer koristite propisane tablice i način mjerenja.</p>
    </>
  );
}

function Stacked() {
  const [l, setL] = useState('');
  const [h, setH] = useState('');
  const [p, setP] = useState('1');
  const [prm, setPrm] = useState('');
  const [f, setF] = useState('0.7');
  const fromDims = parseNum(l) * parseNum(h) * parseNum(p);
  const space = prm ? parseNum(prm) : fromDims;
  return (
    <>
      <div class="tool-grid">
        <label class="field">Dužina složaja (m)<input inputMode="decimal" value={l} onInput={(e) => { setL(e.currentTarget.value); setPrm(''); }} /></label>
        <label class="field">Visina složaja (m)<input inputMode="decimal" value={h} onInput={(e) => { setH(e.currentTarget.value); setPrm(''); }} /></label>
        <label class="field">Dužina komada (m)<input inputMode="decimal" value={p} onInput={(e) => { setP(e.currentTarget.value); setPrm(''); }} /></label>
        <label class="field">ili direktno prostornih metara<input inputMode="decimal" value={prm} onInput={(e) => setPrm(e.currentTarget.value)} /></label>
      </div>
      <div class="row gap wrap">
        {FACTORS.map((x) => <button key={x.label} class={`chip ${parseNum(f) === x.f ? 'on' : ''}`} onClick={() => setF(String(x.f))}>{x.label} · {String(x.f).replace('.', ',')}</button>)}
      </div>
      <label class="field narrow">Koeficijent punoće<input inputMode="decimal" value={f} onInput={(e) => setF(e.currentTarget.value)} /></label>
      <div class="calc-total"><span>{fmt(space, 2)} prm × {String(parseNum(f)).replace('.', ',')}</span><strong>{fmt(stackedToSolid(space, parseNum(f)))} m³</strong></div>
      <p class="muted xs">Koeficijenti su orijentacioni; za obračun koristite koeficijente iz važećih standarda i cjenovnika.</p>
    </>
  );
}

function Tree() {
  const [d, setD] = useState('');
  const [h, setH] = useState('');
  const [f, setF] = useState('0.5');
  const [n, setN] = useState('1');
  const v = standingTree(parseNum(d), parseNum(h), parseNum(f)) * Math.max(1, Math.round(parseNum(n)));
  return (
    <>
      <div class="tool-grid">
        <label class="field">Prsni promjer d₁,₃ (cm)<input inputMode="decimal" value={d} onInput={(e) => setD(e.currentTarget.value)} /></label>
        <label class="field">Visina stabla (m)<input inputMode="decimal" value={h} onInput={(e) => setH(e.currentTarget.value)} /></label>
        <label class="field">Oblični broj f<input inputMode="decimal" value={f} onInput={(e) => setF(e.currentTarget.value)} /></label>
        <label class="field">Broj stabala<input inputMode="numeric" value={n} onInput={(e) => setN(e.currentTarget.value)} /></label>
      </div>
      <div class="calc-total"><span>V = g · h · f</span><strong>{fmt(v)} m³</strong></div>
      <p class="muted xs">Gruba procjena krupnog drveta. Doznaka se obračunava po zapreminskim tablicama (tarifama) iz šumskoprivredne osnove.</p>
    </>
  );
}

export function Kubikator() {
  const [mode, setMode] = useState<Mode>('oblovina');
  return (
    <section class="card tool">
      <h2>Kubikator</h2>
      <div class="segmented xs" role="tablist">
        <button class={mode === 'oblovina' ? 'on' : ''} onClick={() => setMode('oblovina')}>Oblovina</button>
        <button class={mode === 'prostorno' ? 'on' : ''} onClick={() => setMode('prostorno')}>Prostorno drvo</button>
        <button class={mode === 'stablo' ? 'on' : ''} onClick={() => setMode('stablo')}>Dubeće stablo</button>
      </div>
      {mode === 'oblovina' ? <Logs /> : mode === 'prostorno' ? <Stacked /> : <Tree />}
    </section>
  );
}
