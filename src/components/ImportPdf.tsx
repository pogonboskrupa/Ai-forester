import { useState } from 'preact/hooks';
import type { ActDraft } from '../pdf/acts';
import { analyzePdf, buildUserLaw, type ActChoice, type PdfAnalysis } from '../pdf/import';
import { addUserLaws, drawerOpen, laws, libraryFocus, toast, view } from '../store';
import type { Level } from '../types';
import { Icon } from './Icon';

const LEVELS: Level[] = ['USK', 'FBiH', 'BiH'];
const TOPICS = ['Šumarstvo', 'Sjeme i rasadnici', 'Lovstvo', 'Okoliš', 'Vode', 'Požari', 'Zdravlje bilja', 'Ostalo'];
const MAX_MB = 40;

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading'; page: number; total: number; name: string }
  | { kind: 'review'; result: PdfAnalysis }
  | { kind: 'error'; message: string };

/** Akti s članovima su gotovo uvijek propisi; ostalo (rješenja o imenovanju i sl.) je predznačeno kao neodabrano. */
const likelyLaw = (a: ActDraft) => a.articleCount >= 3 || /^(Zakon|Pravilnik|Uredba|Naputak|Uputstvo|Odluka o (uslovima|načinu|visini))/i.test(a.title);
// Kratke osnove samo na početku riječi ("Poslovnik" i "naslova" sadrže "lov").
const FORESTRY = /šum|drv|(?<!\p{L})lov|divlja|sjem|sadn|požar|vatrog|dozna|sječ|otprem|paš|žiren|čuvar|okoliš|prirod|(?<!\p{L})vod[ae]|(?<!\p{L})bilj/iu;

/** U broju glasnika s mnogo akata unaprijed biramo samo one iz šumarstva i srodnih oblasti. */
function preselect(acts: ActDraft[]): ActDraft[] {
  const laws = acts.filter(likelyLaw);
  if (acts.length <= 3) return laws.length ? laws : acts;
  return laws.filter((a) => FORESTRY.test(a.title));
}

function guessTopic(title: string): string {
  if (/(?<!\p{L})lov|divlja|trofej/iu.test(title)) return 'Lovstvo';
  if (/sjem|sadn|rasadn/i.test(title)) return 'Sjeme i rasadnici';
  if (/požar|vatrog/i.test(title)) return 'Požari';
  if (/(?<!\p{L})vod[ae]/iu.test(title)) return 'Vode';
  if (/okoliš|prirod/i.test(title)) return 'Okoliš';
  if (/(?<!\p{L})bilj/iu.test(title)) return 'Zdravlje bilja';
  return FORESTRY.test(title) ? 'Šumarstvo' : 'Ostalo';
}

