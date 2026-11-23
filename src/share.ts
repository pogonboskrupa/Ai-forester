import { citedNumbers } from './md';

export interface ShareSource {
  lawTitle: string;
  number: string;
  gazette: string;
}

/** Markdown odgovora u običan tekst koji se dobro čita u Viberu, WhatsAppu ili mailu. */
function plain(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)[*_](\S(?:.*?\S)?)[*_](?!\w)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Pitanje, odgovor i izvori (samo citirani; ako citata nema, svi) kao tekst za dijeljenje. */
export function shareText(question: string, answer: string, sources: ShareSource[]): string {
  const cited = citedNumbers(answer);
  const list = sources
    .map((s, i) => ({ s, n: i + 1 }))
    .filter(({ n }) => !cited.size || cited.has(n))
    .map(({ s, n }) => `[${n}] ${s.lawTitle}, član ${s.number} (${s.gazette})`);
  return [
    question.trim() ? `Pitanje: ${question.trim()}` : '',
    plain(answer),
    list.length ? `Izvori:\n${list.join('\n')}` : '',
    '— Forester, informativno; provjerite službeni tekst.',
  ].filter(Boolean).join('\n\n');
}
