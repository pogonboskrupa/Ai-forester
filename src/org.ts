import { fold } from './text';

/**
 * Profil preduzeća za koje se aplikacija koristi. Ulazi u AI prompt i određuje koji se opći propisi
 * (javna preduzeća, rad, nabavke…) automatski uključuju u izvode kad pitanje govori o "nama".
 */
export const ORG = {
  name: 'ŠPD „Unsko-sanske šume“ d.o.o. Bosanska Krupa',
  short: 'ŠPD „Unsko-sanske šume“',
  kind: 'kantonalno javno šumarsko preduzeće (šumsko-privredno društvo, društvo s ograničenom odgovornošću u vlasništvu Unsko-sanskog kantona)',
  employees: 650, // "preko 650 uposlenih"
} as const;

/** Tekst za system prompt: ko pita i koje se pravne posljedice iz toga izvode. */
export function orgContext(org: typeof ORG = ORG): string {
  return `Kontekst korisnika: pitanja postavljaju zaposlenici ${org.name}, ${org.kind}, s preko ${org.employees} uposlenih. Kad korisnik kaže "mi", "naše preduzeće", "društvo" ili "poslodavac", misli na ovo preduzeće. Imaj na umu da je to:
- javno preduzeće u smislu Zakona o javnim preduzećima FBiH (organi: skupština, nadzorni odbor, uprava, odbor za reviziju; uprava se bira javnim konkursom) i privredno društvo (Zakon o privrednim društvima);
- ugovorni organ koji nabavke provodi po Zakonu o javnim nabavkama BiH;
- poslodavac s više od 30 radnika (obavezan pravilnik o radu, pravo na vijeće zaposlenika, konsultacije kod viška radnika) i s mnogo odvojenih radnih jedinica (šumarije), što je bitno za organizaciju zaštite na radu;
- pravno lice čiji broj zaposlenih prelazi prag za velika pravna lica (razvrstavanje po Zakonu o računovodstvu i reviziji zavisi od dva od tri kriterija: imovina, prihod, broj zaposlenih, pa to treba provjeriti).
Ove činjenice o preduzeću nisu izvor: tvrdnje o propisima potkrepljuj samo izvodima iz poruke.`;
}

/** Ključni opći propisi za "naše" pitanje; id-jevi članova moraju postojati u bazi (provjerava test). */
const ANCHORS: { when: RegExp; ids: string[] }[] = [
  { when: /\bradni[ck]|radni odnos|radno vrijeme|zaposl|uposl|sindikat|vijece zaposlenika|pravilnik o radu|otkaz|visak radnika/, ids: ['fbih-zakon-o-radu#118', 'fbih-zakon-o-radu#119', 'fbih-zakon-o-radu#109'] },
  { when: /nadzorn\w* odbor|uprav\w* (drustva|preduzeca)|direktor|skupstin|javn\w* preduze|odbor za revizij|interna revizij|sukob interes|statut/, ids: ['fbih-zakon-o-javnim-preduzecima#5', 'fbih-zakon-o-javnim-preduzecima#12'] },
  { when: /nabavk|ugovorn\w* organ|tender|ponud/, ids: ['bih-zakon-o-javnim-nabavkama#4', 'fbih-zakon-o-javnim-preduzecima#34'] },
  { when: /zastit\w* na radu|povred\w* na radu|procjen\w* rizika/, ids: ['fbih-zakon-o-zastiti-na-radu#33', 'fbih-zakon-o-zastiti-na-radu#22'] },
  { when: /racunovod|finansijsk\w* izvjestaj|velik\w* pravn/, ids: ['fbih-zakon-o-racunovodstvu-i-reviziji#5', 'fbih-zakon-o-racunovodstvu-i-reviziji#57'] },
];
const SELF = /\b(nas\w*|mi|spd|preduze\w*|drustv\w*|poslodav\w*|firm\w*|obaveze|duzn\w*)\b/;

export const orgAnchorIds = (): string[] => ANCHORS.flatMap((a) => a.ids);

/** Članovi koje treba uključiti u izvode za pitanje o obavezama/uređenju samog preduzeća (najviše max). */
export function orgAnchors(question: string, max = 3): string[] {
  const q = fold(question);
  if (!SELF.test(q)) return [];
  const ids = ANCHORS.filter((a) => a.when.test(q)).flatMap((a) => a.ids);
  return [...new Set(ids)].slice(0, max);
}