function ActRow({ act, selected, onToggle, choice, onChange }: {
  act: ActDraft;
  selected: boolean;
  onToggle: () => void;
  choice: ActChoice;
  onChange: (c: ActChoice) => void;
}) {
  const [preview, setPreview] = useState(false);
  const baseLaws = laws.value.filter((l) => !l.amends);
  const norm = (t: string) => t.toLowerCase().replace(/\s*\((usk|fbih|bih)\)$/, '').slice(0, 40);
  const duplicate = laws.value.find((l) => norm(l.title) === norm(choice.title) || norm(l.title).startsWith(norm(act.title).slice(0, 35)));
  return (
    <div class={`act-row ${selected ? 'on' : ''}`}>
      <label class="check">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span class="grow">
          <strong>{act.title}</strong>
          <span class="muted xs">{act.number ? `Akt ${act.number}. · ` : ''}{act.articleCount ? `${act.articleCount} članova` : 'bez numerisanih članova (dijeli se na dijelove)'}</span>
        </span>
      </label>
      {selected && (
        <div class="act-form">
          <label class="field">Naziv<input value={choice.title} onInput={(e) => onChange({ ...choice, title: e.currentTarget.value })} /></label>
          {duplicate && <p class="status err small"><Icon name="alert" size={14} /> Sličan propis već postoji u bazi: {duplicate.title} ({duplicate.gazette})</p>}
          <div class="grid-3">
            <label class="field">Nivo
              <select class="select" value={choice.level} onChange={(e) => onChange({ ...choice, level: e.currentTarget.value as Level })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label class="field">Tema
              <select class="select" value={choice.topic} onChange={(e) => onChange({ ...choice, topic: e.currentTarget.value })}>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label class="field">Službeni glasnik<input value={choice.gazette} placeholder="npr. Sl. glasnik USK 22/12" onInput={(e) => onChange({ ...choice, gazette: e.currentTarget.value })} /></label>
          </div>
          <label class="field">Mijenja propis (za zakone/pravilnike o izmjenama)
            <select class="select" value={choice.amends} onChange={(e) => onChange({ ...choice, amends: e.currentTarget.value })}>
              <option value="">Ne – samostalan propis</option>
              {baseLaws.map((l) => <option key={l.id} value={l.id}>{l.title} ({l.gazette})</option>)}
            </select>
          </label>
          <button type="button" class="link small" onClick={() => setPreview(!preview)}>{preview ? 'Sakrij pregled teksta' : 'Pregled teksta'}</button>
          {preview && <pre class="act-preview">{act.text.slice(0, 2500)}{act.text.length > 2500 ? '\n…' : ''}</pre>}
        </div>
      )}
    </div>
  );
}

export function ImportPdf() {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [choices, setChoices] = useState<Record<string, ActChoice>>({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStage({ kind: 'error', message: 'Izaberite PDF fajl.' });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setStage({ kind: 'error', message: `Fajl je veći od ${MAX_MB} MB.` });
      return;
    }
    setStage({ kind: 'reading', page: 0, total: 0, name: file.name });
    try {
      const result = await analyzePdf(file, (page, total) => setStage({ kind: 'reading', page, total, name: file.name }));
      setSelected(new Set(preselect(result.acts).map((a) => a.key)));
      setChoices(Object.fromEntries(result.acts.map((a) => [a.key, { title: a.title, level: result.meta.level, gazette: result.meta.gazette, topic: guessTopic(a.title), amends: /izmjen|dopun/i.test(a.title) ? guessAmends(a.title) : '' }])));
      setStage({ kind: 'review', result });
    } catch (e) {
      setStage({ kind: 'error', message: `PDF nije moguće pročitati: ${e instanceof Error ? e.message : 'nepoznata greška'}` });
    }
  };

  const save = async () => {
    if (stage.kind !== 'review') return;
    const acts = stage.result.acts.filter((a) => selected.has(a.key));
    if (!acts.length) return;
    setSaving(true);
    try {
      const items = acts.map((a) => buildUserLaw(a, choices[a.key]!, stage.result.fileName));
      await addUserLaws(items);
      toast(`Dodano propisa: ${items.length} (${items.reduce((n, i) => n + i.articles.length, 0)} članova)`);
      libraryFocus.value = items.length === 1 ? { lawId: items[0]!.law.id } : null;
      view.value = 'library';
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Spremanje nije uspjelo', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <button class="btn ghost sm" onClick={() => (view.value = 'library')}><Icon name="back" size={16} /> Biblioteka</button>
        <span class="topbar-title">Dodaj propis iz PDF-a</span>
      </header>
      <div class="page-inner narrow">
        {(stage.kind === 'idle' || stage.kind === 'error') && (
          <>
            <label
              class={`dropzone ${dragOver ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer?.files[0]); }}
            >
              <Icon name="upload" size={28} />
              <strong>Izaberite ili prevucite PDF zakona ili pravilnika</strong>
              <span class="muted small">Službeni glasnik s više akata, zakon, pravilnik, odluka… PDF se obrađuje na ovom uređaju i nigdje se ne šalje.</span>
              <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void handleFile(e.currentTarget.files?.[0])} />
              <span class="btn primary sm">Izaberi PDF</span>
            </label>
            {stage.kind === 'error' && <div class="alert"><Icon name="alert" /><div><p>{stage.message}</p></div></div>}
            <div class="card">
              <h2>Kako radi</h2>
              <ul class="steps">
                <li>Tekst se izvlači iz PDF-a (i iz dvije kolone glasnika i starih fontova).</li>
                <li>Ako je u PDF-u cijeli broj glasnika, birate koje akte želite.</li>
                <li>Propis se dijeli na članove i odmah je dostupan u pretrazi, odgovorima, projektima i biblioteci.</li>
                <li>Za zakone o izmjenama izaberite koji propis mijenjaju – izmijenjeni članovi dobiće upozorenje.</li>
              </ul>
              <p class="muted xs">Skenirani PDF-ovi (slika bez teksta) ne mogu se pročitati. Dodani propisi čuvaju se samo u ovom pregledniku i ulaze u backup.</p>
            </div>
          </>
        )}

        {stage.kind === 'reading' && (
          <div class="card center">
            <div class="spinner" />
            <strong>Čitam {stage.name}</strong>
            <span class="muted small">{stage.total ? `Stranica ${stage.page} od ${stage.total}` : 'Učitavam PDF…'}</span>
            {stage.total > 0 && <progress max={stage.total} value={stage.page} />}
          </div>
        )}

        {stage.kind === 'review' && (
          !stage.result.hasText ? (
            <div class="alert"><Icon name="alert" /><div><strong>PDF nema teksta.</strong><p>Izgleda da je skeniran (slika). Potrebna je verzija s tekstom ili OCR.</p><button class="btn sm" onClick={() => setStage({ kind: 'idle' })}>Izaberi drugi PDF</button></div></div>
          ) : (
            <>
              <div class="row between wrap gap">
                <div>
                  <h2>{stage.result.fileName}</h2>
                  <p class="muted small">{stage.result.pageCount} stranica · pronađeno akata: {stage.result.acts.length}{stage.result.meta.gazette ? ` · ${stage.result.meta.gazette}` : ''}</p>
                </div>
                <button class="btn sm" onClick={() => setStage({ kind: 'idle' })}>Drugi PDF</button>
              </div>
              {stage.result.acts.length === 0 && <p class="muted">Nije pronađen nijedan akt.</p>}
              <div class="acts">
                {stage.result.acts.map((a) => (
                  <ActRow
                    key={a.key}
                    act={a}
                    selected={selected.has(a.key)}
                    onToggle={() => setSelected((s) => { const n = new Set(s); if (n.has(a.key)) n.delete(a.key); else n.add(a.key); return n; })}
                    choice={choices[a.key]!}
                    onChange={(c) => setChoices((m) => ({ ...m, [a.key]: c }))}
                  />
                ))}
              </div>
              <div class="row gap sticky-actions">
                <button class="btn primary" disabled={!selected.size || saving} onClick={() => void save()}>
                  {saving ? 'Spremam…' : `Dodaj u bazu (${selected.size})`}
                </button>
                <span class="muted small">Provjerite naziv i glasnik prije spremanja.</span>
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}

/** "Zakon o izmjenama i dopunama Zakona o šumama" -> id postojećeg "Zakon o šumama" ako ga ima. */
function guessAmends(title: string): string {
  const target = /(?:izmjen\w*|dopun\w*)\s+(?:i dopunama\s+)?(.+)$/i.exec(title)?.[1]?.replace(/^(zakona|pravilnika|uredbe|odluke)\b/i, (w) => ({ zakona: 'zakon', pravilnika: 'pravilnik', uredbe: 'uredba', odluke: 'odluka' })[w.toLowerCase()] ?? w).toLowerCase();
  if (!target) return '';
  const hit = laws.value.find((l) => !l.amends && l.title.toLowerCase().startsWith(target.slice(0, 25)));
  return hit?.id ?? '';
}
