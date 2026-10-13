import { useEffect, useState } from 'preact/hooks';
import { date } from '../../format';
import { load, save } from '../../storage';
import { toast } from '../../store';
import { REPORT_FIELDS, emptyReport, reportHtml, reportText, type Report } from '../../tools/report';
import { Cite } from '../Cite';
import { Icon } from '../Icon';

const KEY = 'zapisnici';

async function share(r: Report) {
  const text = reportText(r);
  try {
    if (navigator.share) await navigator.share({ title: 'Zapisnik o protivpravnoj radnji', text });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast('Zapisnik kopiran');
    } else toast('Dijeljenje i kopiranje nisu podržani na ovom uređaju', 'err');
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) toast('Dijeljenje nije uspjelo', 'err');
  }
}

function print(r: Report) {
  const w = window.open('', '_blank');
  if (!w) {
    void share(r);
    return;
  }
  w.document.write(reportHtml(r));
  w.document.close();
  w.focus();
  w.print();
}

/** Zapisnik o protivpravnoj radnji za čuvare šuma; čuva se samo na ovom uređaju. */
export function Zapisnik() {
  const [list, setList] = useState<Report[]>([]);
  const [cur, setCur] = useState<Report>(emptyReport);
  useEffect(() => void load<Report>(KEY).then(setList), []);
  const persist = async (next: Report[]) => {
    setList(next);
    await save(KEY, next);
  };
  const set = (k: keyof Report, v: string) => setCur({ ...cur, [k]: v });
  const store = async () => {
    await persist([cur, ...list.filter((x) => x.id !== cur.id)]);
    toast('Zapisnik sačuvan na uređaju');
  };
  return (
    <section class="card tool">
      <h2>Zapisnik o protivpravnoj radnji</h2>
      <p class="muted small">Čuvar šume za svaku bespravnu aktivnost bez odlaganja sačinjava zapisnik s podacima o radnji, izvršiocima i visini štete. <Cite id="usk-zakon-o-sumama#65" /></p>
      <div class="segmented xs">
        {(['državna', 'privatna'] as const).map((o) => <button key={o} class={cur.ownership === o ? 'on' : ''} onClick={() => set('ownership', o)}>{o} šuma</button>)}
      </div>
      <div class="tool-grid">
        {REPORT_FIELDS.map((f) => (
          <label key={f.key} class={`field ${f.multiline ? 'wide' : ''}`}>
            {f.label}
            {f.key === 'date' ? (
              <input type="datetime-local" value={cur.date} onInput={(e) => set('date', e.currentTarget.value)} />
            ) : f.multiline ? (
              <textarea rows={3} value={String(cur[f.key])} onInput={(e) => set(f.key, e.currentTarget.value)} />
            ) : (
              <input value={String(cur[f.key])} onInput={(e) => set(f.key, e.currentTarget.value)} />
            )}
          </label>
        ))}
      </div>
      <div class="row gap wrap">
        <button class="btn primary" onClick={() => void store()}><Icon name="check" size={16} /> Sačuvaj</button>
        <button class="btn" onClick={() => print(cur)}><Icon name="print" size={16} /> Štampaj</button>
        <button class="btn" onClick={() => void share(cur)}><Icon name="share" size={16} /> Podijeli / kopiraj</button>
        <button class="btn ghost" onClick={() => setCur(emptyReport())}><Icon name="plus" size={16} /> Novi</button>
      </div>
      <p class="muted xs">Zapisnici se čuvaju samo na ovom uređaju (sadrže lične podatke). Prijavu podnosite putem korisnika šuma nadležnom sudu ili tužilaštvu.</p>
      {list.length > 0 && (
        <div class="saved-list">
          <h3>Sačuvani zapisnici ({list.length})</h3>
          {list.map((r) => (
            <div key={r.id} class="saved-item">
              <button class="link" onClick={() => setCur(r)}>{r.date ? date(new Date(r.date), true) : 'bez datuma'} · {r.act.slice(0, 50) || 'bez opisa'}{r.offender ? ` · ${r.offender}` : ''}</button>
              <button class="icon-btn sm danger" aria-label="Obriši" onClick={() => { if (confirm('Obrisati zapisnik?')) void persist(list.filter((x) => x.id !== r.id)); }}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
