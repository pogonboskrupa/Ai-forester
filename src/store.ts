import { batch, computed, effect, signal } from '@preact/signals';
import type MiniSearch from 'minisearch';
import type { Article, Conversation, LawInfo, Msg, Project } from './types';
import { buildIndex, retrieve } from './search';
import { isAbort, streamCompletion, type Turn } from './ai/client';
import { buildPrompt, systemPrompt } from './ai/prompt';
import { providerLabel } from './settings';
import { loadConversations, loadProjects, saveConversations, saveProjects } from './storage';

export type View = 'chat' | 'library' | 'project' | 'settings';

const uid = () => crypto.randomUUID();
const CONTEXT_K = 8;
const HISTORY_TURNS = 8;

export const articles = signal<Article[]>([]);
export const laws = signal<LawInfo[]>([]);
export const projects = signal<Project[]>([]);
export const conversations = signal<Conversation[]>([]);
export const activeConvId = signal<string | null>(null);
export const filterProjectId = signal<string | null | 'all'>('all');
export const editingProjectId = signal<string | 'new' | null>(null);
export const view = signal<View>('chat');
export const drawerOpen = signal(false);
export const ready = signal(false);
export const loadError = signal('');
export const draft = signal('');

/** Tekst koji upravo stiže; u historiju se upisuje tek na kraju (manje pisanja u IndexedDB). */
export const streaming = signal<{ convId: string; msgId: string; text: string } | null>(null);
export const busy = computed(() => streaming.value !== null);
let controller: AbortController | null = null;

/** Bočni panel s punim tekstom člana. */
export const openSourceId = signal<string | null>(null);
/** Biblioteka: koji propis/član otvoriti. */
export const libraryFocus = signal<{ lawId: string; articleId?: string } | null>(null);

export interface Toast { id: string; text: string; kind: 'ok' | 'err' }
export const toasts = signal<Toast[]>([]);
export function toast(text: string, kind: Toast['kind'] = 'ok'): void {
  const t = { id: uid(), text, kind };
  toasts.value = [...toasts.value, t];
  setTimeout(() => (toasts.value = toasts.value.filter((x) => x.id !== t.id)), 3200);
}

let index: MiniSearch<Article> | null = null;
const byId = computed(() => new Map(articles.value.map((a) => [a.id, a])));
export const articleById = (id: string) => byId.value.get(id);
export const lawById = (id: string) => laws.value.find((l) => l.id === id);
export const activeConv = computed(() => conversations.value.find((c) => c.id === activeConvId.value) ?? null);
export const projectOf = (id: string | null) => projects.value.find((p) => p.id === id) ?? null;

export const searchArticles = (q: string, lawIds?: string[], k = 30): Article[] =>
  index && q.trim() ? retrieve(index, q, k, lawIds) : [];

export async function init(): Promise<void> {
  try {
    const [a, l, p, c] = await Promise.all([
      fetch('./data/articles.json').then((r) => r.json() as Promise<Article[]>),
      fetch('./data/laws.json').then((r) => r.json() as Promise<LawInfo[]>),
      loadProjects(),
      loadConversations(),
    ]);
    batch(() => {
      articles.value = a;
      laws.value = l;
      projects.value = p;
      conversations.value = c;
      activeConvId.value = [...c].sort((x, y) => y.updatedAt - x.updatedAt)[0]?.id ?? null;
    });
    index = buildIndex(a);
    ready.value = true;
  } catch {
    loadError.value = 'Baza propisa nije učitana. Provjerite internet vezu i osvježite stranicu.';
    return;
  }
  // Historija se mijenja samo na diskretne događaje (tekst koji stiže je u `streaming`), pa se upisuje odmah.
  effect(() => void saveProjects(projects.value));
  effect(() => void saveConversations(conversations.value));
}

export function newConversation(projectId: string | null = null): string {
  const c: Conversation = { id: uid(), projectId, title: 'Novi razgovor', messages: [], updatedAt: Date.now() };
  batch(() => {
    conversations.value = [c, ...conversations.value];
    activeConvId.value = c.id;
    view.value = 'chat';
    drawerOpen.value = false;
    openSourceId.value = null;
  });
  return c.id;
}

export function openConversation(id: string): void {
  batch(() => {
    activeConvId.value = id;
    view.value = 'chat';
    drawerOpen.value = false;
    openSourceId.value = null;
  });
}

const patchConv = (id: string, fn: (c: Conversation) => Conversation) => {
  conversations.value = conversations.value.map((c) => (c.id === id ? fn(c) : c));
};

export function renameConversation(id: string, title: string): void {
  const t = title.trim();
  if (t) patchConv(id, (c) => ({ ...c, title: t }));
}
export const togglePin = (id: string) => patchConv(id, (c) => ({ ...c, pinned: !c.pinned }));
export const moveConversation = (id: string, projectId: string | null) => patchConv(id, (c) => ({ ...c, projectId }));

export function deleteConversation(id: string): void {
  if (streaming.value?.convId === id) stopGeneration();
  conversations.value = conversations.value.filter((c) => c.id !== id);
  if (activeConvId.value === id) activeConvId.value = conversations.value[0]?.id ?? null;
}

export function saveProject(p: Omit<Project, 'id' | 'createdAt'> & { id?: string }): string {
  const existing = p.id ? projects.value.find((x) => x.id === p.id) : undefined;
  const full: Project = { ...p, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? Date.now() };
  projects.value = existing ? projects.value.map((x) => (x.id === full.id ? full : x)) : [...projects.value, full];
  return full.id;
}

