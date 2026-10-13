import { signal } from '@preact/signals';
import { WrongPassError, decryptJson, type EncryptedBundle } from './crypto';
import { setPrivateCorpus } from './store';
import { procedure, type Procedure } from './procedure';
import type { Article, LawInfo } from './types';

/**
 * Interni akti ŠPD-a: u javnom repozitoriju su samo šifrovani (data/private/spd.enc.json).
 * Otključavaju se internom šifrom; šifra ostaje na uređaju da bi akti radili i poslije ponovnog
 * otvaranja (i offline – šifrovani fajl je u kešu aplikacije).
 */
export interface PrivateBundle {
  v: 1;
  updatedAt: number;
  laws: LawInfo[];
  articles: Article[];
  procedure?: Procedure; // strukturirani pregled šumarske procedure
}

const PASS_KEY = 'ai-sumar-spd-pass';
const URL = './data/spd.enc.json';

export const privateUnlocked = signal(false);
export const privateLaws = signal<LawInfo[]>([]);
export const privateBusy = signal(false);

function readPass(): string | null {
  try {
    return localStorage.getItem(PASS_KEY);
  } catch {
    return null;
  }
}
function writePass(pass: string | null): void {
  try {
    if (pass === null) localStorage.removeItem(PASS_KEY);
    else localStorage.setItem(PASS_KEY, pass);
  } catch {
    // privatni prozor: akti rade do zatvaranja aplikacije
  }
}

async function fetchBundle(): Promise<EncryptedBundle | null> {
  const res = await fetch(URL);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Paket internih akata nije dostupan (${res.status})`);
  return (await res.json()) as EncryptedBundle;
}

/** Baca grešku s porukom za korisnika (pogrešna šifra, nema paketa, mreža). */
export async function unlockPrivate(pass: string): Promise<number> {
  privateBusy.value = true;
  try {
    const enc = await fetchBundle();
    if (!enc) throw new Error('U ovoj verziji aplikacije nema internih akata.');
    const data = await decryptJson<PrivateBundle>(enc, pass.trim());
    setPrivateCorpus(data.laws, data.articles);
    privateLaws.value = data.laws;
    procedure.value = data.procedure ?? null;
    privateUnlocked.value = true;
    writePass(pass.trim());
    return data.laws.length;
  } finally {
    privateBusy.value = false;
  }
}

export function lockPrivate(): void {
  writePass(null);
  setPrivateCorpus([], []);
  privateLaws.value = [];
  procedure.value = null;
  privateUnlocked.value = false;
}

/** Pri pokretanju: ako je šifra sačuvana, akti se otključavaju sami. Pogrešna (promijenjena) šifra se briše. */
export async function restorePrivate(): Promise<void> {
  const pass = readPass();
  if (!pass) return;
  try {
    await unlockPrivate(pass);
  } catch (e) {
    if (e instanceof WrongPassError) writePass(null);
  }
}
