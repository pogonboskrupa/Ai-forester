import { articleById, lawById, openSourceId } from '../store';
import type { Article } from '../types';

/** Kratka oznaka propisa za citate (npr. "ZoŠ USK"); puni naziv je u title. */
function shortLaw(a: Article): string {
  const t = lawById(a.lawId)?.title ?? a.lawTitle;
  if (/^Zakon o izmjen/i.test(t)) return `izmjene ${a.gazette.match(/\d+\/\d+/)?.[0] ?? ''}`.trim();
  return t.replace(/\s*\(.*\)\s*$/, '').replace(/^Pravilnik o /, 'Pravilnik o ').slice(0, 42);
}

/**
 * Citat člana koji otvara izvor. Ako je član izmijenjen, kao važeći se citira član zakona o izmjenama,
 * a stari je precrtan s oznakom "zastarjelo".
 */
export function Cite({ id }: { id: string }) {
  const a = articleById(id);
  if (!a) return null;
  const open = (x: string) => (e: Event) => {
    e.preventDefault();
    openSourceId.value = x;
  };
  const amenders = (a.amendedBy ?? []).map(articleById).filter((x): x is Article => !!x);
  return (
    <span class="cite">
      {amenders.map((m) => (
        <a key={m.id} href="#" class="cite-link" title={`${m.lawTitle}, član ${m.number} (važeći tekst)`} onClick={open(m.id)}>čl. {m.number} {shortLaw(m)}</a>
      ))}
      <a href="#" class={`cite-link ${amenders.length ? 'outdated' : ''}`} title={amenders.length ? 'Zastarjeli tekst – član je izmijenjen' : `${a.lawTitle}, član ${a.number}`} onClick={open(a.id)}>
        čl. {a.number} {shortLaw(a)}
      </a>
      {amenders.length > 0 && <span class="pill warn xs">zastarjelo</span>}
    </span>
  );
}
