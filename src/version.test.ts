import { describe, expect, it } from 'vitest';
import { compareVersions, isNewer } from './version';

describe('verzije', () => {
  it('poredi po ciframa, ne kao tekst', () => {
    expect(isNewer('1.1.0', '1.0.9')).toBe(true);
    expect(isNewer('2.0.0', '1.9.9')).toBe(true);
    expect(isNewer('1.0.2', '1.0.2')).toBe(false);
    expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
  });
});
