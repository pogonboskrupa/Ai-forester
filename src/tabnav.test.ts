import { describe, expect, it } from 'vitest';
import { nextTabIndex } from './tabnav';

describe('nextTabIndex (strelice, Home, End)', () => {
  it('desna strelica ide naprijed i kruži na početak', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
  });
  it('lijeva strelica ide nazad i kruži na kraj', () => {
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
  });
  it('Home i End idu na prvi i zadnji', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 1, 4)).toBe(3);
  });
  it('druge tipke i prazna lista ne mijenjaju ništa', () => {
    expect(nextTabIndex('Enter', 1, 4)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
