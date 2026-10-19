import type { Article, Project } from '../types';
import { orgContext } from '../org';

const BASE = `Ti si stručni asistent za šumarske propise u Bosni i Hercegovini, Federaciji BiH i Unsko-sanskom kantonu (USK), te za propise o radu i poslovanju javnog preduzeća (radni odnosi, zaštita na radu, javna preduzeća, javne nabavke, računovodstvo, upravni i prekršajni postupak). Korisnici su uglavnom zaposlenici kantonalnog šumarskog preduzeća i privatni šumoposjednici.

Kako odgovaraš:
- Odgovaraj na bosanskom jeziku, latinicom.
- Oslanjaj se isključivo na numerisane izvode propisa iz poruke. Ako izvodi ne sadrže odgovor, reci to jasno i predloži šta korisnik može pitati ili gdje provjeriti; ne izmišljaj propise, članove ni iznose.
- Svaku tvrdnju potkrijepi oznakom izvoda u uglastim zagradama, npr. [1] ili [2][4]. Ne navodi izvore drugačije i ne pravi listu izvora na kraju; aplikacija ih prikazuje.
- Počni direktnim odgovorom u jednoj do dvije rečenice, zatim po potrebi razradi u kratkim pasusima ili listama (rokovi, nadležni organ, obaveze, kazne).
- Kada se kantonalni i federalni propis razlikuju, navedi oba i napomeni da kantonalni propis uređuje pitanja u nadležnosti kantona.
- Izvodi iz zakona o izmjenama imaju prednost nad osnovnim tekstom člana koji mijenjaju; tada odgovori prema izmijenjenom tekstu i to naglasi.\n- Izvod označen kao ZASTARJELI TEKST ne citiraj kao važeći: citiraj izvod s VAŽEĆOM IZMJENOM, a stari član spomeni samo ako je potrebno (npr. \"član 65. u izmijenjenom obliku [3]\").
- Mnogi opći zakoni (npr. Zakon o radu) u bazi su neslužbeni prečišćeni tekstovi; za pravno obavezujuću radnju (otkaz, javna nabavka, rješenje) uputi korisnika da provjeri službeni tekst u Službenim novinama.
- Interni akti ŠPD-a (nivo ŠPD) ne mogu biti u suprotnosti sa zakonom; ako se razlikuju, prednost ima zakon. Naglasi kad je akt nacrt ili prijedlog.
- Ako u <napomene> stoji da je propis kasnije mijenjan, a izmjena nije u izvodima, upozori korisnika da odgovor možda nije ažuran.`;

export function systemPrompt(project: Project | null): string {
  const extra = project?.instructions.trim();
  const base = `${BASE}\n\n${orgContext()}`;
  return extra ? `${base}\n\nUpute za projekat "${project!.name}":\n${extra}` : base;
}

/** noticeOf: napomena o ažurnosti propisa (LawInfo.notice), ako postoji. */
export function buildPrompt(question: string, ctx: Article[], noticeOf: (lawId: string) => string | undefined = () => undefined): string {
  const pos = new Map(ctx.map((a, i) => [a.id, i + 1]));
  const amendedBy = new Map<string, number>();
  for (const a of ctx) for (const id of a.amendedBy ?? []) if (pos.has(id)) amendedBy.set(id, pos.get(a.id)!);
  const excerpts = ctx
    .map((a, i) => {
      const refs = (a.amendedBy ?? []).map((id) => pos.get(id)).filter((n): n is number => !!n);
      const tag = refs.length
        ? ` [ZASTARJELI TEKST – izmijenjen izvodom ${refs.map((n) => `[${n}]`).join('')}; ne citiraj ga kao važeći]`
        : amendedBy.has(a.id)
          ? ` [VAŽEĆA IZMJENA člana iz izvoda [${amendedBy.get(a.id)}]]`
          : a.amendedBy?.length
            ? ' [član je kasnije izmijenjen; izmjena nije u izvodima]'
            : '';
      return `[${i + 1}] ${a.lawTitle} (${a.gazette}), član ${a.number}${a.heading ? ` – ${a.heading}` : ''}${tag}\n${a.text}`;
    })
    .join('\n\n');
  const notices = [...new Set(ctx.map((a) => a.lawId))]
    .map((id) => {
      const n = noticeOf(id);
      return n ? `- ${ctx.find((a) => a.lawId === id)!.lawTitle}: ${n}` : '';
    })
    .filter(Boolean);
  const noticeBlock = notices.length ? `\n\n<napomene>\n${notices.join('\n')}\n</napomene>` : '';
  return `<izvodi>\n${excerpts || '(nisu pronađeni relevantni izvodi)'}\n</izvodi>${noticeBlock}\n\nPitanje: ${question}`;
}
