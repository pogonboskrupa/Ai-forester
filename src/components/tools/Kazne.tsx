import { useMemo, useState } from 'preact/hooks';
import { articles, laws } from '../../store';
import { num } from '../../format';
import { fold } from '../../text';
import { parseOffences } from '../../tools/penalties';
import { Icon } from '../Icon';
import { Cite } from '../Cite';

const km = (n: number) => `${num(n)} KM`;

/** Pregled prekršaja i raspona kazni iz kaznenih odredbi šumarskih propisa. */
/** Težina kazne za vizualni naglasak: raspon do 3.000 KM, do 10.000 KM, iznad. */
export const severity = (max: number): 'low' | 'mid' | 'high' => (max >= 10000 ? 'high' : max >= 3000 ? 'mid' : 'low');

export function Kazne() {
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const offences = useMemo(() => {
    const forestry = new Set(laws.value.filter((l) => (l.topic ?? 'Šumarstvo') === 'Šumarstvo' && l.level !== 'ŠPD').map((l) => l.id));
    return parseOffences(articles.value.filter((a) => forestry.has(a.lawId) && /kaznit/i.test(a.text)));
  }, [articles.value, laws.value]);
  const subjects = [...new Set(offences.map((o) => o.subject))];
  const t = fold(term);
  const shown = offences.filter((o) => (!subject || o.subject === subject) && (!t || fold(o.item).includes(t)));
  return (
    <section class="card tool">
      <h2>Kazne za prekršaje</h2>
      <p class="muted small">Rasponi novčanih kazni iz kaznenih odredbi šumarskih propisa. Konačnu kaznu izriče sud u prekršajnom postupku.</p>
      <div class="searchbox"><Icon name="search" size={16} /><input placeholder="Npr. otpremni, sječa bez doznake, vatra, paša…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
      <div class="row gap wrap">
        <button class={`chip ${!subject ? 'on' : ''}`} onClick={() => setSubject(null)}>Svi</button>
        {subjects.map((s) => <button key={s} class={`chip ${subject === s ? 'on' : ''}`} onClick={() => setSubject(subject === s ? null : s)}>{s}</button>)}
      </div>
      <p class="muted xs">{shown.length} prekršaja</p>
      <div class="offences">
        {shown.slice(0, 120).map((o, i) => (
          <div key={`${o.articleId}-${i}`} class="offence" data-sev={severity(o.max)}>
            <div class="offence-amount">
              <strong>{km(o.min)} – {km(o.max)}</strong>
              <span class="muted xs">{o.subject}</span>
              {o.responsible && <span class="muted xs">odgovorno lice: {km(o.responsible.min)} – {km(o.responsible.max)}</span>}
            </div>
            <p>{o.item}</p>
            <Cite id={o.articleId} />
          </div>
        ))}
      </div>
    </section>
  );
}
