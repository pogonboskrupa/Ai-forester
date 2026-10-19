import { useEffect, useState } from 'preact/hooks';
import { load, save } from '../../storage';

/** Lokalni datum (toISOString je UTC – između 00 i 02 h dao bi jučerašnji datum). */
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const uid = (): string => crypto.randomUUID();

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
export function exportCsv(name: string, header: string[], rows: string[][]): void {
  // BOM da Excel prepozna UTF-8 (š, č, ć, ž, đ)
  const csv = `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Otvara stranicu za štampu; vraća false ako je preglednik blokirao prozor. */
export function printHtml(title: string, body: string, css = ''): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="bs"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font:12pt/1.5 Georgia,serif;margin:2cm;color:#000}h1{font-size:15pt;margin:0 0 4px}table{border-collapse:collapse;width:100%;font:10pt/1.35 Arial,sans-serif}
th,td{border:1px solid #888;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eee}.pre{white-space:pre-wrap}${css}</style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}

/** Lista zapisa koja se čuva lokalno na uređaju (IndexedDB). */
export function useList<T extends { id: string }>(key: string) {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => void load<T>(key).then(setList), [key]);
  const persist = (next: T[]) => {
    setList(next);
    void save(key, next);
  };
  return [list, persist] as const;
}
