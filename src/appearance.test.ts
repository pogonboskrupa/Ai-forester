import { describe, expect, it } from 'vitest';
import { appearanceAttrs } from './appearance';
import { findArticleNo } from './jump';

describe('appearanceAttrs', () => {
  it('zadano: normalan tekst i obični kontrast, bez atributa', () => {
    expect(appearanceAttrs({ textSize: 'm', contrast: false })).toEqual({ 'data-text': null, 'data-contrast': null });
  });
  it('veći tekst i visok kontrast postavljaju atribute', () => {
    expect(appearanceAttrs({ textSize: 'xl', contrast: true })).toEqual({ 'data-text': 'xl', 'data-contrast': 'high' });
  });
  it('nepoznata vrijednost iz starih postavki pada na zadano', () => {
    expect(appearanceAttrs({ textSize: 'huge' as never, contrast: undefined as never })['data-text']).toBeNull();
  });
});

describe('findArticleNo', () => {
  const nums = ['1', '2', '14', '14a', '15', 'dio 2'];
  it('nalazi tačan broj, uz "čl.", tačku i razmake', () => {
    expect(findArticleNo(nums, '15')).toBe('15');
    expect(findArticleNo(nums, ' čl. 14. ')).toBe('14');
    expect(findArticleNo(nums, 'Član 2')).toBe('2');
  });
  it('razlikuje 14 i 14a (slova ne smiju se gubiti)', () => {
    expect(findArticleNo(nums, '14a')).toBe('14a');
    expect(findArticleNo(nums, '14 A')).toBe('14a');
  });
  it('nepostojeći ili prazan unos vraća null', () => {
    expect(findArticleNo(nums, '99')).toBeNull();
    expect(findArticleNo(nums, '')).toBeNull();
  });
});
