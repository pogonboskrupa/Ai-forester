import { date } from '../format';

/** Rokovi iz propisa: godišnji (fiksni datum), sezonski i rokovi koji teku od nekog događaja. */

export interface AnnualDeadline {
  month: number; // 1–12
  day: number;
  title: string;
  who: string;
  source: string; // id člana
}

export interface Season {
  from: [number, number]; // [mjesec, dan]
  to: [number, number];
  title: string;
  source: string;
}

export interface EventDeadline {
  event: string;
  title: string;
  amount: number;
  unit: 'h' | 'd' | 'y';
  source: string;
}

export const ANNUAL: AnnualDeadline[] = [
  { month: 2, day: 1, title: 'Evidencije o radovima u privatnim šumama za prethodnu godinu moraju biti upisane', who: 'Uprava za šumarstvo / pravno lice za privatne šume', source: 'usk-zakon-izmjene-dopune-2016#6' },
  { month: 2, day: 28, title: 'Dostava evidencija o izvršenim radovima za prethodnu godinu Upravi za šumarstvo', who: 'Korisnik šuma (ŠPD)', source: 'usk-zakon-o-sumama#52' },
  { month: 2, day: 28, title: 'Dostava evidencija za privatne šume kantonalnom ministarstvu', who: 'Pravno lice za stručne poslove u privatnim šumama', source: 'usk-zakon-izmjene-dopune-2016#6' },
  { month: 12, day: 1, title: 'Dostava godišnjeg plana realizacije ŠPO za narednu godinu Ministarstvu', who: 'Korisnik šuma (ŠPD)', source: 'usk-zakon-o-sumama#12' },
  { month: 12, day: 31, title: 'Donošenje Osnovnog cjenovnika šumskih drvnih sortimenata za narednu godinu', who: 'Korisnik šuma (ŠPD)', source: 'usk-zakon-o-sumama#12' },
];

export const SEASONS: Season[] = [
  { from: [4, 1], to: [11, 1], title: 'Obavezno koranje oblovine i panjeva četinara i brijesta', source: 'usk-pravilnik-sumski-red#5' },
  { from: [4, 1], to: [11, 1], title: 'Period vegetacije: posebna pravila za skladištenje i promet drveta četinara i brijesta', source: 'usk-zakon-o-sumama#80' },
];

export const EVENTS: EventDeadline[] = [
  { event: 'Izdavanje otpremnog iskaza', title: 'Najduži rok važenja otpremnog iskaza', amount: 48, unit: 'h', source: 'usk-pravilnik-zigosanje-otpremni#14' },
  { event: 'Završetak radova po projektu', title: 'Zahtjev za tehnički prijem radova', amount: 5, unit: 'd', source: 'usk-zakon-o-sumama#17' },
  { event: 'Završetak radova po projektu', title: 'Tehnički prijem radova (najkasnije)', amount: 30, unit: 'd', source: 'usk-zakon-o-sumama#17' },
  { event: 'Završetak pregleda komisije za tehnički prijem', title: 'Dostava zapisnika šumarskom inspektoru', amount: 8, unit: 'd', source: 'usk-zakon-o-sumama#17' },
  { event: 'Završetak radova pošumljavanja', title: 'Tehnički prijem pošumljavanja (kolaudacija)', amount: 2, unit: 'y', source: 'usk-zakon-o-sumama#17' },
  { event: 'Donošenje projekta za izvođenje', title: 'Izvršenje radova predviđenih projektom', amount: 2, unit: 'y', source: 'usk-zakon-o-sumama#13' },
  { event: 'Čista sječa ili šumski požar', title: 'Pošumljavanje sječine / paljevine', amount: 2, unit: 'y', source: 'usk-zakon-o-sumama#21' },
  { event: 'Prijem rješenja Uprave za šumarstvo (doznaka u privatnoj šumi)', title: 'Žalba Ministarstvu', amount: 15, unit: 'd', source: 'usk-zakon-o-sumama#14' },
  { event: 'Prijem zahtjeva za mišljenje (izrada ŠPO)', title: 'Mišljenje jedinice lokalne samouprave i organa za vode', amount: 30, unit: 'd', source: 'usk-zakon-o-sumama#10' },
];

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const addYears = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
};

/** Sljedeći datum godišnjeg roka (danas se računa kao još važeći). */
export function nextAnnual(today: Date, month: number, day: number): Date {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(t.getFullYear(), month - 1, day);
  return d < t ? new Date(t.getFullYear() + 1, month - 1, day) : d;
}

export function eventDue(start: Date, e: EventDeadline): Date {
  if (e.unit === 'h') return new Date(start.getTime() + e.amount * 3600_000);
  return e.unit === 'd' ? addDays(start, e.amount) : addYears(start, e.amount);
}

export const inSeason = (today: Date, s: Season): boolean => {
  const md = (m: number, d: number) => m * 100 + d;
  const now = md(today.getMonth() + 1, today.getDate());
  return now >= md(...s.from) && now < md(...s.to);
};

export const daysUntil = (today: Date, d: Date): number =>
  Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);

export const fmtDate = (d: Date, withTime = false): string => date(d, withTime);
