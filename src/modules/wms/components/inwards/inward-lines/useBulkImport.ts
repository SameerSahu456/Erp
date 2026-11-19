import { toast } from 'sonner'

import { fetchVariantsListPage } from '@modules/ims'

import type { POExpectedLine } from '../../../api'
import { firstSerial, makeLine, type ManualLine } from './model'
import { lineFromVariant, poLineTitle } from './variant-map'
import { INWARDS_STRINGS } from '../inwards.strings'
import { saveBlob } from '@/shared/lib/saveBlob'

const T = INWARDS_STRINGS.toast

type Condition = 'new' | 'refurbished' | 'new_pull'
const CONDITION_CODES: readonly Condition[] = ['new', 'refurbished', 'new_pull']

/** Normalize a condition cell to a canonical code. Accepts the code or its
 *  label, any case/spacing: "New Pull" / "new pull" / "new-pull" → "new_pull".
 *  Returns undefined for a blank/unrecognized cell (row falls back to part-only
 *  matching). */
function normalizeCondition(raw?: string): Condition | undefined {
  const s = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return (CONDITION_CODES as readonly string[]).includes(s) ? (s as Condition) : undefined
}

function parseRow(row: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (inQuote) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuote = false
      } else cur += ch
    } else if (ch === '"') inQuote = true
    else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

type OffPoRow = { partNumber: string; condition: Condition | undefined; serial: string; qty: number }

// Prefer an exact (part number + condition) PO match; fall back to part number
// alone so a blank/renamed condition cell still binds a valid row.
function matchPoLine(pendingLines: POExpectedLine[], partNumber: string, condition?: Condition) {
  return (
    pendingLines.find((l) => l.part_number === partNumber && (!condition || l.condition === condition)) ??
    pendingLines.find((l) => l.part_number === partNumber)
  )
}

function onPoLine(match: POExpectedLine, serial: string, qty: number): ManualLine {
  const tracked = match.part_variant?.is_tracking ?? false
  return {
    ...makeLine(),
    variantId: match.part_variant_id ?? null,
    label: poLineTitle(match),
    onPo: true,
    sourceId: match.source_line_entity_id,
    tracked,
    pending: match.pending_quantity,
    partNumber: match.part_number ?? '',
    variantName: match.variant_name ?? '',
    condition: match.condition ?? '',
    bomEligible: match.is_bom_eligible,
    bom: match.bom ?? [],
    serial: tracked ? serial : '',
    qty: tracked ? 0 : Math.min(qty || 1, match.pending_quantity),
  }
}

function parseCsvLine(row: string): OffPoRow {
  const cols = parseRow(row)
  return {
    partNumber: cols[0],
    condition: normalizeCondition(cols[1]),
    serial: firstSerial(cols[2]),
    qty: Number(cols[3] ?? '') || 0,
  }
}

// Off-PO rows: resolve (part number + condition) to a catalog variant and add it
// as an off-PO line (same shape a manual off-PO add produces).
async function resolveOffPoRows(offPoRows: OffPoRow[], pendingLines: POExpectedLine[]) {
  const lines: ManualLine[] = []
  let unresolved = 0
  let ambiguous = 0
  for (const r of offPoRows) {
    const page = await fetchVariantsListPage({
      search: r.partNumber,
      condition: r.condition,
      page_size: 20,
      is_active: true,
    })
    const hits = (page.items ?? []).filter((x) => x.part_number === r.partNumber)
    if (hits.length === 0) {
      unresolved += 1
      continue
    }
    // >1 variant for the same (part, condition): pick the default, else the
    // first, and flag it so the operator verifies the choice in the grid.
    if (hits.length > 1) ambiguous += 1
    const v = hits.find((x) => x.is_default) ?? hits[0]
    lines.push({ ...makeLine(), ...lineFromVariant(v, pendingLines), serial: r.serial, qty: Math.max(r.qty || 1, 1) })
  }
  return { lines, unresolved, ambiguous }
}

/** Offline CSV template + bulk-import for PO receive lines. Each CSV row → one
 *  line; rows matching a PO part bind to it, the rest resolve to off-PO lines. */
export function useBulkImport({
  pendingLines,
  onChange,
}: {
  pendingLines: POExpectedLine[]
  onChange: (next: ManualLine[]) => void
}) {
  // Template: tracked → one row per pending unit (fill a serial each);
  // non-tracked → one row per line (fill a quantity).
  function downloadTemplate() {
    const header = ['Part Number', 'Condition', 'Serial Number', 'Qty']
    const body: string[][] = []
    for (const l of pendingLines) {
      const tracked = l.part_variant?.is_tracking ?? false
      const cond = l.condition ?? ''
      const pn = l.part_number ?? ''
      if (tracked) {
        for (let i = 0; i < l.pending_quantity; i++) body.push([pn, cond, '', '1'])
      } else {
        body.push([pn, cond, '', String(l.pending_quantity)])
      }
    }
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'inward-lines-template.csv')
  }

  // Bulk upload: each CSV row → one line (one unit) matched to the PO.
  async function handleBulkFile(file: File) {
    const text = await file.text()
    const raw = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
    if (raw.length <= 1) {
      toast.error(T.noDataRows)
      return
    }

    const next: ManualLine[] = []
    const offPoRows: OffPoRow[] = []
    for (const row of raw.slice(1)) {
      const parsed = parseCsvLine(row)
      if (!parsed.partNumber) continue
      const match = matchPoLine(pendingLines, parsed.partNumber, parsed.condition)
      // Not on the PO — resolved to an off-PO line after the loop.
      if (match) next.push(onPoLine(match, parsed.serial, parsed.qty))
      else offPoRows.push(parsed)
    }
    const { lines: offPoLines, unresolved, ambiguous } = await resolveOffPoRows(offPoRows, pendingLines)
    next.push(...offPoLines)

    if (next.length === 0) {
      toast.error(T.noRowsImported)
      return
    }
    const offCount = offPoRows.length - unresolved
    onChange(next)
    toast.success(T.importedLines(next.length, offCount, ambiguous, unresolved))
  }

  return { downloadTemplate, handleBulkFile }
}
