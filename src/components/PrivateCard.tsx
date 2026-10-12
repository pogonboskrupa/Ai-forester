import { useState } from 'preact/hooks';
import { WrongPassError } from '../crypto';
import { lockPrivate, privateBusy, privateLaws, privateUnlocked, unlockPrivate } from '../private';
import { toast } from '../store';
import { Icon } from './Icon';

/** Postavke: otključavanje internih akata ŠPD-a internom šifrom. */
export function PrivateCard() {
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const unlock = async (e: Event) => {
    e.preventDefault();
    setError(null);
    try {
      const n = await unlockPrivate(pass);
      setPass('');
      toast(`Otključano: ${n} internih akata`);
    } catch (err) {
      setError(err instanceof WrongPassError ? 'Pogrešna šifra.' : err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section class="card">
      <h2>Interni akti ŠPD</h2>
      {privateUnlocked.value ? (
        <>
          <p class="status ok"><Icon name="check" size={14} /> Otključano na ovom uređaju.</p>
          <ul class="muted small">
            {privateLaws.value.map((l) => <li key={l.id}>{l.title} – {l.articleCount} čl.</li>)}
          </ul>
          <p class="muted xs">Kad je uključen AI, izvodi iz ovih akata šalju se odabranom AI servisu kao i izvodi iz zakona.</p>
          <button class="btn" onClick={() => { lockPrivate(); toast('Interni akti zaključani'); }}>Zaključaj i ukloni s uređaja</button>
        </>
      ) : (
        <form onSubmit={(e) => void unlock(e)}>
          <p class="muted small">Sistematizacija i opisi poslova ŠPD-a „Unsko-sanske šume". U aplikaciji su šifrovani; otključavaju se internom šifrom.</p>
          <div class="row gap wrap">
            <input class="grow" type="password" autocomplete="off" placeholder="Interna šifra" value={pass} onInput={(e) => setPass(e.currentTarget.value)} />
            <button class="btn primary" type="submit" disabled={!pass.trim() || privateBusy.value}>{privateBusy.value ? 'Otključavam…' : 'Otključaj'}</button>
          </div>
          {error && <p class="status err"><Icon name="alert" size={14} /> {error}</p>}
        </form>
      )}
    </section>
  );
}
