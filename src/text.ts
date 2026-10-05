// Normalizacija za pretragu: mala slova, bez dijakritika, blagi "stemmer" (prefiks)
// jer bosanska morfologija (šuma/šume/šumi/šumama) ruši tačno poklapanje.
const MAP: Record<string, string> = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj' };

export function fold(s: string): string {
  return s.toLowerCase().replace(/[čćšžđ]/g, (c) => MAP[c] ?? c);
}

export function tokenize(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
    .map((t) => (t.length > 5 ? t.slice(0, 5) : t));
}