export function deleteProject(id: string): void {
  batch(() => {
    projects.value = projects.value.filter((p) => p.id !== id);
    conversations.value = conversations.value.map((c) => (c.projectId === id ? { ...c, projectId: null } : c));
    if (filterProjectId.value === id) filterProjectId.value = 'all';
  });
}

/** Kratka dopunska pitanja ("a kolika je kazna?") pretražujemo zajedno s prethodnim pitanjem. */
export function retrievalQuery(question: string, history: Msg[]): string {
  const prev = [...history].reverse().find((m) => m.role === 'user');
  return question.split(/\s+/).length < 6 && prev ? `${prev.text} ${question}` : question;
}

const toTurns = (history: Msg[]): Turn[] =>
  history
    .filter((m) => !m.error)
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, text: m.text }));

async function generate(convId: string, question: string, history: Msg[]): Promise<void> {
  const conv = conversations.value.find((c) => c.id === convId);
  if (!conv || !index) return;
  const project = projectOf(conv.projectId);
  const ctx = retrieve(index, retrievalQuery(question, history), CONTEXT_K, project?.lawIds);
  const msgId = uid();
  controller = new AbortController();
  streaming.value = { convId, msgId, text: '' };

  const base = { id: msgId, role: 'assistant' as const, sourceIds: ctx.map((a) => a.id), model: providerLabel(), ts: Date.now() };
  let reply: Msg;
  try {
    await streamCompletion({
      system: systemPrompt(project),
      messages: [...toTurns(history), { role: 'user', text: buildPrompt(question, ctx) }],
      signal: controller.signal,
      onText: (d) => {
        const s = streaming.value;
        if (s?.msgId === msgId) streaming.value = { ...s, text: s.text + d };
      },
    });
    reply = { ...base, text: streaming.value?.text ?? '' };
  } catch (e) {
    const partial = streaming.value?.text ?? '';
    reply = isAbort(e)
      ? { ...base, text: partial || '_Zaustavljeno._', stopped: true }
      : { ...base, text: e instanceof Error ? e.message : 'Nepoznata greška.', error: true };
  } finally {
    controller = null;
  }
  batch(() => {
    patchConv(convId, (c) => ({ ...c, messages: [...c.messages, reply], updatedAt: Date.now() }));
    streaming.value = null;
  });
}

export async function sendMessage(text: string): Promise<void> {
  const q = text.trim();
  if (!q || !index || busy.value) return;
  const convId = activeConvId.value ?? newConversation(filterProjectId.value === 'all' ? null : filterProjectId.value);
  const conv = conversations.value.find((c) => c.id === convId)!;
  const history = conv.messages;
  const userMsg: Msg = { id: uid(), role: 'user', text: q, sourceIds: [], ts: Date.now() };
  patchConv(convId, (c) => ({
    ...c,
    title: c.messages.length ? c.title : q.length > 60 ? `${q.slice(0, 57)}…` : q,
    messages: [...c.messages, userMsg],
    updatedAt: Date.now(),
  }));
  await generate(convId, q, history);
}

/** Ponovo generiše zadnji odgovor (npr. nakon greške ili s drugim modelom). */
export async function regenerate(): Promise<void> {
  const conv = activeConv.value;
  if (!conv || busy.value) return;
  const lastUserIdx = conv.messages.map((m) => m.role).lastIndexOf('user');
  const question = conv.messages[lastUserIdx];
  if (!question) return;
  patchConv(conv.id, (c) => ({ ...c, messages: c.messages.slice(0, lastUserIdx + 1) }));
  await generate(conv.id, question.text, conv.messages.slice(0, lastUserIdx));
}

/** Uređivanje zadnjeg pitanja: briše ga (i odgovor) i vraća tekst u polje za unos. */
export function editLastQuestion(): void {
  const conv = activeConv.value;
  if (!conv || busy.value) return;
  const idx = conv.messages.map((m) => m.role).lastIndexOf('user');
  const q = conv.messages[idx];
  if (!q) return;
  patchConv(conv.id, (c) => ({ ...c, messages: c.messages.slice(0, idx) }));
  draft.value = q.text;
}

export function stopGeneration(): void {
  controller?.abort();
}

export function askAboutArticle(a: Article): void {
  newConversation(null);
  draft.value = `Objasni član ${a.number} (${a.lawTitle}) i šta on znači u praksi.`;
}

export function conversationToMarkdown(c: Conversation): string {
  const lines = [`# ${c.title}`, '', `_Izvezeno ${new Date().toLocaleString('bs-BA')} iz AI Šumar_`, ''];
  for (const m of c.messages) {
    if (m.role === 'user') {
      lines.push(`## ${m.text}`, '');
      continue;
    }
    lines.push(m.text, '');
    const src = m.sourceIds.map((id) => articleById(id));
    if (src.some(Boolean)) {
      lines.push('**Izvori:**');
      src.forEach((a, i) => a && lines.push(`${i + 1}. ${a.lawTitle}, član ${a.number} (${a.gazette})`));
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function exportAll(): string {
  return JSON.stringify({ version: 1, projects: projects.value, conversations: conversations.value }, null, 2);
}

export function importAll(json: string): number {
  const data = JSON.parse(json) as { projects?: Project[]; conversations?: Conversation[] };
  if (!Array.isArray(data.conversations)) throw new Error('Neispravan fajl.');
  const known = new Set(conversations.value.map((c) => c.id));
  const knownP = new Set(projects.value.map((p) => p.id));
  const newConvs = data.conversations.filter((c) => !known.has(c.id));
  batch(() => {
    projects.value = [...projects.value, ...(data.projects ?? []).filter((p) => !knownP.has(p.id))];
    conversations.value = [...newConvs, ...conversations.value];
  });
  return newConvs.length;
}
