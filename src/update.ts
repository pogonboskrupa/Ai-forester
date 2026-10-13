import { computed, signal } from '@preact/signals';
import { activateLatest, checkServiceWorker } from './pwa';
import { isNewer } from './version';

/**
 * Ažuriranje aplikacije.
 * - Web/PWA: novi service worker se instalira sam (src/pwa.ts); ovdje samo ručna provjera.
 * - Android APK: web fajlovi su zapakovani u APK pa se ne mijenjaju sami. Aplikacija čita version.json
 *   s GitHub Pages i nudi preuzimanje novog APK-a; Android ga instalira preko stare verzije
 *   (isti potpis, veći versionCode), podaci ostaju.
 */
const SITE = 'https://pogonboskrupa.github.io/Ai-forester/';
export const isNative = 'Capacitor' in window;
const base = isNative ? SITE : new URL('./', location.href).href;
// Apsolutna adresa: Capacitor vanjske linkove otvara u Chromeu, koji preuzima APK.
export const APK_DOWNLOAD_URL = `${SITE}ai-sumar.apk`;

interface VersionInfo {
  version: string;
}

export const latestVersion = signal<string | null>(null);
export const checking = signal(false);
export const lastCheckError = signal<string | null>(null);
export const updateAvailable = computed(() => latestVersion.value !== null && isNewer(latestVersion.value, __APP_VERSION__));
export const bannerDismissed = signal(false);

const CHECK_EVERY_MS = 60 * 60 * 1000;
let lastCheck = 0;

async function fetchLatest(): Promise<string> {
  const res = await fetch(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Server je vratio ${res.status}`);
  const data = (await res.json()) as Partial<VersionInfo>;
  if (typeof data.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.version)) throw new Error('Neispravan odgovor servera');
  return data.version;
}

/** Vraća true ako postoji novija verzija. */
export async function checkForUpdate(): Promise<boolean> {
  if (checking.value) return updateAvailable.value;
  checking.value = true;
  lastCheckError.value = null;
  lastCheck = Date.now();
  try {
    latestVersion.value = await fetchLatest();
    if (updateAvailable.value && !isNative) await checkServiceWorker();
    return updateAvailable.value;
  } catch (e) {
    lastCheckError.value = navigator.onLine ? (e instanceof Error ? e.message : String(e)) : 'Nema internet veze';
    return false;
  } finally {
    checking.value = false;
  }
}

/** Web: učitava novu verziju; APK: otvara preuzimanje novog APK-a u Chromeu. */
export function applyUpdate(): void {
  if (isNative) location.href = APK_DOWNLOAD_URL;
  else void activateLatest();
}

/** Automatska provjera pri pokretanju i povratku u aplikaciju (najviše jednom na sat). */
export function setupUpdateChecks(): void {
  const maybeCheck = () => {
    if (navigator.onLine && Date.now() - lastCheck > CHECK_EVERY_MS) void checkForUpdate();
  };
  maybeCheck();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeCheck();
  });
}
