import { num } from '../format';

/** Kubikator: zapremina oblovine, prostornog drveta i stabla. Mjere kao na terenu (cm, m). */

/** Huberova formula: V = π/4 · d² · L (d – srednji promjer u cm, L – dužina u m) → m³. */
export function huber(dCm: number, lengthM: number): number {
  if (!(dCm > 0) || !(lengthM > 0)) return 0;
  const d = dCm / 100;
  return (Math.PI / 4) * d * d * lengthM;
}

/** Smalijanova formula (prosjek površina krajeva): V = (g1 + g2) / 2 · L. */
export function smalian(d1Cm: number, d2Cm: number, lengthM: number): number {
  if (!(d1Cm > 0) || !(d2Cm > 0) || !(lengthM > 0)) return 0;
  const g = (d: number) => (Math.PI / 4) * (d / 100) ** 2;
  return ((g(d1Cm) + g(d2Cm)) / 2) * lengthM;
}

/** Prostorni metri → m³ preko koeficijenta punoće složaja (zavisi od vrste i načina slaganja). */
export const stackedToSolid = (prm: number, factor: number): number => (prm > 0 && factor > 0 ? prm * factor : 0);

/** Prostorni metar složaja: dužina × visina × dužina komada (m). */
export const stackVolume = (lengthM: number, heightM: number, pieceM: number): number =>
  lengthM > 0 && heightM > 0 && pieceM > 0 ? lengthM * heightM * pieceM : 0;

/** Stablo: V = g₁,₃ · h · f (g na prsnoj visini iz d₁,₃ u cm, h u m, f oblični broj). */
export function standingTree(dbhCm: number, heightM: number, formFactor: number): number {
  if (!(dbhCm > 0) || !(heightM > 0) || !(formFactor > 0)) return 0;
  return (Math.PI / 4) * (dbhCm / 100) ** 2 * heightM * formFactor;
}

/** Temeljnica (m²) iz prečnika u cm. */
export const basalArea = (dCm: number): number => (dCm > 0 ? (Math.PI / 4) * (dCm / 100) ** 2 : 0);

export const round3 = (x: number): number => Math.round(x * 1000) / 1000;

/** Broj u bosanskom formatu (zarez kao decimalni separator). */
export const fmt = (x: number, digits = 3): string => num(x, digits);

/** Unos s tastature telefona: prihvata i "12,5" i "12.5". */
export const parseNum = (s: string): number => {
  const n = Number(s.replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
};
