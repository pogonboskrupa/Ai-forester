/** Raspored teksta iz PDF-a: redovi, dvije kolone glasnika, prazni redovi između pasusa. */

export interface TextItem {
  str: string;
  x: number;
  y: number; // PDF koordinate: veći y = više na stranici
  width: number;
  height: number;
}

export interface PageItems {
  width: number;
  items: TextItem[];
}

/**
 * Traži prazni vertikalni pojas između dvije kolone (ne nužno na sredini stranice — margine glasnika su
 * često nesimetrične). Vraća x sredine pojasa ili null ako stranica nema dvije kolone.
 */
export function findGutter(page: PageItems): number | null {
  const items = page.items.filter((i) => i.str.trim());
  if (items.length < 20) return null;
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const span = maxX - minX;
  if (span < 200) return null;
  const BIN = 2;
  const bins = new Array<number>(Math.ceil(span / BIN) + 1).fill(0);
  for (const it of items) {
    for (let b = Math.floor((it.x - minX) / BIN); b <= Math.floor((it.x + it.width - minX) / BIN); b++) bins[b]! += 1;
  }
  // Zaglavlja i naslovi preko cijele širine smiju prelaziti pojas.
  const allowed = Math.max(2, items.length * 0.03);
  const from = Math.floor((span * 0.3) / BIN);
  const to = Math.ceil((span * 0.7) / BIN);
  let best: [number, number] | null = null;
  let start = -1;
  for (let b = from; b <= to + 1; b++) {
    const empty = b <= to && (bins[b] ?? 0) <= allowed;
    if (empty && start < 0) start = b;
    if (!empty && start >= 0) {
      if (!best || b - start > best[1] - best[0]) best = [start, b];
      start = -1;
    }
  }
  if (!best || (best[1] - best[0]) * BIN < 6) return null;
  const gutter = minX + ((best[0] + best[1]) / 2) * BIN;
  // Obje strane moraju imati stvaran tekst (ne samo broj stranice).
  const left = items.filter((i) => i.x + i.width <= gutter).length;
  const right = items.filter((i) => i.x >= gutter).length;
  return left > items.length * 0.2 && right > items.length * 0.2 ? gutter : null;
}

/** Dokument je dvokolonski ako većina stranica s tekstom ima pojas između kolona. */
export function isTwoColumnDoc(pages: PageItems[]): boolean {
  const withText = pages.filter((p) => p.items.some((i) => i.str.trim()));
  return withText.length > 0 && withText.filter((p) => findGutter(p) !== null).length / withText.length >= 0.5;
}

function toLines(items: TextItem[]): string[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    const tol = Math.max(2, (it.height || 8) * 0.4);
    if (row && Math.abs((row[0] as TextItem).y - it.y) <= tol) row.push(it);
    else rows.push([it]);
  }
  const heights = rows.map((r) => (r[0] as TextItem).height || 10).sort((a, b) => a - b);
  const lineH = heights[Math.floor(heights.length / 2)] ?? 10;

  const out: string[] = [];
  let prevY: number | null = null;
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let line = '';
    let end = -Infinity;
    for (const it of row) {
      const needsSpace = line && !line.endsWith(' ') && !it.str.startsWith(' ') && it.x - end > 0.8;
      line += (needsSpace ? ' ' : '') + it.str;
      end = it.x + it.width;
    }
    const y = (row[0] as TextItem).y;
    // Veći razmak između redova = novi pasus (pomaže dijeljenju na stavove).
    if (prevY !== null && prevY - y > lineH * 1.9) out.push('');
    out.push(line.replace(/\s+/g, ' ').trim());
    prevY = y;
  }
  return out;
}

/** Tekst stranice u redoslijedu čitanja: u dvokolonskom dokumentu prvo lijeva, pa desna kolona. */
export function pageLines(page: PageItems, gutter: number | null): string[] {
  if (gutter === null) return toLines(page.items);
  const crossing = page.items.filter((i) => i.x < gutter - 2 && i.x + i.width > gutter + 2);
  const rest = page.items.filter((i) => !crossing.includes(i));
  const left = rest.filter((i) => i.x + i.width / 2 < gutter);
  const right = rest.filter((i) => i.x + i.width / 2 >= gutter);
  return [...toLines(crossing), ...toLines(left), '', ...toLines(right)];
}

/**
 * Neki PDF-ovi (fontovi glasnika) daju velika slova kao mala usred riječi: "oDLUKU", "KANtoNA".
 * Riječ koja je pretežno velikim slovima pretvaramo u velika slova (osim BiH/FBiH).
 */
export function fixMixedCase(line: string): string {
  return line.replace(/[A-Za-zČĆŠŽĐčćšžđ]{3,}/g, (w) => {
    if (/^F?BiH$/.test(w)) return w;
    const upper = (w.match(/[A-ZČĆŠŽĐ]/g) ?? []).length;
    return upper / w.length >= 0.6 && upper < w.length ? w.toUpperCase() : w;
  });
}

export function documentLines(pages: PageItems[]): string[] {
  const gutters = pages.map(findGutter);
  const found = gutters.filter((g): g is number => g !== null).sort((a, b) => a - b);
  const two = found.length > 0 && found.length / Math.max(1, pages.filter((p) => p.items.some((i) => i.str.trim())).length) >= 0.5;
  // Stranica bez vlastitog pojasa (npr. prva, s velikim zaglavljem) koristi tipičan pojas dokumenta.
  const typical = found[Math.floor(found.length / 2)] ?? null;
  return pages.flatMap((p, i) => [...pageLines(p, two ? gutters[i] ?? typical : null).map(fixMixedCase), '']);
}
