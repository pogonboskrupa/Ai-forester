/** Kontrolne liste za teren; svaka stavka upućuje na član propisa iz kojeg proizlazi. */
export interface ChecklistItem {
  text: string;
  source?: string;
}
export interface Checklist {
  id: string;
  title: string;
  who: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: Checklist[] = [
  {
    id: 'doznaka',
    title: 'Doznaka stabala',
    who: 'Doznačar, upravnik šumarije',
    items: [
      { text: 'Doznaku vrši dipl. inž./master šumarstva sa stručnim ispitom kojeg je odredio korisnik šuma (za sanitarnu sječu i izdanačke šume i bačelor/tehničar s 5 godina iskustva)', source: 'usk-zakon-o-sumama#14' },
      { text: 'Imovinsko-pravni odnosi su riješeni, granice utvrđene i vidno obilježene na terenu', source: 'usk-zakon-o-sumama#14' },
      { text: 'Doznaka je u skladu s projektom za izvođenje i godišnjim planom', source: 'usk-zakon-o-sumama#13' },
      { text: 'Stabla su žigosana čekićem za doznaku (šesterokut) i obrojčana na žilištu nakon zatesivanja', source: 'usk-pravilnik-zigosanje-otpremni#7' },
      { text: 'Na strmom terenu strelicom je označen smjer obaranja', source: 'usk-pravilnik-sumski-red#4' },
      { text: 'Podaci su upisani u doznačnu knjigu', source: 'usk-pravilnik-doznaka#5' },
    ],
  },
  {
    id: 'sumski-red',
    title: 'Šumski red nakon sječe',
    who: 'Poslovođa, primač, krojač',
    items: [
      { text: 'Stabla obarana u smjeru najmanje štete; u mladicima prethodno okresane donje grane', source: 'usk-pravilnik-sumski-red#4' },
      { text: 'Visina panja najviše 1/3 promjera panja (na strmom mjereno s gornje strane)', source: 'usk-pravilnik-sumski-red#7' },
      { text: 'Četinari i brijest okorani (1. april – 1. novembar), granje i kora složeni u gromade', source: 'usk-pravilnik-sumski-red#5' },
      { text: 'Gromade nisu na podmlatku, uz dubeća stabla, u vodotocima, iznad izvorišta ni bliže od 10 m od puteva', source: 'usk-pravilnik-sumski-red#5' },
      { text: 'Šteta na šumskom zemljištu sanirana odmah po završetku izvlačenja', source: 'usk-zakon-o-sumama#15' },
      { text: 'Otpad i smeće uklonjeni iz šume', source: 'usk-zakon-o-sumama#34' },
    ],
  },
  {
    id: 'prevoz',
    title: 'Kontrola prevoza drveta',
    who: 'Čuvar šume – lugar',
    items: [
      { text: 'Drvo je žigosano, obrojčano, premjereno i evidentirano prije pomjeranja od panja', source: 'usk-zakon-o-sumama#26' },
      { text: 'Vozač ima otpremni iskaz za cijeli tovar', source: 'usk-zakon-o-sumama#26' },
      { text: 'Otpremni iskaz je važeći (najviše 48 sati, ili produžen uz ovjeru)', source: 'usk-pravilnik-zigosanje-otpremni#14' },
      { text: 'Boja žiga odgovara namjeni (privatne šume: plava – vlastite potrebe, zelena – prodaja)', source: 'usk-pravilnik-zigosanje-otpremni#4' },
      { text: 'Vozač je pokazao lične isprave i isprave za drvo', source: 'usk-zakon-o-sumama#65' },
      { text: 'Kod nepravilnosti: drvo ostavljeno na licu mjesta / odvezeno na određeno mjesto i sačinjen zapisnik', source: 'usk-zakon-o-sumama#65' },
    ],
  },
  {
    id: 'tehnicki-prijem',
    title: 'Tehnički prijem radova',
    who: 'Šumarija, komisija',
    items: [
      { text: 'Zahtjev za tehnički prijem podnesen u roku od 5 dana od završetka radova', source: 'usk-zakon-o-sumama#17' },
      { text: 'Komisija: projektant + dva dipl. inž. iz Uprave za šumarstvo sa stručnim ispitom', source: 'usk-zakon-o-sumama#17' },
      { text: 'Zapisnik konstatuje uspjeh, obim i kvalitet radova po projektu', source: 'usk-zakon-o-sumama#17' },
      { text: 'Utvrđeni nedostaci otklonjeni u roku koji je odredila komisija', source: 'usk-zakon-o-sumama#17' },
      { text: 'Zapisnik dostavljen šumarskom inspektoru u roku od 8 dana', source: 'usk-zakon-o-sumama#17' },
      { text: 'Radovi i nalaz komisije upisani u propisane knjige evidencije', source: 'usk-zakon-o-sumama#17' },
    ],
  },
  {
    id: 'privatna-sjeca',
    title: 'Sječa u privatnoj šumi (vlasnik)',
    who: 'Privatni šumoposjednik',
    items: [
      { text: 'Zemljišnoknjižni izvadak (ili uvjerenje suda + posjedovni list)', source: 'usk-zakon-o-sumama#14' },
      { text: 'Kopija katastarskog plana', source: 'usk-zakon-o-sumama#14' },
      { text: 'Saglasnost svih suvlasnika ovjerena kod notara i izjave vlasnika susjednih parcela', source: 'usk-zakon-o-sumama#14' },
      { text: 'Rješenje Uprave za šumarstvo i izvršena doznaka', source: 'usk-zakon-o-sumama#14' },
      { text: 'Ugovor o stručnim poslovima (naknada najviše 10 % cijene na panju)', source: 'usk-zakon-izmjene-dopune-2016#6' },
      { text: 'Drvo žigosano i otpremni iskaz izdat prije odvoza', source: 'usk-zakon-o-sumama#26' },
    ],
  },
];
