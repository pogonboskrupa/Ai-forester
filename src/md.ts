const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*(?!\s)(.+?)\*(?!\w)/g, '<em>$1</em>')
    .replace(/\[([^\]\n]{3,120}?,\s*član\s*[^\]\n]{1,12})\]/gi, '<span class="cite">$1</span>');

/** Minimalni, siguran markdown (sve se escapuje prije formatiranja). */
export function renderMarkdown(src: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of src.replace(/\r/g, '').split('\n')) {
    const ul = /^\s*[-*•]\s+(.*)/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)/.exec(line);
    const h = /^#{1,4}\s+(.*)/.exec(line);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        close();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul?.[1] ?? ol?.[1]) as string)}</li>`);
    } else {
      close();
      if (h) out.push(`<h4>${inline(h[1] as string)}</h4>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join('');
}
