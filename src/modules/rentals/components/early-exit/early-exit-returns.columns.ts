import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import type { RentalReturnRequestWire } from "@modules/crm"

import { queuedReturnStatusLabel } from "../../constants/early-exit"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.returns

export const EARLY_EXIT_RETURN_COLUMNS = [
  { key: "request", label: S.columns.request, width: "16%" },
  { key: "order", label: S.columns.order, width: "16%" },
  { key: "account", label: S.columns.account, width: "22%" },
  { key: "units", label: S.columns.units, width: "10%", align: "right" as const },
  { key: "estimate", label: S.columns.estimate, width: "12%", align: "right" as const },
  { key: "status", label: S.columns.status, width: "12%" },
  { key: "raised", label: S.columns.raised, width: "12%" },
]

/** One queued return. Units and estimate count only the lines still
 *  waiting — an auto-approved sibling line is not the manager's to decide. */
export function toEarlyExitReturnRow(r: RentalReturnRequestWire): Record<string, unknown> {
  const waiting = r.items.filter((item) => item.approval_status === "pending")
  const estimate = waiting.reduce((sum, item) => sum + Number(item.early_exit_estimate ?? 0), 0)
  return {
    id: r.id,
    request: r.request_number,
    order: r.order_number ?? EMPTY_VALUE,
    account: r.account_name ?? EMPTY_VALUE,
    units: waiting.reduce((sum, item) => sum + item.quantity, 0),
    estimate: estimate > 0 ? formatINR(estimate) : EMPTY_VALUE,
    status: queuedReturnStatusLabel(r.status),
    raised: formatIST_date(r.created_at),
    _status: r.status,
  }
}
