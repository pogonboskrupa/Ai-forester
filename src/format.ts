/** Bosanski format brojeva i datuma bez oslanjanja na Intl lokalizaciju (nije dostupna na svim uređajima). */

/** 1234.5 → "1.234,50" (tačka za hiljade, zarez za decimale). */
export function num(x: number, digits = 0): string {
  const neg = x < 0;
  const [int, dec] = Math.abs(x).toFixed(digits).split('.');
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 1. 12. 2026. (s vremenom: 1. 12. 2026. u 14:05) */
export function date(d: Date, withTime = false): string {
  const base = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}.`;
  return withTime ? `${base} u ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}
