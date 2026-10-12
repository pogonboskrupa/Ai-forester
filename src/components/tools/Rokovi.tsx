import { useState } from 'preact/hooks';
import { ANNUAL, EVENTS, SEASONS, daysUntil, eventDue, fmtDate, inSeason, nextAnnual } from '../../tools/deadlines';
import { Cite } from '../Cite';

const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Godišnji i sezonski rokovi te kalkulator rokova od datuma događaja. */
export function Rokovi() {
  const today = new Date();
  const events = [...new Set(EVENTS.map((e) => e.event))];
  const [event, setEvent] = useState(events[0]!);
  const [start, setStart] = useState(localNow);
  const upcoming = ANNUAL.map((d) => ({ ...d, due: nextAnnual(today, d.month, d.day) })).sort((a, b) => a.due.getTime() - b.due.getTime());
  const startDate = new Date(start);
  return (
    <section class="card tool">
      <h2>Rokovi</h2>
      <h3>Sljedeći godišnji rokovi</h3>
      <div class="deadlines">
        {upcoming.map((d, i) => {
          const left = daysUntil(today, d.due);
          return (
            <div key={i} class={`deadline ${left <= 14 ? 'soon' : ''}`}>
              <div class="deadline-date"><strong>{fmtDate(d.due)}</strong><span class="muted xs">{left === 0 ? 'danas' : `za ${left} d.`}</span></div>
              <div><p>{d.title}</p><span class="muted xs">{d.who}</span> <Cite id={d.source} /></div>
            </div>
          );
        })}
      </div>
      <h3>Sezonska pravila</h3>
      <div class="deadlines">
        {SEASONS.map((s, i) => (
          <div key={i} class={`deadline ${inSeason(today, s) ? 'active' : ''}`}>
            <div class="deadline-date"><strong>{s.from[1]}.{s.from[0]}. – {s.to[1]}.{s.to[0]}.</strong><span class="muted xs">{inSeason(today, s) ? 'sada važi' : 'van sezone'}</span></div>
            <div><p>{s.title}</p><Cite id={s.source} /></div>
          </div>
        ))}
      </div>
      <h3>Izračunaj rok od događaja</h3>
      <div class="tool-grid">
        <label class="field">Događaj<select class="select" value={event} onChange={(e) => setEvent(e.currentTarget.value)}>{events.map((e) => <option key={e}>{e}</option>)}</select></label>
        <label class="field">Datum i vrijeme događaja<input type="datetime-local" value={start} onInput={(e) => setStart(e.currentTarget.value)} /></label>
      </div>
      <div class="deadlines">
        {!Number.isNaN(startDate.getTime()) && EVENTS.filter((e) => e.event === event).map((e, i) => {
          const due = eventDue(startDate, e);
          return (
            <div key={i} class="deadline">
              <div class="deadline-date"><strong>{fmtDate(due, e.unit === 'h')}</strong><span class="muted xs">{e.amount} {e.unit === 'h' ? 'sati' : e.unit === 'd' ? 'dana' : e.amount === 1 ? 'godina' : 'godine'}</span></div>
              <div><p>{e.title}</p><Cite id={e.source} /></div>
            </div>
          );
        })}
      </div>
      <p class="muted xs">Rokovi u danima računaju se kalendarski; ako rok pada na neradni dan, provjerite pravila upravnog postupka.</p>
    </section>
  );
}
