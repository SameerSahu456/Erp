import type { ReportColumn, ReportRow } from '../types'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build RFC-4180 CSV text from report columns + rows. Raw values are written
 *  (no currency symbols) so the file loads cleanly into Excel / Sheets. */
export function buildCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => escapeCell(r[c.key])).join(','))
  return [header, ...body].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel on Windows picks up UTF-8 (₹, names with accents).
  const BOM = String.fromCharCode(0xfeff)
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
