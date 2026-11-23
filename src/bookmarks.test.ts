import { describe, expect, it } from 'vitest';
import { mergeBookmarks, toggleBookmark } from './bookmarks';
import { shareText } from './share';

describe('toggleBookmark', () => {
  it('dodaje na vrh i uklanja ponovnim klikom', () => {
    const a = toggleBookmark([], 'zak#1', 10);
    const b = toggleBookmark(a, 'zak#2', 20);
    expect(b.map((x) => x.id)).toEqual(['zak#2', 'zak#1']);
    expect(toggleBookmark(b, 'zak#1', 30).map((x) => x.id)).toEqual(['zak#2']);
  });
});

describe('mergeBookmarks', () => {
  it('spaja backup bez duplikata, novije prvo', () => {
    const cur = [{ id: 'a', at: 5 }];
    const inc = [{ id: 'a', at: 1 }, { id: 'b', at: 9 }];
    expect(mergeBookmarks(cur, inc)).toEqual([{ id: 'b', at: 9 }, { id: 'a', at: 5 }]);
  });
  it('ignoriše neispravne unose iz fajla', () => {
    expect(mergeBookmarks([], [{ id: 3 }, null, { id: 'x', at: 'y' }, { id: 'ok', at: 2 }] as never)).toEqual([{ id: 'ok', at: 2 }]);
  });
});

describe('shareText', () => {
  const src = [
    { lawTitle: 'Zakon o šumama USK', number: '81', gazette: 'Sl. glasnik USK 22/12' },
    { lawTitle: 'Pravilnik o doznaci', number: '5', gazette: 'Sl. glasnik USK 26/12' },
  ];
  it('uklanja markdown, zadržava oznake [n] i navodi samo citirane izvore', () => {
    const t = shareText('Kazna za sječu?', '**Kazna** je od 200 do 1.500 KM [1].\n\n- sječa bez doznake', src);
    expect(t).toContain('Pitanje: Kazna za sječu?');
    expect(t).toContain('Kazna je od 200 do 1.500 KM [1].');
    expect(t).toContain('• sječa bez doznake');
    expect(t).toContain('[1] Zakon o šumama USK, član 81 (Sl. glasnik USK 22/12)');
    expect(t).not.toContain('Pravilnik o doznaci');
    expect(t).not.toContain('**');
  });
  it('bez citata navodi sve izvore, a bez izvora nema sekcije Izvori', () => {
    expect(shareText('', 'Odgovor.', src)).toContain('[2] Pravilnik o doznaci');
    expect(shareText('', 'Odgovor.', [])).not.toContain('Izvori');
  });
});
