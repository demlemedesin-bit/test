/** CSV / JSON dosyası indirme yardımcıları (yalnızca tarayıcıda çağrılır). */

export type Cell = string | number | boolean | null | undefined;

function esc(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** UTF-8 BOM'lu, virgül ayraçlı CSV indirir (Excel Türkçe karakterleri doğru açar). */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  save(new Blob(['﻿' + toCsv(header, rows)], { type: 'text/csv;charset=utf-8' }), filename);
}

export function downloadJson(filename: string, data: unknown) {
  save(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
}
