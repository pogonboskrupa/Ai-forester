import { registerSW } from 'virtual:pwa-register';
import { busy } from './store';

let registration: ServiceWorkerRegistration | undefined;

/**
 * Service worker s automatskim ažuriranjem: telefon ne smije ostati na staroj verziji iz keša.
 * Nova verzija se traži pri pokretanju, pri povratku u aplikaciju i svakih 30 minuta,
 * a kad stigne, stranica se osvježi (registerType: 'autoUpdate').
 * U Android aplikaciji (Capacitor) fajlovi su već u APK-u, pa service worker nije potreban.
 */
export function setupPwa(): void {
  if ('Capacitor' in window || !('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      registration = reg;
      if (!reg) return;
      setInterval(() => void checkServiceWorker(), 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void checkServiceWorker();
      });
    },
  });
}

/**
 * Traži novi service worker; kad se instalira, autoUpdate sam osvježi stranicu.
 * Dok AI piše odgovor ne traži se ažuriranje, jer bi automatski reload prekinuo odgovor.
 */
export async function checkServiceWorker(force = false): Promise<void> {
  if (!registration || !navigator.onLine || (busy.value && !force)) return;
  await registration.update().catch(() => undefined);
}

/** Za dugme "Učitaj novu verziju": sačeka da novi service worker preuzme stranicu (max 20 s), pa osvježi. */
export async function activateLatest(): Promise<void> {
  const sw = navigator.serviceWorker;
  if (registration && sw) {
    const switched = new Promise<void>((resolve) => sw.addEventListener('controllerchange', () => resolve(), { once: true }));
    await checkServiceWorker(true);
    if (registration.installing || registration.waiting) await Promise.race([switched, new Promise((r) => setTimeout(r, 20_000))]);
  }
  location.reload();
}
