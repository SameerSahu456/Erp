import { formatIST_date } from "@shared/lib/date"

import type { InwardException } from "../../api"
import {
  INWARD_EXCEPTION_STATUS_LABEL,
  type InwardExceptionStatus,
} from "../../constants/inward-exception"
import { RENTAL_SCAN_KIND_LABEL, type RentalScanKind } from "../../constants/rental-scan"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

const C = S.list.columns

export const INWARD_EXCEPTION_COLUMNS = [
  { key: "serial", label: C.serial, width: "16%" },
  { key: "kind", label: C.kind, width: "16%" },
  { key: "customer", label: C.customer, width: "18%" },
  { key: "request", label: C.request, width: "14%" },
  { key: "batch", label: C.batch, width: "14%" },
  { key: "status", label: C.status, width: "12%" },
  { key: "raised", label: C.raised, width: "10%" },
]

/** Tabs are server-side status filters (§16.8). */
export const INWARD_EXCEPTION_TABS = [
  { id: "open", label: S.list.tabs.open, status: ["open"] },
  { id: "returning", label: S.list.tabs.returning, status: ["returning"] },
  { id: "resolved", label: S.list.tabs.resolved, status: ["linked", "voided", "returned"] },
  { id: "all", label: S.list.tabs.all, status: undefined },
] as const

export const KIND_FILTER_OPTIONS = (Object.keys(RENTAL_SCAN_KIND_LABEL) as RentalScanKind[])
  .filter((k) => k !== "accepted")
  .map((k) => ({ value: k, label: RENTAL_SCAN_KIND_LABEL[k] }))

export function toInwardExceptionRow(row: InwardException): Record<string, unknown> {
  return {
    id: row.id,
    serial: row.scanned_serial,
    kind: RENTAL_SCAN_KIND_LABEL[row.kind as RentalScanKind] ?? row.kind,
    customer: row.account_name ?? S.list.none,
    request: row.request_number ?? S.list.none,
    batch: row.grn_number ?? S.list.none,
    status: INWARD_EXCEPTION_STATUS_LABEL[row.status as InwardExceptionStatus] ?? row.status,
    raised: formatIST_date(row.created_at),
    _status: row.status,
    _overdue: row.overdue,
  }
}
