/** Vrijednost koja se gradi tek kad zatreba (npr. indeks pretrage); reset() je poništava. */
export function lazy<T>(build: () => T) {
  let value: T | undefined;
  let built = false;
  return {
    get(): T {
      if (!built) {
        value = build();
        built = true;
      }
      return value as T;
    },
    reset(): void {
      built = false;
      value = undefined;
    },
    isBuilt: (): boolean => built,
  };
}

/**
 * Izvršava fn kad pregledač miruje, ali ne prije isteka odgode (da prvi prikaz ostane nesmetan);
 * vraća funkciju za otkazivanje.
 */
export function whenIdle(fn: () => void, delay = 0, timeout = 1500): () => void {
  const ric = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
  let cancelIdle = (): void => undefined;
  const t = setTimeout(() => {
    if (ric.requestIdleCallback) {
      const h = ric.requestIdleCallback(fn, { timeout });
      cancelIdle = () => ric.cancelIdleCallback?.(h);
    } else fn();
  }, delay);
  return () => {
    clearTimeout(t);
    cancelIdle();
  };
}
