/**
 * Šifrovani paket internih akata (AES-256-GCM, ključ iz šifre preko PBKDF2-SHA256).
 * Isti kod koristi preglednik (otključavanje) i Node skripta (scripts/private-bundle.ts) – oba imaju WebCrypto.
 */
export interface EncryptedBundle {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 (šifrat + GCM tag)
}

const ITERATIONS = 600_000; // OWASP preporuka za PBKDF2-SHA256

const toB64 = (b: Uint8Array): string => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(data: unknown, pass: string): Promise<EncryptedBundle> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, ITERATIONS);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITERATIONS, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

export class WrongPassError extends Error {
  constructor() {
    super('Pogrešna šifra');
  }
}

/** Baca WrongPassError ako šifra ne odgovara (GCM tag se ne slaže). */
export async function decryptJson<T>(bundle: EncryptedBundle, pass: string): Promise<T> {
  if (bundle.v !== 1) throw new Error(`Nepoznata verzija paketa: ${String(bundle.v)}`);
  const key = await deriveKey(pass, fromB64(bundle.salt), bundle.iter);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(bundle.iv) }, key, fromB64(bundle.ct));
  } catch {
    throw new WrongPassError();
  }
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
