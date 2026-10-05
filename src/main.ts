import './style.css';
import type MiniSearch from 'minisearch';
import type { Article } from './types';
import { buildIndex, retrieve } from './search';
import { ask } from './llm';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const log = $('log');
const form = $<HTMLFormElement>('form');
const input = $<HTMLInputElement>('q');

let index: MiniSearch<Article> | null = null;

function add(cls: string, html: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `msg ${cls}`;
  el.innerHTML = html;
  log.append(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return el;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function sources(ctx: Article[]): string {
  if (!ctx.length) return '';
  const items = ctx
    .map((a) => `<details><summary>${esc(a.lawTitle)}, član ${esc(a.number)}</summary><p>${esc(a.text)}</p></details>`)
    .join('');
  return `<div class="src"><strong>Izvori:</strong>${items}</div>`;
}

async function init(): Promise<void> {
  try {
    const res = await fetch('./data/articles.json');
    index = buildIndex((await res.json()) as Article[]);
  } catch {
    add('err', 'Baza propisa nije učitana.');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q || !index) return;
  input.value = '';
  add('user', esc(q));
  const ctx = retrieve(index, q);
  const pending = add('bot', 'Tražim…');
  try {
    const text = await ask(q, ctx);
    pending.innerHTML = `${esc(text).replace(/\n/g, '<br>')}${sources(ctx)}`;
  } catch (err) {
    pending.className = 'msg err';
    pending.innerHTML = `${esc(err instanceof Error ? err.message : 'Greška')}${sources(ctx)}`;
  }
});

void init();
