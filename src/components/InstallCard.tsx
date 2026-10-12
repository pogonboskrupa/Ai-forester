import { APK_URL, canPrompt, installed, isAndroid, isIos, promptInstall } from '../install';
import { toast } from '../store';
import { Icon } from './Icon';

/** Upute i dugme za instalaciju, prilagođeni uređaju. */
export function InstallCard() {
  if (installed.value) {
    return (
      <section class="card">
        <h2>Aplikacija</h2>
        <p class="status ok"><Icon name="check" size={14} /> Aplikacija je instalirana na ovom uređaju.</p>
      </section>
    );
  }
  const install = async () => {
    if (await promptInstall()) toast('Aplikacija instalirana');
  };
  return (
    <section class="card install-card">
      <h2>Instaliraj na telefon ili računar</h2>
      <p class="muted small">Aplikacija dobija ikonu na početnom ekranu, otvara se preko cijelog ekrana i biblioteka propisa radi i bez interneta.</p>
      {canPrompt.value && (
        <button class="btn primary" onClick={() => void install()}><Icon name="download" size={16} /> Instaliraj aplikaciju</button>
      )}
      {isIos ? (
        <ol class="steps">
          <li>Otvorite ovu stranicu u <strong>Safariju</strong>.</li>
          <li>Dodirnite dugme <strong>Dijeli</strong> (kvadrat sa strelicom prema gore).</li>
          <li>Izaberite <strong>Dodaj na početni ekran</strong> (Add to Home Screen), pa <strong>Dodaj</strong>.</li>
        </ol>
      ) : (
        !canPrompt.value && (
          <ol class="steps">
            <li>Otvorite ovu stranicu u <strong>Chromeu</strong> (na računaru i u Edgeu).</li>
            <li>Dodirnite meni <strong>⋮</strong> gore desno.</li>
            <li>Izaberite <strong>Instaliraj aplikaciju</strong> ili <strong>Dodaj na početni ekran</strong>.</li>
          </ol>
        )
      )}
      {!isIos && (
        <div class="apk-box">
          <div>
            <strong>Android APK</strong>
            <p class="muted xs">Alternativa za telefone bez Chromea ili za dijeljenje s kolegama. Kad se preuzme, otvorite ga iz <strong>Datoteke → Preuzimanja</strong> i dozvolite "instaliranje iz nepoznatih izvora". Na Samsungu prvo isključite <strong>Auto Blocker</strong> (Postavke → Sigurnost).</p>
          </div>
          <a class="btn sm" href={APK_URL} download="ai-sumar.apk"><Icon name="download" size={14} /> Preuzmi APK</a>
        </div>
      )}
      {!isAndroid && !isIos && <p class="muted xs">Na računaru: u Chromeu/Edgeu ikona za instalaciju je i na desnom kraju adresne trake.</p>}
    </section>
  );
}
