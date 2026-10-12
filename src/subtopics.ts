/**
 * Podkategorije unutar teme "Šumarstvo". Jedan zakon pokriva više tema, pa se dijele članovi:
 * cijeli posvećeni propisi + članovi drugih propisa prepoznati po sadržaju. Član može biti u više podkategorija.
 */
import type { Article, FaqEntry, LawInfo } from './types';

export type SubtopicId =
  | 'planiranje'
  | 'sjeca'
  | 'uzgoj'
  | 'zastita'
  | 'promet'
  | 'koristenje'
  | 'vlasnistvo'
  | 'naknade'
  | 'nadzor'
  | 'ostalo';

interface Rule {
  id: Exclude<SubtopicId, 'ostalo'>;
  label: string;
  hint: string;
  laws: string[]; // propisi koji u cijelosti pripadaju podkategoriji
  re: RegExp; // prepoznavanje po naslovu/tekstu člana; zastavica u zbog (?<!\p{L}) granica riječi
}

// Redoslijed prati tok posla u gazdovanju: plan -> doznaka i sječa -> obnova -> zaštita -> promet drveta.
export const SUBTOPICS: Rule[] = [
  {
    id: 'planiranje',
    label: 'Planiranje i gospodarenje',
    hint: 'Šumarski program, šumskoprivredne osnove, projekti za izvođenje, katastar, stručni ispit',
    laws: [],
    re: /(?:sadržaj|izrad|donošenj|odobravanj|važenj)\w* šumsk\w*[- ]?privredn\w* osnov|šumsk\w*[- ]?privredn\w* područ|šumarsk\w* program|razvojn\w* plan|projek\w* za izvođenj|katast\w* šum|inventur|(?<!\p{L})etat|plan\w* gospodarenj|tehničk\w* prijem|stručn\w* šumarsk\w* ispit|radov\w* u šumarstvu/iu,
  },
  {
    id: 'sjeca',
    label: 'Doznaka i sječa',
    hint: 'Odabiranje i doznaka stabala, sječa, prorjede, rokovi sječe',
    laws: ['usk-pravilnik-doznaka'],
    re: /doznak|doznač|(?<!\p{L})sječ|prorjed|sječin/iu,
  },
  {
    id: 'uzgoj',
    label: 'Uzgoj, obnova i pošumljavanje',
    hint: 'Obnova i njega šuma, pošumljavanje, sjeme i sadnice, krš i goleti',
    laws: [],
    re: /pošum|uzgoj|sadnic|sadn\w* materijal|sjemen|obnov\w* šum|prirodn\w* obnov|biološk\w* (?:obnov|reprodukc)|njeg\w* (?:šum|sastoj|mlad)|rasadn|materijal\w* za reprodukc|(?<!\p{L})krš|golet/iu,
  },
  {
    id: 'zastita',
    label: 'Zaštita šuma i šumski red',
    hint: 'Požari, štetnici i bolesti, sanitarne mjere, nepogode, šumski red i otpad',
    laws: ['usk-pravilnik-sumski-red'],
    re: /šumsk\w* red|preventivn|požar|paljevin|paljik|štetn\w* (?:organiz|insekt)|potkornj|bolest|zdravstven\w* stanj|sanitarn|nepogod|vjetroizval|snjegolom|hemijsk\w* sredst|otpad|smeć|zaštitn\w* šum|zaštit\w* šum/iu,
  },
  {
    id: 'promet',
    label: 'Promet i transport drveta',
    hint: 'Žigosanje i šumski čekići, otpremni iskaz, prijevoz, prodaja sortimenata',
    laws: ['usk-pravilnik-zigosanje-otpremni', 'fbih-odluka-prodaja-sortimenata'],
    re: /otpremn|žigos|čekić|obrojč|prijevoz|prevoz|transport|promet\w* (?:drv|šumsk)|prodaj\w* (?:drv|šumsk)|sortiment|utovar|stovari|privlačen|izvlačen/iu,
  },
  {
    id: 'koristenje',
    label: 'Korištenje šuma i zemljišta',
    hint: 'Paša, žirenje, nedrvni proizvodi, zakup, krčenje, gradnja, saobraćaj i pristup šumi',
    laws: ['usk-pravilnik-pasa-sekundarni', 'usk-odluka-zakup-sumskog-zemljista'],
    re: /(?<!\p{L})paš[aeiu]|pašar|žiren|(?<!\p{L})brst|kresan|nedrvn|sporedn\w* šumsk|gljiv|ljekovit\w* bilj|zakup|krčenj|gradnj\w* u šum|izdvajanj|promjen\w* namjen|saobraćaj\w* u šum|pristup\w* šum|šumsk\w* (?:cest|put)/iu,
  },
  {
    id: 'vlasnistvo',
    label: 'Vlasništvo i privatne šume',
    hint: 'Državne i privatne šume, šumoposjednici, granice, prava trećih lica',
    laws: [],
    re: /privatn\w* šum|šumoposjednik|vlasni\w* privatn|sticanj\w* vlasn|granic\w* držav\w* šum|prav\w* trećih|susjedn\w* parcel|promet\w* šuma|upravljanj\w* (?:državn|privatn)\w* šum/iu,
  },
  {
    id: 'naknade',
    label: 'Naknade i finansiranje',
    hint: 'Naknade za korištenje i općekorisne funkcije šuma, namjenska sredstva',
    laws: ['fbih-naputak-naknade-sume'],
    re: /naknad|namjensk\w* sredst|općekorisn|opštekorisn|finansir|budžet/iu,
  },
  {
    id: 'nadzor',
    label: 'Uprava, čuvari i nadzor',
    hint: 'Uprava za šumarstvo, čuvarska služba, inspekcija, prekršaji i kazne',
    laws: ['usk-pravilnik-cuvari'],
    re: /čuvar|čuvanj\w* šum|inspektor|inspekcijsk|upravn\w* nadzor|uprav\w* za šumarstvo|prekršaj|novčan\w* kazn|kaznit/iu,
  },
];

