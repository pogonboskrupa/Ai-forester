import { fold } from '../text';

export type Direction = 'ulazni' | 'izlazni' | 'interni';
export type EntryStatus = 'u radu' | 'riješeno' | 'arhivirano';

/** Zapis u djelovodniku (urudžbenom zapisniku): zaprimljeni, poslani i interni akti. */
export interface DocEntry {
  id: string;
  no: string; // "12/2026"
  date: string; // YYYY-MM-DD
  dir: Direction;
  party: string; // pošiljalac / primalac
  subject: string;
  cls: string; // klasifikaciona oznaka (prema internom planu)
  due: string; // rok za postupanje, YYYY-MM-DD ili ""
  assignee: string;
  status: EntryStatus;
  note: string;
}

export const DIRECTIONS: Direction[] = ['ulazni', 'izlazni', 'interni'];
export const STATUSES: EntryStatus[] = ['u radu', 'riješeno', 'arhivirano'];

/** Sljedeći redni broj u godini: "N/GGGG"; jedan niz brojeva za cijelu godinu. */
export function nextNumber(list: readonly Pick<DocEntry, 'no'>[], year: number): string {
  let max = 0;
  for (const e of list) {
    const m = /^(\d+)\/(\d{4})$/.exec(e.no.trim());
    if (m && Number(m[2]) === year) max = Math.max(max, Number(m[1]));
  }
  return `${max + 1}/${year}`;
}

/** Rok je prošao, a akt je još u radu. */
export const isOverdue = (e: Pick<DocEntry, 'due' | 'status'>, todayIso: string): boolean => !!e.due && e.status === 'u radu' && e.due < todayIso;

/** Broj dana do roka (negativan = kasni); null ako nema roka. */
export function daysToDue(due: string, todayIso: string): number | null {
  if (!due) return null;
  const a = Date.UTC(+todayIso.slice(0, 4), +todayIso.slice(5, 7) - 1, +todayIso.slice(8, 10));
  const b = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function filterEntries(list: readonly DocEntry[], term: string, status: EntryStatus | 'sve', dir: Direction | 'sve'): DocEntry[] {
  const t = fold(term.trim());
  return list.filter(
    (e) =>
      (status === 'sve' || e.status === status) &&
      (dir === 'sve' || e.dir === dir) &&
      (!t || fold(`${e.no} ${e.party} ${e.subject} ${e.cls} ${e.assignee} ${e.note}`).includes(t)),
  );
}

export interface LetterFields {
  place: string;
  date: string; // YYYY-MM-DD
  ref: string; // broj akta
  recipient: string;
  subject: string;
  body: string;
  role: string;
  signer: string;
}

/** Datum u obliku "5. 3. 2026." */
export const bsDate = (iso: string): string => (iso ? `${+iso.slice(8, 10)}. ${+iso.slice(5, 7)}. ${iso.slice(0, 4)}.` : '');

export interface Template { id: string; title: string; hint: string; subject: string; body: string; cite?: string }

export const TEMPLATES: Template[] = [
  {
    id: 'dopis', title: 'Dopis (opći)', hint: 'Službeni dopis drugom organu, preduzeću ili licu.',
    subject: 'Predmet: …', body: 'Poštovani,\n\nobraćamo Vam se u vezi s … \n\nMolimo da nam u roku od … dana dostavite … \n\nU prilogu dostavljamo: …\n\nS poštovanjem,',
  },
  {
    id: 'zahtjev', title: 'Zahtjev', hint: 'Zahtjev organu ili instituciji (npr. za izdavanje uvjerenja, saglasnosti, dozvole).',
    subject: 'Zahtjev za …', body: 'Poštovani,\n\nu skladu sa … podnosimo zahtjev za … \n\nObrazloženje: …\n\nUz zahtjev prilažemo: \n1. …\n2. …\n\nZahvaljujemo na saradnji.',
  },
  {
    id: 'pristup', title: 'Odgovor na zahtjev za pristup informaciji', hint: 'Dostava tražene informacije. Rok je najkasnije 15 dana od prijema zahtjeva; za odbijanje se donosi rješenje s pravnom poukom.',
    subject: 'Odgovor na zahtjev za pristup informaciji broj … od …', body: 'Poštovani,\n\npovodom Vašeg zahtjeva za pristup informaciji zaprimljenog dana …, a u skladu sa Zakonom o slobodi pristupa informacijama u Federaciji BiH, dostavljamo Vam tražene informacije u prilogu.\n\nTraženu informaciju možete i neposredno pregledati u prostorijama preduzeća uz prethodnu najavu.\n\nS poštovanjem,',
    cite: 'fbih-zakon-o-slobodi-pristupa-informacijama#14',
  },
  {
    id: 'poziv', title: 'Obavijest / poziv na sastanak', hint: 'Poziv učesnicima s datumom, vremenom, mjestom i dnevnim redom.',
    subject: 'Poziv na sastanak', body: 'Poštovani,\n\npozivamo Vas na sastanak koji će se održati dana … u … sati u …\n\nPredloženi dnevni red:\n1. …\n2. …\n3. Razno\n\nMolimo da potvrdite dolazak.\n\nS poštovanjem,',
  },
  {
    id: 'zapisnik', title: 'Zapisnik sa sastanka', hint: 'Zapisnik sa prisutnima, tokom rasprave, zaključcima i rokovima.',
    subject: 'Zapisnik sa sastanka održanog dana …', body: 'Prisutni: …\nOdsutni: …\nZapisničar: …\n\nSastanak je počeo u … sati. Utvrđen je sljedeći dnevni red:\n1. …\n\nTok sastanka:\n…\n\nZaključci:\n1. … (odgovoran: …, rok: …)\n\nSastanak je završen u … sati.',
  },
  {
    id: 'ovlastenje', title: 'Ovlaštenje', hint: 'Ovlaštenje zaposleniku da u ime preduzeća obavi određenu radnju.',
    subject: 'OVLAŠTENJE', body: 'Ovlašćuje se … (ime i prezime, radno mjesto), da u ime i za račun ŠPD „Unsko-sanske šume“ d.o.o. Bosanska Krupa preduzme sljedeće radnje: …\n\nOvlaštenje važi do … / do opoziva.\n\nOvlaštenje se izdaje radi … i ne može se koristiti u druge svrhe.',
  },
  {
    id: 'zabiljeska', title: 'Službena zabilješka', hint: 'Interni zapis o događaju, razgovoru ili utvrđenom stanju.',
    subject: 'Službena zabilješka', body: 'Dana … u … sati, … (opis događaja / utvrđenog stanja).\n\nPrisutni: …\n\nZabilješku sačinio:',
  },
];
