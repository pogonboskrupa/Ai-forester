import { useEffect, useMemo, useState } from 'preact/hooks';
import { renderMarkdown } from '../md';
import { articleById, articles, askAboutArticle, deleteUserLaw, drawerOpen, faq, lawById, laws, libraryFocus, libraryTab, newConversation, openSourceId, searchArticles, sendMessage, toast, view } from '../store';
import { privateUnlocked } from '../private';
import { fold } from '../text';
import { OSTALO, SUBTOPICS, buildSubtopicIndex, faqInSubtopic, type SubtopicId } from '../subtopics';
import type { Article, FaqEntry, Level } from '../types';
import { Icon } from './Icon';
import { LawSummaryCard } from './LawSummary';

const LEVELS: Level[] = ['USK', 'FBiH', 'BiH'];

/** Odgovor s klikabilnim citatima [n] koji otvaraju član u bočnom panelu. */
function FaqAnswer({ f }: { f: FaqEntry }) {
  const onClick = (e: MouseEvent) => {
    const cite = (e.target as HTMLElement).closest<HTMLElement>('[data-cite]');
    const id = cite ? f.sourceIds[Number(cite.dataset.cite) - 1] : undefined;
    if (id) openSourceId.value = id;
  };
  return (
    <>
      <div class="md" onClick={onClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(f.answer, f.sourceIds.length) }} />
      {!f.reviewed && <p class="muted xs">Nacrt odgovora – čeka stručnu provjeru. Uvijek provjerite citirane članove.</p>}
    </>
  );
}

function FaqItem({ f }: { f: FaqEntry }) {
  return (
    <details class="article">
      <summary><span class="grow">{f.q}</span><Icon name="chevron" size={14} class="chev" /></summary>
      <div class="article-body">
        <FaqAnswer f={f} />
        <button class="btn sm" onClick={() => { newConversation(null); void sendMessage(f.q); }}><Icon name="plus" size={14} /> Otvori kao razgovor</button>
      </div>
    </details>
  );
}

const DUTIES_TOPIC = 'Dužnosti';
const ROLE_LABELS: Record<string, string> = {
  'duznosti-lugar': 'Lugar (čuvar šuma)',
  'duznosti-kantonalna-uprava': 'Kantonalna uprava',
  'duznosti-sumarija': 'Šumarija',
  'duznosti-upravnik-sumarije': 'Upravnik šumarije',
  'duznosti-privatni-vlasnik': 'Privatni vlasnik',
};

// Uloga -> radna mjesta iz sistematizacije ŠPD-a (vidljivo samo kad su interni akti otključani).
const ROLE_POSITIONS: Record<string, RegExp> = {
  'duznosti-lugar': /^čuvar šuma/i,
  'duznosti-upravnik-sumarije': /^(?:upravnik|pomoćnik upravnika) – .*šumarij/i,
  'duznosti-sumarija': /– .*šumarij/i,
};
const POSITIONS_LAW = 'spd-opis-poslova-2026';

/** Radna mjesta iz otključane sistematizacije; ista mjesta u više šumarija prikazuju se jednom. */
function RolePositions({ roleId }: { roleId: string }) {
  const re = ROLE_POSITIONS[roleId];
  if (!re) return null;
  const seen = new Set<string>();
  const items = articles.value.filter((a) => {
    if (a.lawId !== POSITIONS_LAW || !re.test(a.heading)) return false;
    const title = a.heading.split(' – ')[0] ?? a.heading;
    if (seen.has(title)) return false;
    seen.add(title);
    return true;
  });
  if (!items.length) return null;
  const many = items.length > 3;
  return (
    <section class="role-positions">
      <h3><span class="badge lvl-ŠPD">ŠPD</span> Iz sistematizacije ŠPD-a (nacrt 2026)</h3>
      {many ? (
        <div class="row gap wrap">
          {items.map((a) => <button key={a.id} class="chip" onClick={() => (openSourceId.value = a.id)}>{a.heading.split(' – ')[0]}</button>)}
        </div>
      ) : (
        items.map((a) => (
          <div key={a.id} class="role-position">
            <strong>{a.heading.split(' – ')[0]}</strong>
            <p class="pre small">{a.text}</p>
          </div>
        ))
      )}
    </section>
  );
}

