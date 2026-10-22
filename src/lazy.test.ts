import { afterEach, describe, expect, it, vi } from 'vitest';
import { lazy, whenIdle } from './lazy';

describe('lazy', () => {
  it('gradi vrijednost tek pri prvom get() i samo jednom', () => {
    const build = vi.fn(() => ({ n: 1 }));
    const l = lazy(build);
    expect(build).not.toHaveBeenCalled();
    expect(l.get()).toBe(l.get());
    expect(build).toHaveBeenCalledTimes(1);
  });
  it('reset() poništava vrijednost; sljedeći get() gradi iznova', () => {
    let n = 0;
    const l = lazy(() => ++n);
    expect(l.get()).toBe(1);
    l.reset();
    expect(l.isBuilt()).toBe(false);
    expect(l.get()).toBe(2);
  });
  it('isBuilt() je tačno samo nakon građenja', () => {
    const l = lazy(() => 'x');
    expect(l.isBuilt()).toBe(false);
    l.get();
    expect(l.isBuilt()).toBe(true);
  });
});

describe('whenIdle', () => {
  afterEach(() => vi.useRealTimers());
  it('pokreće funkciju poslije prvog prikaza (odgođeno), ne odmah', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    whenIdle(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('otkazivanje spriječava izvršenje', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const cancel = whenIdle(fn);
    cancel();
    vi.runAllTimers();
    expect(fn).not.toHaveBeenCalled();
  });
  it('odgoda: ne pokreće se prije isteka odgode', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    whenIdle(fn, 800);
    vi.advanceTimersByTime(799);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('otkazivanje prije isteka odgode sprječava izvršenje', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const cancel = whenIdle(fn, 800);
    vi.advanceTimersByTime(400);
    cancel();
    vi.runAllTimers();
    expect(fn).not.toHaveBeenCalled();
  });
});
