import { describe, expect, it } from 'vitest';
import { detectLocal, fitForLocal, normalizeLocalUrl } from './local';

describe('normalizeLocalUrl', () => {
  it('dodaje http:// i /v1, uklanja završnu kosu crtu', () => {
    expect(normalizeLocalUrl('localhost:11434')).toBe('http://localhost:11434/v1');
    expect(normalizeLocalUrl(' http://127.0.0.1:8080/ ')).toBe('http://127.0.0.1:8080/v1');
  });
  it('ne dupla /v1 i čuva https', () => {
    expect(normalizeLocalUrl('http://192.168.1.5:1234/v1')).toBe('http://192.168.1.5:1234/v1');
    expect(normalizeLocalUrl('https://moj.server.lan/v1/')).toBe('https://moj.server.lan/v1');
  });
  it('prazan unos ostaje prazan', () => {
    expect(normalizeLocalUrl('  ')).toBe('');
  });
});

const turn = (role: 'user' | 'assistant', text: string) => ({ role, text });
const excerpt = (n: number, len: number) => `[${n}] Zakon o šumama (g), član ${n}\n${'x'.repeat(len)}`;
const question = (k: number, len: number) => `<izvodi>\n${Array.from({ length: k }, (_, i) => excerpt(i + 1, len)).join('\n\n')}\n</izvodi>\n\nPitanje: Šta je doznaka?`;

describe('fitForLocal', () => {
  it('ostavlja kratak upit netaknutim', () => {
    const msgs = [turn('user', question(2, 100))];
    expect(fitForLocal('sys', msgs, 4096).messages).toEqual(msgs);
  });
  it('izbacuje izvode s kraja dok ne stane u budžet, ali zadržava pitanje i prvi izvod', () => {
    const out = fitForLocal('s'.repeat(2000), [turn('user', question(8, 1500))], 4096).messages;
    const last = out[out.length - 1]!.text;
    expect(last).toContain('Pitanje: Šta je doznaka?');
    expect(last).toContain('[1] Zakon');
    expect(last).not.toContain('[8] Zakon');
    expect(2000 + last.length).toBeLessThan(4096 * 3);
  });
  it('zadržava samo posljednja dva prethodna poruka', () => {
    const msgs = [turn('user', 'a'), turn('assistant', 'b'), turn('user', 'c'), turn('assistant', 'd'), turn('user', question(1, 50))];
    expect(fitForLocal('s', msgs, 4096).messages.map((m) => m.text.slice(0, 1))).toEqual(['c', 'd', '<']);
  });
  it('veći kontekst dopušta više izvoda', () => {
    const small = fitForLocal('s', [turn('user', question(8, 1500))], 2048).messages[0]!.text.match(/\n\[\d+\] Zakon/g)?.length ?? 0;
    const big = fitForLocal('s', [turn('user', question(8, 1500))], 16384).messages[0]!.text.match(/\n\[\d+\] Zakon/g)?.length ?? 0;
    expect(big).toBeGreaterThan(small);
  });
});

describe('detectLocal', () => {
  const fakeFetch = (alive: string[]) => (async (url: string) => {
    if (!alive.some((a) => url.startsWith(a))) throw new TypeError('connection refused');
    return { ok: true, json: async () => ({ data: [{ id: 'phi-4-mini' }, { id: 'llama3' }] }) } as Response;
  }) as unknown as typeof fetch;

  it('pronalazi prvi server koji odgovara i vraća njegove modele', async () => {
    const r = await detectLocal(fakeFetch(['http://localhost:8080']));
    expect(r).toEqual({ url: 'http://localhost:8080/v1', models: ['phi-4-mini', 'llama3'] });
  });
  it('vraća null kad ništa ne odgovara', async () => {
    expect(await detectLocal(fakeFetch([]))).toBeNull();
  });
});
