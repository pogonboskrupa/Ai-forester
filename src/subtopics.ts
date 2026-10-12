/**
 * Podkategorije unutar teme "Šumarstvo". Jedan zakon pokriva više tema, pa se dijele članovi:
 * cijeli posvećeni propisi + članovi drugih propisa prepoznati po sadržaju. Član može biti u više podkategorija.
 */
import type { Article, FaqEntry, LawInfo } from './types';

export type SubtopicId = 'transport' | 'sumski-red' | 'uzgoj' | 'ostalo';

interface Rule {
  id: SubtopicId;
  label: string;
  hint: string;
  laws: string[]; // propisi koji u cijelosti pripadaju podkategoriji
  re: RegExp; // prepoznavanje po naslovu/tekstu člana
}

export const SUBTOPICS: Rule[] = [
  {
    id: 'transport',
    label: 'Transport drvne mase',
    hint: 'Žigosanje, obrojčavanje, otpremni iskaz, promet i prijevoz drveta',
    laws: ['usk-pravilnik-zigosanje-otpremni'],
    re: /otpremn|žigos|šumsk\w* čekić|prijevoz|prevoz|transport|promet\w* (?:drv|šumsk)|utovar|stovari|izvoz\w* šumsk|privlačen|izvlačen/i,
  },
  {
    id: 'sumski-red',
    label: 'Šumski red',
    hint: 'Uspostavljanje i održavanje šumskog reda, otpad, panjevi, sanitarne mjere',
    laws: ['usk-pravilnik-sumski-red'],
    re: /šumsk\w* red|odlaganj\w* (?:i paljenj\w* )?smeć|smeće|zagađujuć|otpad\w* (?:u|iz) šum|visin\w* panj|koranj|skidanj\w* kore|sanitarn\w* (?:sječ|mjer)/i,
  },
  {
    id: 'uzgoj',
    label: 'Uzgoj i pošumljavanje',
    hint: 'Doznaka i sječa, obnova, pošumljavanje, njega, sjeme i sadnice, krš',
    laws: ['usk-pravilnik-doznaka'],
    re: /pošum|uzgoj|sadnic|sadn\w* materijal|sjemen|obnov\w* šum|prirodn\w* obnov|biološk\w* obnov|njeg\w* (?:šum|sastoj|mlad)|doznak|doznač|sječ|prorjed|rasadn|reprodukc|krš|golet/i,
  },
];

export const OSTALO = { id: 'ostalo' as const, label: 'Ostalo', hint: 'Upravljanje, planiranje, naknade, nadzor, kazne i ostale odredbe' };

const isForestry = (law: LawInfo | undefined) => (law?.topic ?? 'Šumarstvo') === 'Šumarstvo';

/** Podkategorije člana (prazno ako član nije iz teme Šumarstvo). */
export function subtopicsOf(a: Article, law: LawInfo | undefined): SubtopicId[] {
  if (!isForestry(law)) return [];
  // Član pripada temi ako mu naslov odgovara ili je tema u tekstu bar dvaput (usputni pomen nije dovoljan).
  const matches = (r: Rule) => r.re.test(a.heading) || (a.text.match(new RegExp(r.re.source, 'gi'))?.length ?? 0) >= 2;
  const ids = SUBTOPICS.filter((r) => r.laws.includes(a.lawId) || (law?.amends && r.laws.includes(law.amends)) || matches(r)).map((r) => r.id);
  return ids.length ? ids : ['ostalo'];
}

/** Indeks: podkategorija -> članovi (računa se jednom po promjeni baze). */
export function buildSubtopicIndex(articles: Article[], laws: LawInfo[]): Map<SubtopicId, Article[]> {
  const lawMap = new Map(laws.map((l) => [l.id, l]));
  const out = new Map<SubtopicId, Article[]>([['transport', []], ['sumski-red', []], ['uzgoj', []], ['ostalo', []]]);
  for (const a of articles) for (const id of subtopicsOf(a, lawMap.get(a.lawId))) out.get(id)!.push(a);
  return out;
}

/** Pripremljeni odgovor pripada podkategoriji ako joj pripada većina njegovih izvora. */
export function faqInSubtopic(f: FaqEntry, ids: Set<string>): boolean {
  if (!f.sourceIds.length) return false;
  return f.sourceIds.filter((id) => ids.has(id)).length / f.sourceIds.length >= 0.5;
}
