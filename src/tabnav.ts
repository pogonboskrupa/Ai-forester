/** Indeks taba na koji vodi tipka (strelice kruže, Home/End), ili null ako tipka ne služi navigaciji. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/** Jedan slušalac za sve tablist-ove: strelice pomjeraju fokus i aktiviraju susjedni tab. */
export function setupTabKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    const tab = (e.target as HTMLElement | null)?.closest<HTMLElement>('[role="tab"]');
    const list = tab?.closest('[role="tablist"]');
    if (!tab || !list) return;
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
    const next = nextTabIndex(e.key, tabs.indexOf(tab), tabs.length);
    if (next === null) return;
    e.preventDefault();
    const target = tabs[next]!;
    target.focus();
    target.click();
    target.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  });
}
