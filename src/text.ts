// Normalizacija za pretragu: mala slova, bez dijakritika, blagi "stemmer" (prefiks)
// jer bosanska morfologija (šuma/šume/šumi/šumama) ruši tačno poklapanje.
const MAP: Record<string, string> = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj' };

export function fold(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[čćšžđ]/g, (c) => MAP[c] ?? c);
}

export function tokenize(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
    .map((t) => (t.length > 5 ? t.slice(0, 5) : t));
}

/**
 * Spaja prelome redova iz PDF-a unutar rečenice. Novi red ostaje nakon kraja rečenice/naslova
 * i ispred nabrajanja (-, •, 1., a), I.), da liste i pasusi ostanu čitljivi.
 */
export function reflow(text: string): string {
  const lines = text.split('\n').map((l) => l.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim());
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    const startsItem = /^([-–•▪*]|\d+(\.\d+)*[.)]|[a-zA-Z][.)]|[IVX]+\.)\s/.test(line);
    if (!line) out.push('');
    else if (prev && !/[.:;!?]$/.test(prev) && !startsItem) {
      out[out.length - 1] = /[a-zčćšžđ]-$/.test(prev) && /^[a-zčćšžđ]/.test(line) ? prev + line : `${prev} ${line}`;
    } else out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