export const OSTALO = { id: 'ostalo' as const, label: 'Ostalo', hint: 'Opće odredbe, definicije, prijelazne i završne odredbe' };

const PENALTY = /kaznen\w* odredb|novčan\w* kazn\w* od|kaznit\w* će se/iu;
const GENERAL =
  /definicij\w* (?:pojm|šum)|značenj\w* (?:pojedin\w* )?izraz|pojedin\w* izraz\w* upotrijebljen|podzakonsk\w* akt|prelazn\w* (?:i završn\w* )?odredb|stupa\w* na snagu|prestaj\w* (?:da )?važ/iu;

const isForestry = (law: LawInfo | undefined) => (law?.topic ?? 'Šumarstvo') === 'Šumarstvo';

/** Naslov člana; u dijelu propisa naslov je u zagradi na početku teksta, npr. "(Ovlaštenja inspektora) (1) ...". */
function headingOf(a: Article): string {
  return a.heading || (/^\s*\(([^()]{3,90})\)/.exec(a.text)?.[1] ?? '');
}

/** Podkategorije člana (prazno ako član nije iz teme Šumarstvo). */
export function subtopicsOf(a: Article, law: LawInfo | undefined): SubtopicId[] {
  if (!isForestry(law)) return [];
  const heading = headingOf(a);
  const start = a.text.slice(0, 200);
  // Kaznene, prijelazne i definicijske odredbe nabrajaju sve teme pa bi upale svugdje.
  if (PENALTY.test(heading) || PENALTY.test(start)) return ['nadzor'];
  if (GENERAL.test(heading) || GENERAL.test(start)) return ['ostalo'];

  const dedicated = SUBTOPICS.filter((r) => r.laws.includes(a.lawId) || (law?.amends !== undefined && r.laws.includes(law.amends)));
  // Naslov je najpouzdaniji signal; tek bez pogotka u naslovu gleda se tekst (tema bar dvaput, usputni pomen nije dovoljan).
  let matched = heading ? SUBTOPICS.filter((r) => r.re.test(heading)) : [];
  if (!matched.length) matched = SUBTOPICS.filter((r) => (a.text.match(new RegExp(r.re.source, `${r.re.flags}g`))?.length ?? 0) >= 2);
  const ids = [...new Set([...dedicated, ...matched].map((r) => r.id))];
  return ids.length ? ids : ['ostalo'];
}

/** Indeks: podkategorija -> članovi (računa se jednom po promjeni baze). */
export function buildSubtopicIndex(articles: Article[], laws: LawInfo[]): Map<SubtopicId, Article[]> {
  const lawMap = new Map(laws.map((l) => [l.id, l]));
  const out = new Map<SubtopicId, Article[]>([...SUBTOPICS.map((r) => [r.id, []] as [SubtopicId, Article[]]), ['ostalo', []]]);
  for (const a of articles) for (const id of subtopicsOf(a, lawMap.get(a.lawId))) out.get(id)!.push(a);
  return out;
}

/** Pripremljeni odgovor pripada podkategoriji ako joj pripada većina njegovih izvora. */
export function faqInSubtopic(f: FaqEntry, ids: Set<string>): boolean {
  if (!f.sourceIds.length) return false;
  return f.sourceIds.filter((id) => ids.has(id)).length / f.sourceIds.length >= 0.5;
}
