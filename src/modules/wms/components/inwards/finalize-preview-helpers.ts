import type { FinalizePreviewResponse } from '../../api'
import { INWARDS_STRINGS } from './inwards.strings'

const S = INWARDS_STRINGS.finalizePreview

// Summary keys → operator-facing labels, in display order.
export const SUMMARY_ROWS: { key: string; label: string }[] = [
  { key: 'lines_to_accept', label: S.summaryLinesAccepted },
  { key: 'lines_to_hold', label: S.summaryLinesHeld },
  { key: 'stock_items_to_create', label: S.summaryStockItemsCreated },
  { key: 'stock_items_to_flip', label: S.summaryStockItemsFlipped },
  { key: 'stock_movements_to_emit', label: S.summaryStockMovements },
  { key: 'inspection_ops_to_create', label: S.summaryInspectionOps },
]

type ValidationError = NonNullable<FinalizePreviewResponse['validation_errors']>[number]

const errorText = (e: ValidationError) =>
  `${e.line_index != null ? S.lineErrorPrefix(e.line_index + 1) : ''}${e.message}`

/** Everything the dialog shows, derived from the dry-run result. */
export function deriveFinalizePreview(
  data: FinalizePreviewResponse | undefined,
  blockingIssues: string[],
) {
  const issues = [...blockingIssues, ...(data?.validation_errors ?? []).map(errorText)]
  const blocked = issues.length > 0 || (data ? !data.would_succeed : false)
  const discrepancyCount =
    (data?.discrepancies?.length ?? 0) + (data?.quantity_variance?.length ?? 0)
  // Why Confirm is disabled (§0.9) — the DATA gate only (`!data || blocked`),
  // never the pending part. Blocked → the listed issues; no data → the check errored.
  const blockReason = blocked ? S.finalizeBlockedHint : data ? null : S.error
  return {
    issues,
    blocked,
    discrepancyCount,
    summary: data?.summary as Record<string, number> | undefined,
    blockReason,
  }
}

export type FinalizePreviewView = ReturnType<typeof deriveFinalizePreview>
