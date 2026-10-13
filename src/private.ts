import { batch, signal } from '@preact/signals';
import { WrongPassError, decryptJson, type EncryptedBundle } from './crypto';
import { libraryFocus, libraryTab, openSourceId, setPrivateCorpus, setPrivatePending, view } from './store';
import { normalizeProcedure, procedure, type Procedure } from './procedure';
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

// Generacija: lock (ili novi unlock) poništava rezultat unlocka koji je još u toku.
let gen = 0;
let restoring: Promise<void> | null = null;

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
  const my = ++gen;
  privateBusy.value = true;
  try {
    const enc = await fetchBundle();
    if (!enc) throw new Error('U ovoj verziji aplikacije nema internih akata.');
    const data = await decryptJson<PrivateBundle>(enc, pass.trim());
    if (my !== gen) return 0;
    batch(() => {
      setPrivateCorpus(data.laws ?? [], data.articles ?? []);
      privateLaws.value = data.laws ?? [];
      procedure.value = normalizeProcedure(data.procedure);
      privateUnlocked.value = true;
    });
    writePass(pass.trim());
    return privateLaws.value.length;
  } finally {
    if (my === gen) privateBusy.value = false;
  }
}

export function lockPrivate(): void {
  gen++;
  writePass(null);
  const ids = new Set(privateLaws.value.map((l) => l.id));
  const isPrivate = (articleOrLawId: string) => ids.has(articleOrLawId.split('#')[0] ?? '');
  batch(() => {
    setPrivateCorpus([], []);
    privateLaws.value = [];
    procedure.value = null;
    privateUnlocked.value = false;
    privateBusy.value = false;
    if (openSourceId.value && isPrivate(openSourceId.value)) openSourceId.value = null;
    if (libraryFocus.value && ids.has(libraryFocus.value.lawId)) libraryFocus.value = null;
    if (libraryTab.value === 'spd') libraryTab.value = 'laws';
    if (view.value === 'procedure') view.value = 'settings';
  });
}

/** Pri pokretanju: ako je šifra sačuvana, akti se otključavaju sami. Pogrešna (promijenjena) šifra se briše. */
export function restorePrivate(): Promise<void> {
  const pass = readPass();
  if (!pass) return Promise.resolve();
  restoring ??= unlockPrivate(pass)
    .then(() => undefined)
    .catch((e: unknown) => {
      if (e instanceof WrongPassError) writePass(null);
    })
    .finally(() => (restoring = null));
  setPrivatePending(restoring);
  return restoring;
}
