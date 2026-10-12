import { registerSW } from 'virtual:pwa-register';

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

/** Traži novi service worker; kad se instalira, autoUpdate sam osvježi stranicu. */
export async function checkServiceWorker(): Promise<void> {
  if (registration && navigator.onLine) await registration.update().catch(() => undefined);
}
