import { useEffect, useMemo, useState } from 'preact/hooks';
import { renderMarkdown } from '../md';
import { articles, askAboutArticle, drawerOpen, faq, lawById, laws, libraryFocus, openSourceId, searchArticles, sendMessage, newConversation } from '../store';
import { fold } from '../text';
import type { Article, FaqEntry, Level } from '../types';
import { Icon } from './Icon';

const LEVELS: Level[] = ['USK', 'FBiH', 'BiH'];

function FaqItem({ f }: { f: FaqEntry }) {
  const onClick = (e: MouseEvent) => {
    const cite = (e.target as HTMLElement).closest<HTMLElement>('[data-cite]');
    const id = cite ? f.sourceIds[Number(cite.dataset.cite) - 1] : undefined;
    if (id) openSourceId.value = id;
  };
  return (
    <details class="article">
      <summary><span class="grow">{f.q}</span><Icon name="chevron" size={14} class="chev" /></summary>
      <div class="article-body">
        <div class="md" onClick={onClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(f.answer, f.sourceIds.length) }} />
        {!f.reviewed && <p class="muted xs">Nacrt odgovora – čeka stručnu provjeru. Uvijek provjerite citirane članove.</p>}
        <button class="btn sm" onClick={() => { newConversation(null); void sendMessage(f.q); }}><Icon name="plus" size={14} /> Otvori kao razgovor</button>
      </div>
    </details>
  );
}

function FaqList() {
  const topics = [...new Set(faq.value.map((f) => f.topic))];
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
    <details class="article" open={open} id={`art-${a.id}`}>
      <summary>
        <span class="art-no">čl. {a.number}</span>
        <span class="grow">{a.heading || (showLaw ? '' : a.text.slice(0, 90) + '…')}{showLaw && <span class="muted small"> · {a.lawTitle}</span>}</span>
        {a.amendedBy?.length ? <span class="pill warn" title="Član je izmijenjen kasnijim zakonom">izmijenjen</span> : null}
        <Icon name="chevron" size={14} class="chev" />
      </summary>
      <div class="article-body">
        <p class="pre">{a.text}</p>
        <div class="row gap wrap">
          {a.amendedBy?.length ? <button class="btn sm" onClick={() => (openSourceId.value = a.amendedBy![0]!)}><Icon name="alert" size={14} /> Pogledaj izmjenu</button> : null}
          <button class="btn sm" onClick={() => askAboutArticle(a)}><Icon name="sparkle" size={14} /> Pitaj o ovom članu</button>
        </div>
      </div>
    </details>
  );
}

export function Library() {
  const [term, setTerm] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [tab, setTab] = useState<'laws' | 'faq'>('laws');
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
      </header>
      <div class="page-inner">
        {law ? (
          <>
            <div class="law-head">
              <span class={`badge lvl-${law.level}`}>{law.level}</span>
              <h1>{law.title}</h1>
              <p class="muted">{law.gazette} · {law.articleCount} članova</p>
              {law.sourceUrl && <a class="btn sm" href={law.sourceUrl} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} /> Službeni izvor</a>}
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
              <button role="tab" aria-selected={tab === 'faq'} class={tab === 'faq' ? 'on' : ''} onClick={() => setTab('faq')}><Icon name="check" size={16} /> Česta pitanja</button>
            </div>
            {tab === 'faq' ? <FaqList /> : <>
            <div class="searchbox big"><Icon name="search" size={18} /><input placeholder="Pretraži sve članove (npr. doznaka, otpremni iskaz, kazna)…" value={term} onInput={(e) => setTerm(e.currentTarget.value)} /></div>
            <div class="filters">
              <button class={`chip ${!level ? 'on' : ''}`} onClick={() => setLevel(null)}>Svi nivoi</button>
              {LEVELS.map((l) => <button key={l} class={`chip ${level === l ? 'on' : ''}`} onClick={() => setLevel(level === l ? null : l)}>{l}</button>)}
              <span class="sep" />
              <button class={`chip ${!topic ? 'on' : ''}`} onClick={() => setTopic(null)}>Sve teme</button>
              {topics.map((tp) => <button key={tp} class={`chip ${topic === tp ? 'on' : ''}`} onClick={() => setTopic(topic === tp ? null : tp)}>{tp}</button>)}
            </div>
            {hits.length > 0 ? (
              <div class="articles">
                <p class="muted small">{hits.length} najrelevantnijih članova</p>
                {hits.map((a) => <ArticleItem key={a.id} a={a} showLaw />)}
              </div>
            ) : (
              <div class="law-grid">
                {shown.map((l) => (
                  <button key={l.id} class="law-card" onClick={() => libraryFocus.value = { lawId: l.id }}>
                    <div class="row gap"><span class={`badge lvl-${l.level}`}>{l.level}</span><span class="muted xs">{l.topic ?? 'Šumarstvo'}</span></div>
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
