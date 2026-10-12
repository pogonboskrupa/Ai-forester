import type { Article } from '../types';

/** Jedan prekršaj iz kaznenih odredbi: ko, koliki raspon, šta je učinjeno, uz izvor. */
export interface Offence {
  articleId: string;
  lawTitle: string;
  articleNo: string;
  subject: string; // "pravno lice", "fizičko lice", …
  min: number;
  max: number;
  item: string; // tekst tačke
  responsible?: { min: number; max: number }; // kazna za odgovorno lice u pravnom licu
}

const KM = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const RANGE = /kazn\w*\s+(?:u\s+(?:iznosu|visini)\s+)?od\s+([\d.,]+)\s*(?:KM\s*)?(?:do|–|-)\s*([\d.,]+)\s*KM/i;

function subjectOf(text: string): string {
  const head = text.slice(0, 260).toLowerCase();
  if (/fizičk\w* lic/.test(head)) return 'fizičko lice';
  if (/odgovorn\w* lic/.test(head) && !/pravn\w* lic/.test(head)) return 'odgovorno lice';
  if (/korisnik|pravn\w* lic/.test(head)) return 'pravno lice / korisnik šuma';
  if (/samostaln\w* djelatnost|obrt/.test(head)) return 'samostalni privrednik';
  return 'lice';
}

/** Tačke "1. … 2. …" iz prvog stava; tekst se reflow-uje jer PDF lomi redove usred rečenice. */
function items(text: string): string[] {
  const body = text.replace(/\(2\)[\s\S]*$/, '').replace(/\n(?!\d{1,2}\.\s)/g, ' ');
  return [...body.matchAll(/(?:^|\n)(\d{1,2})\.\s+([^\n]+)/g)]
    .map((m) => m[2]!.replace(/\s+/g, ' ').replace(/[;.]\s*$/, '').trim())
    .filter((t) => t.length > 8);
}

/** Prekršaji iz članova s kaznenim odredbama (prepoznaje "Novčanom kaznom od X do Y KM kaznit će se …"). */
export function parseOffences(articles: Article[]): Offence[] {
  const out: Offence[] = [];
  for (const a of articles) {
    const m = RANGE.exec(a.text);
    if (!m || !/kaznit/i.test(a.text)) continue;
    const resp = /\(2\)[\s\S]*?od\s+([\d.,]+)\s*(?:KM\s*)?(?:do|–|-)\s*([\d.,]+)\s*KM[\s\S]*?odgovorn/i.exec(a.text);
    const base = {
      articleId: a.id,
      lawTitle: a.lawTitle,
      articleNo: a.number,
      subject: subjectOf(a.text),
      min: KM(m[1]!),
      max: KM(m[2]!),
      ...(resp ? { responsible: { min: KM(resp[1]!), max: KM(resp[2]!) } } : {}),
    };
    const list = items(a.text);
    if (list.length) list.forEach((item) => out.push({ ...base, item }));
    else out.push({ ...base, item: a.text.slice(0, 220).replace(/\s+/g, ' ') });
  }
  return out;
}
