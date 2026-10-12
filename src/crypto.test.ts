import { describe, expect, it } from 'vitest';
import { WrongPassError, decryptJson, encryptJson } from './crypto';

describe('šifrovani paket', () => {
  it('vraća isti sadržaj s ispravnom šifrom, odbija pogrešnu', async () => {
    const data = { laws: [{ id: 'x', title: 'Pravilnik' }], n: 'ščćžđ' };
    const b = await encryptJson(data, 'tajna šifra');
    expect(b.ct).not.toContain('Pravilnik');
    expect(await decryptJson(b, 'tajna šifra')).toEqual(data);
    await expect(decryptJson(b, 'pogrešna')).rejects.toBeInstanceOf(WrongPassError);
  }, 20_000);
});
