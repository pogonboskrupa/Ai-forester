/** Iz teksta glasnika: čišćenje, stari fontovi, podjela na akte, prijedlog naslova/nivoa/glasnika. */
import type { Level } from '../types';

const LEGACY: Record<string, string> = { '~': 'č', '^': 'Č', '@': 'Ž', '`': 'ž', '[': 'Š', '{': 'š', '\\': 'Đ', '|': 'đ', ']': 'Ć', '}': 'ć' };

/** Stari YU-fontovi (Sl. novine FBiH ~2003–2008) kodiraju č, ć, š, ž, đ kao ~ ^ { } | itd. */
export function fixLegacyFont(text: string): string {
  return /[~^]lan|SLU@BENE|\^lanak/.test(text) ? text.replace(/[~^@`[{\\|\]}]/g, (c) => LEGACY[c] ?? c) : text;
}

const NOISE = new RegExp(
  '^\\s*(?:' +
    [
      'SLUŽBENI GLASNIK.*', 'SLUŽBENE NOVINE.*', 'Unsko-sanskog kantona', 'UNSKO-SANSKOG KANTONA', 'BIHAĆ', 'SARAJEVO',
      'Godina [IVXL]+ ?[-–] ?Broj \\d+.*', 'Izdanje na bosanskom', 'jeziku',
      'Broj \\d+ ?[-–] ?Stran(?:a|ica|e) \\d+', 'Stran(?:a|ica|e) \\d+ ?[-–] ?Broj \\d+',
      '(?:Ponedjeljak|Utorak|Srijeda|Četvrtak|Petak|Subota|Nedjelja),? \\d+\\..*\\d{4}\\.?(?: godine)?',
      '\\d{1,2}\\. [a-zčćšžđ]+ \\d{4}\\.', 'Stranica \\d+', '\\d{1,3}',
    ].join('|') +
    ')\\s*$',
);

export function cleanLines(lines: string[]): string[] {
  return lines
    .filter((l) => !NOISE.test(l))
    .map((l) => l.replace(/^(\s*Član)\s+l\./, '$1 1.'));
}

export interface ActDraft {
  key: string;
  number: string | null; // redni broj akta u glasniku
  title: string;
  text: string;
  articleCount: number;
}

const ACT_START = /^\s*(\d{2,4})\.\s*$/;
const ACT_INTRO = /^\s*(Na osnovu|Na temelju|Temeljem|Član|Člana|Na prijedlog)/;
const KIND = /^(?:PREČIŠĆENI? TEKST\s+)?(ZAKONA?|PRAVILNIK|UREDB[AU]|ODLUK[AU]|NAPUTAK|UPUTSTVO|UPUTA|PROGRAM|RJEŠENJE|POSLOVNIK|CJENOVNIK|INSTRUKCIJ[AU]|NAREDB[AU])\b/;

const sentence = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s);

/** "PRAVILNIK" + "O NAČINU ŽIGOSANJA…" -> "Pravilnik o načinu žigosanja…" */
export function detectTitle(lines: string[]): string {
  const i = lines.findIndex((l) => KIND.test(l.trim()));
  if (i === -1) return '';
  const parts = [lines[i]!.trim()];
  for (const l of lines.slice(i + 1, i + 8)) {
    const t = l.trim();
    if (!t) continue;
    if (/^(Član|Članak|\(1\)|1\.)/.test(t) || /^[IVX]+(\.|\s*[-–]|\s+[A-ZČĆŠŽĐ]|$)/.test(t)) break;
    if (t === t.toUpperCase() || /^o\s/i.test(t)) parts.push(t);
    else break;
  }
  const raw = parts.join(' ').replace(/\s+/g, ' ').replace(/^(\w+)\s+(\w+)\s+/, (m) => m);
  // Zakon/Pravilnik… zadržava veliko početno slovo, ostatak malim slovima (osim skraćenica).
  return sentence(raw.replace(/^PREČIŠĆENI? TEKST\s+/i, ''))
    .replace(/^(Zakona|Odluku|Uredbu|Instrukciju|Naredbu|Uputu)\b/, (w) => ({ Zakona: 'Zakon', Odluku: 'Odluka', Uredbu: 'Uredba', Instrukciju: 'Instrukcija', Naredbu: 'Naredba', Uputu: 'Uputa' })[w] ?? w)
    .replace(/\b(bih|fbih|usk)\b/gi, (m) => m.toUpperCase().replace('BIH', 'BiH').replace('FBIH', 'FBiH'))
    .replace(/unsko-sanskog kantona/gi, 'Unsko-sanskog kantona')
    .replace(/federacij(\w+) bosne i hercegovine/gi, 'Federacij$1 Bosne i Hercegovine')
    .replace(/bosne i hercegovine/gi, 'Bosne i Hercegovine')
    .trim();
}

const countArticles = (text: string) => (text.match(/^\s*(?:Član|Članak)\.?\s*\d+[a-z]?\.?\s*$/gim) ?? []).length;

/** Glasnik s više akata ("627." + "Na osnovu…") dijelimo po aktima; inače je cijeli PDF jedan akt. */
export function splitActs(lines: string[]): ActDraft[] {
  const nextText = (i: number) => lines.slice(i + 1, i + 4).find((l) => l.trim()) ?? '';
  const starts = lines
    .map((l, i) => (ACT_START.test(l) && ACT_INTRO.test(nextText(i)) ? i : -1))
    .filter((i) => i >= 0);
  const ranges: [number, number, string | null][] = starts.length
    ? starts.map((s, k) => [s + 1, starts[k + 1] ?? lines.length, ACT_START.exec(lines[s]!)![1]!])
    : [[0, lines.length, null]];
  return ranges
    .map(([a, b, num], idx) => {
      const body = cleanLines(lines.slice(a, b));
      const text = body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      return { key: `${idx}-${num ?? 'x'}`, number: num, title: detectTitle(body) || 'Propis bez naslova', text, articleCount: countArticles(text) };
    })
    .filter((a) => a.text.length > 200);
}

export interface Meta {
  level: Level;
  gazette: string;
}

/** Prijedlog nivoa i glasnika iz zaglavlja PDF-a (korisnik ga može ispraviti). */
export function detectMeta(headerText: string): Meta {
  const t = headerText.replace(/\s+/g, ' ');
  // 1) "Službene novine Federacije BiH, broj 44/10" na vrhu pojedinačnog akta
  const explicit = /Službene novine[^,]{0,40},\s*broj:?\s*(\d{1,3})\/(\d{2,4})/i.exec(t);
  // 2) zaglavlje glasnika: "Godina XVI - Broj 22" ili "Broj 22 - Strana 1007" + godina iz datuma
  const issue = explicit?.[1] ?? /Godina [IVXL]+ ?[-–] ?Broj (\d{1,3})/i.exec(t)?.[1] ?? /Broj (\d{1,3}) ?[-–] ?Stran/i.exec(t)?.[1];
  const year = explicit?.[2]?.slice(-2) ?? /\b\d{1,2}\.\s*(?:\d{1,2}\.|[a-zčćšž]+)\s*((?:19|20)\d{2})\./i.exec(t)?.[1]?.slice(-2);
  const num = issue && year ? `${issue}/${year}` : '';
  if (/Unsko-sansk/i.test(t)) return { level: 'USK', gazette: num ? `Sl. glasnik USK ${num}` : 'Sl. glasnik USK' };
  if (/Federacije|FBiH/i.test(t)) return { level: 'FBiH', gazette: num ? `Sl. novine FBiH ${num}` : 'Sl. novine FBiH' };
  if (/GLASNIK BiH|Bosne i Hercegovine/i.test(t)) return { level: 'BiH', gazette: num ? `Sl. glasnik BiH ${num}` : 'Sl. glasnik BiH' };
  return { level: 'USK', gazette: num };
}

/** Odluka o starom fontu donosi se za cijeli dokument (pojedini redovi nemaju "~lan"). */
export function fixLegacyLines(lines: string[]): string[] {
  const legacy = lines.some((l) => /[~^]lan|SLU@BENE|\^lanak/.test(l));
  return legacy ? lines.map((l) => l.replace(/[~^@`[{\\|\]}]/g, (c) => LEGACY[c] ?? c)) : lines;
}
