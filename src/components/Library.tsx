import { useState } from 'preact/hooks';
import { articles, laws } from '../store';
import { fold } from '../text';

export function Library() {
  const [lawId, setLawId] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const law = laws.value.find((l) => l.id === lawId);
  const t = fold(term);
  const list = law
    ? articles.value.filter((a) => a.lawId === law.id && (!t || fold(`${a.heading} ${a.text} ${a.number}`).includes(t)))
    : [];

  return (
    <section class="panel">
      <h2>Biblioteka propisa</h2>
      {!law && (
        <>
          {laws.value.length === 0 && <p class="muted">Još nema učitanih propisa (data/raw).</p>}
          {laws.value.map((l) => (
            <button key={l.id} class="card" onClick={() => setLawId(l.id)}>
              <b>{l.title}</b>
              <small class="muted">{l.level} · {l.gazette} · {l.articleCount} članova{l.inForce ? '' : ' · PRESTAO VAŽITI'}</small>
            </button>
          ))}
        </>
      )}
      {law && (
        <>
          <button onClick={() => { setLawId(null); setTerm(''); }}>← Svi propisi</button>
          <h3>{law.title}</h3>
          {law.sourceUrl && <a href={law.sourceUrl} target="_blank" rel="noreferrer noopener">Izvor</a>}
          <input class="search" placeholder="Traži unutar propisa…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} />
          {list.map((a) => (
            <details key={a.id}>
              <summary>Član {a.number}{a.heading ? ` – ${a.heading}` : ''}</summary>
              <p class="pre">{a.text}</p>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
