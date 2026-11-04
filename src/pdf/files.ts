/** Izvorni PDF uploadovanog propisa: čuva se u IndexedDB-u (ne ulazi u backup JSON, prevelik je). */
import { del, get, set } from 'idb-keyval';

const key = (k: string) => `userfile:${k}`;

export const newFileKey = (file: File): string => `${Date.now().toString(36)}-${file.size.toString(36)}`;

export async function saveFile(k: string, file: Blob): Promise<boolean> {
  try {
    await set(key(k), file);
    return true;
  } catch {
    return false; // npr. privatni mod ili puna kvota: propis ostaje bez izvornog fajla
  }
}

export async function loadFile(k: string): Promise<Blob | null> {
  try {
    return (await get<Blob>(key(k))) ?? null;
  } catch {
    return null;
  }
}

export async function deleteFile(k: string): Promise<void> {
  try {
    await del(key(k));
  } catch {
    /* ignoriši */
  }
}
