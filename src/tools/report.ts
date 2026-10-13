import { date } from '../format';

/** Zapisnik o protivpravnoj radnji (čl. 65 Zakona o šumama USK): podaci i tekst za štampu/dijeljenje. */
export interface Report {
  id: string;
  createdAt: number;
  date: string; // datum i vrijeme (datetime-local)
  place: string; // mjesto, GJ, odjel/odsjek, parcela
  ownership: 'državna' | 'privatna' | '';
  act: string; // vrsta protivpravne radnje
  offender: string; // ime i prezime
  offenderAddress: string;
  offenderId: string; // broj lične karte / JMB
  vehicle: string; // registracija, vrsta vozila
  trees: string; // vrsta, broj stabala/panjeva, prečnici
  volume: string; // m³
  damage: string; // procjena štete (KM)
  measures: string; // preduzete mjere (žigosano ŠK, drvo zadržano…)
  witnesses: string;
  guard: string; // čuvar šume
  hammer: string; // broj čekića ŠK
  statement: string; // izjava lica
}

export const emptyReport = (): Report => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  place: '', ownership: '', act: '', offender: '', offenderAddress: '', offenderId: '', vehicle: '',
  trees: '', volume: '', damage: '', measures: '', witnesses: '', guard: '', hammer: '', statement: '',
});

export const REPORT_FIELDS: { key: keyof Report; label: string; multiline?: boolean }[] = [
  { key: 'date', label: 'Datum i vrijeme' },
  { key: 'place', label: 'Mjesto (GJ, odjel/odsjek, katastarska parcela, lokalitet)' },
  { key: 'act', label: 'Protivpravna radnja (npr. sječa bez doznake, prevoz bez otpremnog iskaza)', multiline: true },
  { key: 'offender', label: 'Izvršilac – ime i prezime' },
  { key: 'offenderAddress', label: 'Adresa izvršioca' },
  { key: 'offenderId', label: 'Broj lične karte / JMB' },
  { key: 'vehicle', label: 'Prevozno sredstvo i registracija' },
  { key: 'trees', label: 'Vrsta drveta, broj stabala/panjeva, prečnici', multiline: true },
  { key: 'volume', label: 'Količina (m³ / prm)' },
  { key: 'damage', label: 'Procjena štete (KM)' },
  { key: 'measures', label: 'Preduzete mjere (žigosano čekićem ŠK, drvo zadržano/odvezeno…)', multiline: true },
  { key: 'statement', label: 'Izjava lica', multiline: true },
  { key: 'witnesses', label: 'Svjedoci' },
  { key: 'guard', label: 'Čuvar šume (ime i prezime)' },
  { key: 'hammer', label: 'Broj čekića ŠK' },
];

export function reportText(r: Report): string {
  const when = r.date ? date(new Date(r.date), true) : '';
  const lines = REPORT_FIELDS.filter((f) => f.key !== 'date').map((f) => `${f.label}: ${String(r[f.key] || '—')}`);
  return [
    'ZAPISNIK O PROTIVPRAVNOJ RADNJI',
    '(član 65. Zakona o šumama Unsko-sanskog kantona)',
    '',
    `Sačinjen: ${when}`,
    `Vlasništvo šume: ${r.ownership || '—'}`,
    ...lines,
    '',
    'Potpis čuvara šume: ____________________     Potpis lica: ____________________',
  ].join('\n');
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** HTML za štampu; svi korisnički unosi se escapeaju. */
export function reportHtml(r: Report): string {
  const [title, sub, , when, owner] = reportText(r).split('\n');
  // Polja se grade direktno (ne iz teksta), da višeredni unos ne postane lažna oznaka polja.
  const field = (label: string, value: string) => `<div class="l"><b>${esc(label)}:</b> ${esc(value)}</div>`;
  const rest = [
    `<div class="l">${esc(when!)}</div>`,
    `<div class="l">${esc(owner!)}</div>`,
    ...REPORT_FIELDS.filter((f) => f.key !== 'date').map((f) => field(f.label, String(r[f.key] || '—'))),
    '<div class="l">&nbsp;</div>',
    '<div class="l">Potpis čuvara šume: ____________________     Potpis lica: ____________________</div>',
  ];
  return `<!doctype html><html lang="bs"><head><meta charset="utf-8"><title>Zapisnik</title><style>
body{font:12pt/1.45 Georgia,serif;margin:2cm;color:#000}h1{font-size:15pt;text-align:center;margin:0}p.sub{text-align:center;margin:2px 0 18px}
div.l{margin:5px 0;white-space:pre-wrap}div.l b{font-weight:600}</style></head><body>
<h1>${esc(title!)}</h1><p class="sub">${esc(sub!)}</p>${rest.join('')}</body></html>`;
}
