import type { EligibleGrnGroup } from '../../api/work-assignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

/** Sentinel for "every part in scope". */
export const ALL_PARTS = 'ALL'
/** Sentinel for "no GRN filter" — every device waiting at this stage. The server
 *  omits the filter when grn_batch_id is null (it can't ask for `IS NULL`). */
export const ALL_GRNS = 'all'

export type GrnLine = NonNullable<EligibleGrnGroup['lines']>[number]

/** `{id,label,…}` rows the AsyncSelects render + search on; the source row rides
 *  along so a pick can seed the available count without a re-lookup. */
export interface GrnRow {
  id: string
  label: string
  /** NULL on the "All GRNs" row. */
  group: EligibleGrnGroup | null
}
export interface PartRow {
  id: string
  label: string
  /** NULL = the "all parts" sentinel row. */
  line: GrnLine | null
}

export function partLabel(oem?: string | null, part?: string | null, variant?: string | null): string {
  // Consecutive duplicates dropped: part_number and variant name are the same
  // string on ~99% of live rows, and repeating it wastes the count's width.
  const out: string[] = []
  for (const segment of [oem, part, variant]) {
    if (segment && out[out.length - 1] !== segment) out.push(segment)
  }
  return out.join('/')
}

/** The chosen GRN's trigger label — one GRN, or "All GRNs" — with its count. */
export function grnPickLabel(group: { grn_number?: string | null; pending_count: number } | undefined, totalWaiting: number) {
  if (group) return `${group.grn_number ?? S.issue.noGrn} · ${group.pending_count} ${S.issue.waiting}`
  return `${S.issue.allGrns} · ${totalWaiting} ${S.issue.waiting}`
}

/** The chosen part's trigger label — one line, or "All parts" — with its count;
 *  null while a picked line hasn't resolved. */
export function partPickLabel(partVariantId: string | null, line: GrnLine | undefined, scopeCount: number) {
  if (!partVariantId) return `${S.issue.allParts} · ${scopeCount}`
  if (!line) return null
  return `${partLabel(line.oem_name, line.part_number, line.variant_name)} · ${line.pending_count}`
}

/** Every part waiting at this stage, merged across receipts — counts summed,
 *  because the same part code legitimately appears in two containers. */
export function mergeGrnLines(groups: EligibleGrnGroup[]): GrnLine[] {
  const byVariant = new Map<string, GrnLine>()
  for (const g of groups) {
    for (const line of g.lines ?? []) {
      const seen = byVariant.get(line.part_variant_id)
      byVariant.set(
        line.part_variant_id,
        seen
          ? { ...seen, pending_count: (seen.pending_count ?? 0) + (line.pending_count ?? 0) }
          : line,
      )
    }
  }
  return [...byVariant.values()]
}

const receivedMs = (g: EligibleGrnGroup) => (g.received_at ? Date.parse(g.received_at) : 0)

// Newest first by the date each row shows; same-moment GRNs (one bulk receipt)
// fall back to the date-stamped number (GRN-YYYY-MM-DD-NNNNN), newest first.
const byNewestGrn = (a: EligibleGrnGroup, b: EligibleGrnGroup) =>
  receivedMs(b) - receivedMs(a) || (b.grn_number ?? "").localeCompare(a.grn_number ?? "")

/** GRN dropdown rows: "All GRNs" first (the default posture), then each
 *  receipt, newest first. The summary is one unpaged list, so sorting here is safe. */
export function grnRows(groups: EligibleGrnGroup[], totalWaiting: number): GrnRow[] {
  return [
    {
      id: ALL_GRNS,
      label: `${S.issue.allGrns} · ${totalWaiting} ${S.issue.waiting}`,
      group: null,
    },
    ...groups
      .filter((g) => g.grn_batch_id)
      .sort(byNewestGrn)
      .map((g) => ({
        id: g.grn_batch_id as string,
        label: `${g.grn_number ?? S.issue.noGrn} · ${g.pending_count} ${S.issue.waiting}`,
        group: g,
      })),
  ]
}
