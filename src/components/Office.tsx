import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { faq, laws, libraryFocus, libraryTab, drawerOpen, view } from '../store';
import { load } from '../storage';
import { bsDate, daysToDue, isOverdue, type DocEntry } from '../tools/office';
import { Icon, type IconName } from './Icon';
import { OFFICE_TOPIC, Djelovodnik, Pitanja, Predlosci } from './tools/Kancelarija';
import { today } from './tools/shared';

export type OfficeTab = 'pregled' | 'djelovodnik' | 'predlosci' | 'pitanja' | 'propisi';
export const officeTab = signal<OfficeTab>('pregled');

const TABS: { id: OfficeTab; label: string; icon: IconName }[] = [
  { id: 'pregled', label: 'Pregled', icon: 'book' },
  { id: 'djelovodnik', label: 'Djelovodnik', icon: 'folder' },
  { id: 'predlosci', label: 'Predlošci akata', icon: 'edit' },
  { id: 'pitanja', label: 'Pitanja i pravila', icon: 'check' },
  { id: 'propisi', label: 'Propisi', icon: 'scale' },
];

/** Propisi koji se najčešće primjenjuju u kancelarijskom poslovanju (uz sve iz teme "Kancelarijsko poslovanje"). */
const RELATED_LAWS = new Set(['fbih-zakon-o-upravnom-postupku', 'fbih-zakon-o-slobodi-pristupa-informacijama', 'fbih-zakon-o-javnim-preduzecima', 'spd-odabiranje-arhivske-grade']);

/** Zapisi djelovodnika se čuvaju na uređaju; hook ih čita za pregled i brojke. */
function useEntries(): DocEntry[] {
  const [list, setList] = useState<DocEntry[]>([]);
  useEffect(() => {
    void load<DocEntry>('kanc-djelovodnik').then(setList);
  }, [officeTab.value]);
  return list;
}

function stats(list: DocEntry[]) {
  const now = today();
  const open = list.filter((e) => e.status === 'u radu');
  const late = list.filter((e) => isOverdue(e, now));
  const soon = open.filter((e) => e.due && !isOverdue(e, now) && (daysToDue(e.due, now) ?? 99) <= 7);
  return { open, late, soon, now };
}

