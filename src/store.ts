import { computed, effect, signal } from '@preact/signals';
import type MiniSearch from 'minisearch';
import type { Article, Conversation, LawInfo, Msg, Project } from './types';
import { buildIndex, retrieve } from './search';
import { ask } from './llm';
import { loadConversations, loadProjects, saveConversations, saveProjects } from './storage';

export type View = 'chat' | 'library' | 'project' | 'settings';

const uid = () => crypto.randomUUID();

export const articles = signal<Article[]>([]);
export const laws = signal<LawInfo[]>([]);
export const projects = signal<Project[]>([]);
export const conversations = signal<Conversation[]>([]);
export const activeConvId = signal<string | null>(null);
export const filterProjectId = signal<string | null | 'all'>('all');
export const editingProjectId = signal<string | 'new' | null>(null);
export const view = signal<View>('chat');
export const drawerOpen = signal(false);
export const busy = signal(false);
export const ready = signal(false);
export const loadError = signal('');

let index: MiniSearch<Article> | null = null;
const byId = computed(() => new Map(articles.value.map((a) => [a.id, a])));

export const articleById = (id: string) => byId.value.get(id);
export const activeConv = computed(() => conversations.value.find((c) => c.id === activeConvId.value) ?? null);
export const projectOf = (id: string | null) => projects.value.find((p) => p.id === id) ?? null;

export async function init(): Promise<void> {
  try {
    const [a, l, p, c] = await Promise.all([
      fetch('./data/articles.json').then((r) => r.json() as Promise<Article[]>),
      fetch('./data/laws.json').then((r) => r.json() as Promise<LawInfo[]>),
      loadProjects(),
      loadConversations(),
    ]);
    articles.value = a;
    laws.value = l;
    projects.value = p;
    conversations.value = c;
    index = buildIndex(a);
    activeConvId.value = [...c].sort((x, y) => y.updatedAt - x.updatedAt)[0]?.id ?? null;
    ready.value = true;
  } catch {
    loadError.value = 'Baza propisa nije učitana.';
  }
  // Perzistencija tek nakon učitavanja da prazno stanje ne pregazi podatke.
  effect(() => {
    if (ready.value) void saveProjects(projects.value);
  });
  effect(() => {
    if (ready.value) void saveConversations(conversations.value);
  });
}

export function newConversation(projectId: string | null = null): string {
  const c: Conversation = { id: uid(), projectId, title: 'Novi razgovor', messages: [], updatedAt: Date.now() };
  conversations.value = [c, ...conversations.value];
  activeConvId.value = c.id;
  view.value = 'chat';
  drawerOpen.value = false;
  return c.id;
}

export function openConversation(id: string): void {
  activeConvId.value = id;
  view.value = 'chat';
  drawerOpen.value = false;
}

const patchConv = (id: string, fn: (c: Conversation) => Conversation) => {
  conversations.value = conversations.value.map((c) => (c.id === id ? fn(c) : c));
};

export function renameConversation(id: string, title: string): void {
  const t = title.trim();
  if (t) patchConv(id, (c) => ({ ...c, title: t }));
}

export function moveConversation(id: string, projectId: string | null): void {
  patchConv(id, (c) => ({ ...c, projectId }));
}

export function deleteConversation(id: string): void {
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
  projects.value = projects.value.filter((p) => p.id !== id);
  // Razgovori ostaju, ali prelaze u "bez projekta".
  conversations.value = conversations.value.map((c) => (c.projectId === id ? { ...c, projectId: null } : c));
  if (filterProjectId.value === id) filterProjectId.value = 'all';
}

/** Kratka dopunska pitanja ("a kolika je kazna?") pretražujemo zajedno s prethodnim pitanjem. */
export function retrievalQuery(question: string, history: Msg[]): string {
  const prev = [...history].reverse().find((m) => m.role === 'user');
  return question.split(/\s+/).length < 6 && prev ? `${prev.text} ${question}` : question;
}

export async function sendMessage(text: string): Promise<void> {
  const q = text.trim();
  if (!q || !index || busy.value) return;
  const convId = activeConvId.value ?? newConversation(null);
  const conv = conversations.value.find((c) => c.id === convId)!;
  const project = projectOf(conv.projectId);
  const ctx = retrieve(index, retrievalQuery(q, conv.messages), 6, project?.lawIds);
  const userMsg: Msg = { id: uid(), role: 'user', text: q, sourceIds: [], ts: Date.now() };
  const history = conv.messages;

  patchConv(convId, (c) => ({
    ...c,
    title: c.messages.length ? c.title : q.slice(0, 60),
    messages: [...c.messages, userMsg],
    updatedAt: Date.now(),
  }));

  busy.value = true;
  let reply: Msg;
  try {
    const answer = await ask({ question: q, ctx, history, project });
    reply = { id: uid(), role: 'assistant', text: answer, sourceIds: ctx.map((a) => a.id), ts: Date.now() };
  } catch (e) {
    reply = {
      id: uid(),
      role: 'assistant',
      text: e instanceof Error ? e.message : 'Greška',
      sourceIds: ctx.map((a) => a.id),
      error: true,
      ts: Date.now(),
    };
  } finally {
    busy.value = false;
  }
  patchConv(convId, (c) => ({ ...c, messages: [...c.messages, reply], updatedAt: Date.now() }));
}

export function conversationToMarkdown(c: Conversation): string {
  const lines = [`# ${c.title}`, ''];
  for (const m of c.messages) {
    lines.push(m.role === 'user' ? `**Pitanje:** ${m.text}` : m.text, '');
    const src = m.sourceIds.map((id) => articleById(id)).filter((a): a is Article => !!a);
    if (src.length) lines.push('_Izvori:_', ...src.map((a) => `- ${a.lawTitle}, član ${a.number}`), '');
  }
  return lines.join('\n');
}
