import { useMemo } from "react"

import type { QuoteItemWire } from "../../api"
import type { LineItemsGridTrailingColumn } from "../../components/line-items"
import { ApproverCell, StatusCell } from "../../components/quotes/QuoteApprovalColumns"
import { QUOTES_STRINGS } from "../../components/quotes/quotes.strings"

const A = QUOTES_STRINGS.approval

/** Per-line Approver + Status columns for the read-only quote view — the same
 *  two trailing columns the Sales Order view shows, fed by the quote items'
 *  `approver_name`, `status` and `approval_notes`. BOM components show the
 *  decision they inherit from their headline. */
export function useQuoteApprovalColumns(
  items: readonly QuoteItemWire[] | undefined,
): LineItemsGridTrailingColumn[] | undefined {
  return useMemo(() => {
    if (!items || items.length === 0) return undefined
    const byId = new Map(items.map((i) => [i.id, i] as const))
    return [
      {
        key: "approver",
        header: A.columns.approver,
        widthClassName: "w-32",
        renderCell: (line) => {
          const item = line.serverId ? byId.get(line.serverId) : undefined
          return item ? <ApproverCell item={item} /> : null
        },
        renderChildCell: (child) => {
          const item = child.serverChildId ? byId.get(child.serverChildId) : undefined
          return item ? <ApproverCell item={item} /> : null
        },
      },
      {
        key: "status",
        header: A.columns.status,
        widthClassName: "w-32",
        renderCell: (line) => {
          const item = line.serverId ? byId.get(line.serverId) : undefined
          return item ? <StatusCell item={item} /> : null
        },
        renderChildCell: (child) => {
          const item = child.serverChildId ? byId.get(child.serverChildId) : undefined
          return item ? <StatusCell item={item} /> : null
        },
      },
    ]
  }, [items])
}
