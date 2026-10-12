/** Verzije X.Y.Z (svaka cifra 0–9, vidi scripts/version.mjs). Vraća >0 ako je a novija od b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export const isNewer = (candidate: string, current: string) => compareVersions(candidate, current) > 0;
