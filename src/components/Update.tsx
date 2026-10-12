import { applyUpdate, bannerDismissed, checkForUpdate, checking, isNative, lastCheckError, latestVersion, updateAvailable } from '../update';
import { toast } from '../store';
import { Icon } from './Icon';

const actionLabel = isNative ? 'Preuzmi i instaliraj' : 'Učitaj novu verziju';

/** Traka na vrhu kad postoji novija verzija. */
export function UpdateBanner() {
  if (!updateAvailable.value || bannerDismissed.value) return null;
  return (
    <div class="update-banner" role="status">
      <Icon name="sparkle" size={16} />
      <span>Dostupna je nova verzija <strong>{latestVersion.value}</strong> (imate {__APP_VERSION__}).</span>
      <button class="btn sm primary" onClick={applyUpdate}>{actionLabel}</button>
      <button class="icon-btn" aria-label="Zatvori" onClick={() => (bannerDismissed.value = true)}><Icon name="x" size={14} /></button>
    </div>
  );
}

/** Kartica u Postavkama: trenutna verzija i ručna provjera. */
export function UpdateCard() {
  const check = async () => {
    const found = await checkForUpdate();
    if (!found && !lastCheckError.value) toast('Imate najnoviju verziju');
  };
  return (
    <section class="card">
      <h2>Ažuriranje</h2>
      <p class="muted small">
        Instalirana verzija: <strong>{__APP_VERSION__}</strong>
        {latestVersion.value && <> · najnovija: <strong>{latestVersion.value}</strong></>}
      </p>
      {isNative && (
        <p class="muted xs">
          Novi APK se preuzme u Chromeu. Otvorite ga iz <strong>Datoteke → Preuzimanja</strong> i izaberite <strong>Ažuriraj</strong>. Razgovori, projekti i dodani PDF-ovi ostaju sačuvani.
        </p>
      )}
      {lastCheckError.value && <p class="status err"><Icon name="alert" size={14} /> Provjera nije uspjela: {lastCheckError.value}</p>}
      <div class="row-actions">
        {updateAvailable.value ? (
          <button class="btn primary" onClick={applyUpdate}><Icon name="download" size={16} /> {actionLabel}</button>
        ) : (
          <button class="btn" disabled={checking.value} onClick={() => void check()}>
            <Icon name="refresh" size={16} /> {checking.value ? 'Provjeravam…' : 'Provjeri ažuriranja'}
          </button>
        )}
        {!isNative && <button class="btn ghost" onClick={() => location.reload()}><Icon name="refresh" size={16} /> Osvježi</button>}
      </div>
    </section>
  );
}
