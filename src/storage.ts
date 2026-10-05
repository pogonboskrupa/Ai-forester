import { get, set } from 'idb-keyval';
import type { Conversation, Project } from './types';

// IndexedDB; ako nije dostupan (privatni mod), podaci žive samo u memoriji sesije.
async function load<T>(key: string): Promise<T[]> {
  try {
    return (await get<T[]>(key)) ?? [];
  } catch {
    return [];
  }
}

async function save<T>(key: string, value: T[]): Promise<void> {
  try {
    await set(key, value);
  } catch {
    /* ignoriši: UI ostaje funkcionalan */
  }
}

export const loadProjects = () => load<Project>('projects');
export const saveProjects = (v: Project[]) => save('projects', v);
export const loadConversations = () => load<Conversation>('conversations');
export const saveConversations = (v: Conversation[]) => save('conversations', v);