const SPD_GROUPS = [
  'Organizacija i upravljanje',
  'Rad, sistematizacija i plaće',
  'Disciplinska i materijalna odgovornost',
  'Šumarstvo, zaštita na radu i požari',
  'Finansije i računovodstvo',
  'Kontrola i revizija',
  'Arhiva',
];

/** Interni akti ŠPD-a (otključani šifrom), po grupama, s pretragom samo kroz njih. */
function SpdView() {
  const [term, setTerm] = useState('');
  const acts = laws.value.filter((l) => l.level === 'ŠPD');
  const ids = acts.map((l) => l.id);
  const hits = term.trim().length > 2 ? searchArticles(term, ids, 40) : [];
  const groups = [...SPD_GROUPS, ...new Set(acts.map((l) => l.group ?? 'Ostalo').filter((g) => !SPD_GROUPS.includes(g)))];
  return (
    <div class="spd">
      <p class="muted small">Interni akti ŠPD „Unsko-sanske šume". Nacrti i prijedlozi su označeni u naslovu; provjerite koja verzija je usvojena.</p>
      <div class="searchbox big"><Icon name="search" size={18} /><input placeholder="Pretraži pravilnike ŠPD (npr. godišnji odmor, naknada štete, lugar)…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
      {hits.length > 0 ? (
        <div class="articles">
          <p class="muted small">{hits.length} najrelevantnijih članova</p>
          {hits.map((a) => <ArticleItem key={a.id} a={a} showLaw />)}
        </div>
      ) : (
        groups.map((g) => {
          const inGroup = acts.filter((l) => (l.group ?? 'Ostalo') === g);
          if (!inGroup.length) return null;
          return (
            <section key={g} class="spd-group">
              <h3>{g}</h3>
              <div class="law-grid">
                {inGroup.map((l) => (
                  <button key={l.id} class="law-card" onClick={() => (libraryFocus.value = { lawId: l.id })}>
                    <div class="row gap"><span class="badge lvl-ŠPD">ŠPD</span></div>
                    <strong>{l.title}</strong>
                    <span class="muted xs">{l.gazette} · {l.articleCount} čl.</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

/** Dužnosti po ulogama: pregled sastavljen iz propisa, s citatima. */
function DutiesView() {
  const roles = faq.value.filter((f) => f.topic === DUTIES_TOPIC);
  const [roleId, setRoleId] = useState(roles[0]?.id);
  const role = roles.find((r) => r.id === roleId) ?? roles[0];
  if (!role) return <p class="muted">Nema pripremljenih pregleda dužnosti.</p>;
  return (
    <div class="duties">
      <div class="subtopics" role="tablist" aria-label="Uloge">
        {roles.map((r) => (
          <button key={r.id} role="tab" aria-selected={r.id === role.id} class={`subtopic ${r.id === role.id ? 'on' : ''}`} onClick={() => setRoleId(r.id)}>
            <span>{ROLE_LABELS[r.id] ?? r.q}</span>
          </button>
        ))}
      </div>
      <article class="card duty-card">
        <h2>{role.q}</h2>
        <FaqAnswer f={role} />
        <RolePositions roleId={role.id} />
        <div class="row gap wrap">
          <button class="btn sm" onClick={() => { newConversation(null); void sendMessage(role.q); }}><Icon name="plus" size={14} /> Otvori kao razgovor</button>
        </div>
      </article>
    </div>
  );
}

function FaqList() {
  const topics = [...new Set(faq.value.map((f) => f.topic))].filter((t) => t !== DUTIES_TOPIC);
  return (
    <div class="articles">
      {topics.map((t) => (
        <section key={t} class="faq-group">
          <h3>{t}</h3>
          {faq.value.filter((f) => f.topic === t).map((f) => <FaqItem key={f.id} f={f} />)}
        </section>
      ))}
    </div>
  );
}

function ArticleItem({ a, open, showLaw }: { a: Article; open?: boolean; showLaw?: boolean }) {
  return (
    <details class={`article ${a.amendedBy?.length ? 'outdated' : ''}`} open={open} id={`art-${a.id}`}>
      <summary>
        <span class="art-no">čl. {a.number}</span>
        <span class="grow">{a.heading || (showLaw ? '' : a.text.slice(0, 90) + '…')}{showLaw && <span class="muted small"> · {a.lawTitle}</span>}</span>
        {a.amendedBy?.length ? <span class="pill warn" title="Član je izmijenjen kasnijim zakonom – važeći tekst je u izmjeni">zastarjelo</span> : null}
        <Icon name="chevron" size={14} class="chev" />
      </summary>
      <div class="article-body">
        {(a.amendedBy ?? []).map(articleById).map((m) => m && (
          <div key={m.id} class="amend-current">
            <strong>Važeće – {m.lawTitle} ({m.gazette}), član {m.number}:</strong>{'\n'}{m.text}
          </div>
        ))}
        {a.amendedBy?.length ? <p class="muted xs"><Icon name="alert" size={12} /> Izvorni (zastarjeli) tekst člana {a.number}:</p> : null}
        <p class={`pre ${a.amendedBy?.length ? 'outdated-text' : ''}`}>{a.text}</p>
        <div class="row gap wrap">
          {a.amendedBy?.length ? <button class="btn sm" onClick={() => (openSourceId.value = a.amendedBy![0]!)}><Icon name="alert" size={14} /> Otvori izmjenu</button> : null}
          <button class="btn sm" onClick={() => askAboutArticle(a)}><Icon name="sparkle" size={14} /> Pitaj o ovom članu</button>
        </div>
      </div>
    </details>
  );
}

type Sub = SubtopicId | 'generalno';
const SUB_TABS: { id: Sub; label: string; hint: string }[] = [
  { id: 'generalno', label: 'Generalno šumarstvo', hint: 'Svi propisi iz oblasti šumarstva' },
  ...SUBTOPICS.map((r) => ({ id: r.id, label: r.label, hint: r.hint })),
  { id: OSTALO.id, label: OSTALO.label, hint: OSTALO.hint },
];

/** Članovi jedne podkategorije, grupisani po propisu, uz pripremljene odgovore iz te oblasti. */
function SubtopicView({ items, term }: { items: Article[]; term: string }) {
  const t = fold(term);
  const filtered = t ? items.filter((a) => fold(`${a.heading} ${a.text} ${a.number}`).includes(t)) : items;
  const ids = new Set(items.map((a) => a.id));
  const related = faq.value.filter((f) => faqInSubtopic(f, ids));
  const groups = new Map<string, Article[]>();
  for (const a of filtered) groups.set(a.lawId, [...(groups.get(a.lawId) ?? []), a]);
  return (
    <div class="articles">
      {related.length > 0 && !t && (
        <section class="faq-group">
          <h3>Česta pitanja</h3>
          {related.map((f) => <FaqItem key={f.id} f={f} />)}
        </section>
      )}
      {[...groups].map(([lawId, arts]) => {
        const l = lawById(lawId);
        return (
          <section key={lawId} class="faq-group">
            <h3 class="law-group-title">
              <span class={`badge lvl-${l?.level ?? 'USK'}`}>{l?.level}</span>
              <button class="link" onClick={() => (libraryFocus.value = { lawId })}>{l?.title ?? lawId}</button>
              <span class="muted xs">{arts.length} čl.</span>
            </h3>
            {arts.map((a) => <ArticleItem key={a.id} a={a} />)}
          </section>
        );
      })}
      {filtered.length === 0 && <p class="muted">Nema članova za ovaj upit.</p>}
    </div>
  );
}

export function Library() {
  const [term, setTerm] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState<string | null>('Šumarstvo');
  const tab = libraryTab.value;
  const setTab = (t: typeof tab) => (libraryTab.value = t);
  const [sub, setSub] = useState<Sub>('generalno');
  const subIndex = useMemo(() => buildSubtopicIndex(articles.value, laws.value), [articles.value, laws.value]);
  const forestry = topic === 'Šumarstvo';
  const subItems = forestry && sub !== 'generalno' ? (subIndex.get(sub) ?? []).filter((a) => !level || a.level === level) : null;
  const focus = libraryFocus.value;
  const law = focus ? lawById(focus.lawId) : undefined;

  useEffect(() => {
    if (focus?.articleId) document.getElementById(`art-${focus.articleId}`)?.scrollIntoView({ block: 'center' });
  }, [focus?.articleId]);

  const topics = useMemo(() => [...new Set(laws.value.map((l) => l.topic ?? 'Šumarstvo'))], [laws.value]);
  const shown = laws.value.filter((l) => (!level || l.level === level) && (!topic || (l.topic ?? 'Šumarstvo') === topic));
  const hits = !law && term.trim().length > 2 ? searchArticles(term, shown.map((l) => l.id), 40) : [];
  const t = fold(term);
  const lawArticles = law
    ? articles.value.filter((a) => a.lawId === law.id && (!t || fold(`${a.heading} ${a.text} ${a.number}`).includes(t)))
    : [];

  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        {law ? (
          <button class="btn ghost sm" onClick={() => { libraryFocus.value = null; setTerm(''); }}><Icon name="back" size={16} /> Biblioteka</button>
        ) : (
          <span class="topbar-title">Biblioteka propisa</span>
        )}
        <button class="btn primary sm push-right" onClick={() => (view.value = 'import')}><Icon name="upload" size={14} /> Dodaj PDF</button>
      </header>
      <div class="page-inner">
        {law ? (
          <>
            <div class="law-head">
              <span class={`badge lvl-${law.level}`}>{law.level}</span>
              <h1>{law.title}</h1>
              <p class="muted">{law.gazette} · {law.articleCount} članova</p>
              <div class="row gap wrap">
                {law.sourceUrl && <a class="btn sm" href={law.sourceUrl} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} /> Službeni izvor</a>}
                {law.custom && (
                  <button class="btn danger sm" onClick={() => {
                    if (!confirm(`Obrisati "${law.title}" iz baze? Razgovori ostaju.`)) return;
                    void deleteUserLaw(law.id).then(() => { libraryFocus.value = null; toast('Propis obrisan'); });
                  }}><Icon name="trash" size={14} /> Obriši propis</button>
                )}
              </div>
              {law.notice && <p class="notice"><Icon name="alert" size={14} /> {law.notice}</p>}
              <LawSummaryCard law={law} />
              {law.custom && <p class="muted xs">Dodano iz PDF-a ({law.file}) u ovom pregledniku. Provjerite tekst prema službenom glasniku.</p>}
            </div>
            <div class="searchbox"><Icon name="search" size={16} /><input placeholder="Traži unutar propisa…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
            <div class="articles">
              {lawArticles.map((a) => <ArticleItem key={a.id} a={a} open={a.id === focus?.articleId} />)}
              {lawArticles.length === 0 && <p class="muted">Nema članova za ovaj upit.</p>}
            </div>
          </>
        ) : (
          <>
            <h1>Biblioteka propisa</h1>
            <p class="muted">{laws.value.length} propisa · {articles.value.length} članova · {faq.value.length} pripremljenih odgovora. Radi i bez interneta.</p>
            <div class="segmented" role="tablist">
              <button role="tab" aria-selected={tab === 'laws'} class={tab === 'laws' ? 'on' : ''} onClick={() => setTab('laws')}><Icon name="book" size={16} /> Propisi</button>
              <button role="tab" aria-selected={tab === 'faq'} class={tab === 'faq' ? 'on' : ''} onClick={() => setTab('faq')}><Icon name="check" size={16} /> Pitanja</button>
              <button role="tab" aria-selected={tab === 'duties'} class={tab === 'duties' ? 'on' : ''} onClick={() => setTab('duties')}><Icon name="scale" size={16} /> Dužnosti</button>
              {privateUnlocked.value && <button role="tab" aria-selected={tab === 'spd'} class={tab === 'spd' ? 'on' : ''} onClick={() => setTab('spd')}><Icon name="folder" size={16} /> Pravilnici ŠPD</button>}
            </div>
            {tab === 'faq' ? <FaqList /> : tab === 'duties' ? <DutiesView /> : tab === 'spd' && privateUnlocked.value ? <SpdView /> : <>
            <div class="searchbox big"><Icon name="search" size={18} /><input placeholder="Pretraži sve članove (npr. doznaka, otpremni iskaz, kazna)…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
            <div class="filters scroll-x">
              <button class={`chip ${!level ? 'on' : ''}`} onClick={() => setLevel(null)}>Svi nivoi</button>
              {(laws.value.some((x) => x.level === 'ŠPD') ? [...LEVELS, 'ŠPD' as const] : LEVELS).map((l) => <button key={l} class={`chip ${level === l ? 'on' : ''}`} onClick={() => setLevel(level === l ? null : l)}>{l}</button>)}
              <span class="sep" />
              <button class={`chip ${!topic ? 'on' : ''}`} onClick={() => setTopic(null)}>Sve teme</button>
              {topics.map((tp) => <button key={tp} class={`chip ${topic === tp ? 'on' : ''}`} onClick={() => { setTopic(topic === tp ? null : tp); setSub('generalno'); }}>{tp}</button>)}
            </div>
            {forestry && (
              <div class="subtopics" role="tablist" aria-label="Podkategorije šumarstva">
                {SUB_TABS.map((st) => (
                  <button key={st.id} role="tab" aria-selected={sub === st.id} class={`subtopic ${sub === st.id ? 'on' : ''}`} onClick={() => setSub(st.id)} title={st.hint}>
                    <span>{st.label}</span>
                    <span class="count">{st.id === 'generalno' ? shown.length : (subIndex.get(st.id)?.length ?? 0)}</span>
                  </button>
                ))}
              </div>
            )}
            {forestry && sub !== 'generalno' && <p class="muted small">{SUB_TABS.find((x) => x.id === sub)?.hint}. Članovi su razvrstani po sadržaju; jedan član može biti u više podkategorija.</p>}
            {subItems ? (
              <SubtopicView items={subItems} term={term} />
            ) : hits.length > 0 ? (
              <div class="articles">
                <p class="muted small">{hits.length} najrelevantnijih članova</p>
                {hits.map((a) => <ArticleItem key={a.id} a={a} showLaw />)}
              </div>
            ) : (
              <div class="law-grid">
                {shown.map((l) => (
                  <button key={l.id} class="law-card" onClick={() => libraryFocus.value = { lawId: l.id }}>
                    <div class="row gap"><span class={`badge lvl-${l.level}`}>{l.level}</span><span class="muted xs">{l.topic ?? 'Šumarstvo'}</span>{l.custom && <span class="pill accent">dodano</span>}{l.summary && <span class="pill xs push-right">Rezime</span>}</div>
                    <strong>{l.title}</strong>
                    <span class="muted xs">{l.gazette} · {l.articleCount} čl.</span>
                  </button>
                ))}
              </div>
            )}
            </>}
          </>
        )}
      </div>
    </section>
  );
}
