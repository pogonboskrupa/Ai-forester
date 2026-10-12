const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** [1] ili [1, 3] ili [1][2] -> klikabilni citati; broj mora postojati među izvorima. */
function cites(html: string, maxCite: number): string {
  return html.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g, (m, list: string) => {
    const nums = list.split(',').map((n) => Number(n.trim()));
    if (nums.some((n) => n < 1 || n > maxCite)) return m;
    return nums.map((n) => `<button type="button" class="cite" data-cite="${n}">${n}</button>`).join('');
  });
}

const inline = (s: string, maxCite: number) =>
  cites(
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<![*\w])\*(?!\s)(.+?)\*(?!\w)/g, '<em>$1</em>')
      .replace(/(?<!\w)_(?!\s)(.+?)_(?!\w)/g, '<em>$1</em>'),
    maxCite,
  );

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Siguran markdown: sve se escapuje prije formatiranja. Podržava naslove, liste, tabele, citate. */
export function renderMarkdown(src: string, maxCite = 0): string {
  const lines = src.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (isTableRow(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      closeList();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i] as string)) rows.push(cells(lines[i++] as string));
      i--;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${inline(h, maxCite)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c, maxCite)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }
    const ul = /^\s*[-*•]\s+(.*)/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)/.exec(line);
    const h = /^(#{1,4})\s+(.*)/.exec(line);
    const quote = /^>\s?(.*)/.exec(line);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul?.[1] ?? ol?.[1]) as string, maxCite)}</li>`);
      continue;
    }
    closeList();
    if (h) out.push(`<h4>${inline(h[2] as string, maxCite)}</h4>`);
    else if (quote) out.push(`<blockquote>${inline(quote[1] as string, maxCite)}</blockquote>`);
    else if (/^\s*(---|\*\*\*)\s*$/.test(line)) out.push('<hr>');
    else if (line.trim()) out.push(`<p>${inline(line, maxCite)}</p>`);
  }
  closeList();
  return out.join('');
}

/** Brojevi izvora koje odgovor citira ([1], [2, 3]...). */
export function citedNumbers(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g)) {
    for (const n of (m[1] as string).split(',')) out.add(Number(n.trim()));
  }
  return out;
}
