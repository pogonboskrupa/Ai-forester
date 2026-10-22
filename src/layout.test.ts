import { describe, expect, it } from 'vitest';
import { DESKTOP_WIDTH, viewportContent } from './layout';

const AUTO = 'width=device-width,initial-scale=1,viewport-fit=cover';

describe('viewportContent', () => {
  it('automatski prikaz prati širinu uređaja', () => {
    expect(viewportContent('auto', 390)).toBe(AUTO);
    expect(viewportContent('auto', 1920)).toBe(AUTO);
  });
  it('desktop na telefonu traži računarsku širinu', () => {
    expect(viewportContent('desktop', 390)).toBe(`width=${DESKTOP_WIDTH},viewport-fit=cover`);
    expect(viewportContent('desktop', 820)).toBe(`width=${DESKTOP_WIDTH},viewport-fit=cover`);
  });
  it('desktop na računaru ništa ne mijenja (ekran je već širok)', () => {
    expect(viewportContent('desktop', 1280)).toBe(AUTO);
    expect(viewportContent('desktop', 1920)).toBe(AUTO);
  });
  it('nepoznata vrijednost se tretira kao automatski', () => {
    expect(viewportContent('nesto' as never, 390)).toBe(AUTO);
  });
});
