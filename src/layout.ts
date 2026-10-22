export type Layout = 'auto' | 'desktop';

/** Širina na kojoj se računarski raspored prikazuje kad ga korisnik zatraži na telefonu. */
export const DESKTOP_WIDTH = 1280;
/** Uređaji uži od ovoga smatraju se telefonom/tabletom za potrebe prekidača "Desktop". */
const PHONE_MAX = 1000;

const AUTO = 'width=device-width,initial-scale=1,viewport-fit=cover';

/** Sadržaj meta viewport oznake za odabrani prikaz; deviceWidth je kraća strana ekrana (CSS px). */
export function viewportContent(layout: Layout, deviceWidth: number): string {
  return layout === 'desktop' && deviceWidth < PHONE_MAX ? `width=${DESKTOP_WIDTH},viewport-fit=cover` : AUTO;
}

/** Postavlja viewport; na računaru je "desktop" bez efekta jer je ekran već širok. */
export function applyLayout(layout: Layout): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const device = Math.min(window.screen.width, window.screen.height);
  meta.setAttribute('content', viewportContent(layout, device));
}
