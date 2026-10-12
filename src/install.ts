import { signal } from '@preact/signals';

/** Chrome/Edge na Androidu i računaru: događaj koji omogućava vlastito dugme "Instaliraj". */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const nav = navigator as Navigator & { standalone?: boolean };
const isNativeApp = 'Capacitor' in window;

export const installed = signal(
  isNativeApp || window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
);
export const canPrompt = signal(false);
export const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isAndroid = /android/i.test(navigator.userAgent);

let deferred: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  canPrompt.value = true;
});
window.addEventListener('appinstalled', () => {
  installed.value = true;
  canPrompt.value = false;
  deferred = null;
});

/** Vraća true ako je korisnik prihvatio instalaciju. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  canPrompt.value = false;
  return outcome === 'accepted';
}

export const APK_URL = 'https://github.com/pogonboskrupa/Ai-forester/releases/latest/download/ai-sumar.apk';