function Pregled({ list }: { list: DocEntry[] }) {
  const { late, soon, now } = stats(list);
  const attention = [...late, ...soon].sort((a, b) => a.due.localeCompare(b.due));
  const tiles: { tab: OfficeTab; icon: IconName; t: string; d: string }[] = [
    { tab: 'djelovodnik', icon: 'folder', t: 'Djelovodnik', d: 'Zavedi ulazni, izlazni ili interni akt; prati rokove i zaduženja.' },
    { tab: 'predlosci', icon: 'edit', t: 'Predlošci akata', d: 'Dopis, zahtjev, ovlaštenje, zapisnik – sa zaglavljem i štampom.' },
    { tab: 'pitanja', icon: 'check', t: 'Pitanja i pravila', d: 'Rokovi rješavanja, dostava, e-potpis, lični podaci.' },
    { tab: 'propisi', icon: 'scale', t: 'Propisi', d: 'Zakoni i rezimei koji se primjenjuju u kancelariji.' },
  ];
  return (
    <div class="proc-stack">
      <section class="proc-card">
        <h3><Icon name="alert" size={16} /> Zahtijeva pažnju</h3>
        {attention.length ? (
          <div class="office-list">
            {attention.map((e) => {
              const left = daysToDue(e.due, now)!;
              return (
                <button key={e.id} class={`office-item ${left < 0 ? 'late' : ''}`} onClick={() => (officeTab.value = 'djelovodnik')}>
                  <span class="office-no">{e.no}</span>
                  <span class="office-body"><strong>{e.subject}</strong><small class="muted">rok {bsDate(e.due)}{e.assignee ? ` · ${e.assignee}` : ''}</small></span>
                  <span class={`pill xs ${left < 0 ? 'warn' : ''}`}>{left < 0 ? `kasni ${-left} d.` : left === 0 ? 'danas' : `još ${left} d.`}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p class="muted">{list.length ? 'Nema akata kojima je rok prošao ili ističe u narednih 7 dana.' : 'Djelovodnik je prazan. Zavedite prvi akt da biste pratili rokove.'}</p>
        )}
      </section>
      <div class="proc-grid">
        {tiles.map((x) => (
          <button key={x.tab} class="proc-next office-tile" onClick={() => (officeTab.value = x.tab)}>
            <span class="proc-next-date"><Icon name={x.icon} size={20} /></span>
            <span><strong>{x.t}</strong><br /><small class="muted">{x.d}</small></span>
            <Icon name="chevron" size={14} />
          </button>
        ))}
      </div>
      <p class="notice"><Icon name="alert" size={14} /> Tekst Uredbe o kancelarijskom poslovanju FBiH (20/98) i Pravilnika o uredskom poslovanju (96/19) nije u bazi. Klasifikaciju i rokove čuvanja arhivske građe vodite prema internom aktu preduzeća.</p>
    </div>
  );
}

function Propisi() {
  const items = laws.value.filter((l) => l.topic === OFFICE_TOPIC || RELATED_LAWS.has(l.id));
  const open = (id: string, level: string) => {
    libraryTab.value = level === 'ŠPD' ? 'spd' : 'laws';
    libraryFocus.value = { lawId: id };
    view.value = 'library';
  };
  return (
    <div class="proc-grid">
      {items.map((l) => (
        <button key={l.id} class="law-card" onClick={() => open(l.id, l.level)}>
          <div class="row gap"><span class={`badge lvl-${l.level}`}>{l.level}</span><span class="muted xs">{l.topic ?? ''}</span>{l.summary && <span class="pill xs push-right">Rezime</span>}</div>
          <strong>{l.title}</strong>
          <span class="muted xs">{l.gazette}</span>
        </button>
      ))}
    </div>
  );
}

/** Sadržaj cjeline (tabovi + panel); koristi se i kao samostalna stranica i kao podtab Šumarske procedure. */
export function OfficeBody({ nested = false }: { nested?: boolean }) {
  const t = officeTab.value;
  const list = useEntries();
  return (
    <>
      <div class={`segmented ${nested ? 'office-subtabs' : 'proc-tabs'}`} role="tablist">
        {TABS.map((x) => <button key={x.id} role="tab" aria-selected={t === x.id} class={t === x.id ? 'on' : ''} onClick={() => (officeTab.value = x.id)}><Icon name={x.icon} size={14} /> {x.label}</button>)}
      </div>
      {t === 'pregled' && <Pregled list={list} />}
      {t === 'djelovodnik' && <section class="card tool"><Djelovodnik /></section>}
      {t === 'predlosci' && <section class="card tool"><Predlosci /></section>}
      {t === 'pitanja' && <section class="card tool"><Pitanja /></section>}
      {t === 'propisi' && <Propisi />}
    </>
  );
}

export function OfficeView() {
  const list = useEntries();
  const { open, late } = stats(list);
  const answers = faq.value.filter((f) => f.topic === OFFICE_TOPIC).length;
  const tiles: { n: number; label: string; t: OfficeTab }[] = [
    { n: open.length, label: 'akata u radu', t: 'djelovodnik' },
    { n: late.length, label: 'kasni', t: 'pregled' },
    { n: list.length, label: 'zavedeno ukupno', t: 'djelovodnik' },
    { n: answers, label: 'gotovih odgovora', t: 'pitanja' },
  ];
  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <span class="topbar-title">Kancelarijsko poslovanje</span>
      </header>
      <div class="page-inner">
        <div class="proc-hero">
          <div class="proc-hero-top">
            <span class="proc-hero-icon"><Icon name="folder" size={22} /></span>
            <div>
              <span class="proc-eyebrow">Pisarnica · djelovodnik · arhiva</span>
              <h1>Kancelarijsko poslovanje</h1>
              <p>Zavođenje akata, rokovi, predlošci dokumenata i pravila za rad s pismenima.</p>
            </div>
          </div>
          <div class="proc-stats">
            {tiles.map((s) => <button key={s.label} class={s.label === 'kasni' && s.n ? 'warn' : ''} onClick={() => (officeTab.value = s.t)}><strong>{s.n}</strong><small>{s.label}</small></button>)}
          </div>
        </div>
        <OfficeBody />
      </div>
    </section>
  );
}
