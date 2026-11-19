import type { CustomerDeficiencyWire } from "../../api"
import {
  DEFICIENCY_STATUS_LABEL,
  DEFICIENCY_TYPE_LABEL,
  type DeficiencyStatus,
  type DeficiencyType,
} from "../../constants/deficiency"
import { DEFICIENCIES_STRINGS as S } from "./deficiencies.strings"

const C = S.list.columns

export const DEFICIENCY_COLUMNS = [
  { key: "select", label: C.select, width: "4%" },
  { key: "type", label: C.type, width: "22%" },
  { key: "customer", label: C.customer, width: "20%" },
  { key: "serial", label: C.serial, width: "16%" },
  { key: "order", label: C.order, width: "14%" },
  { key: "status", label: C.status, width: "14%" },
  { key: "age", label: C.age, width: "10%", align: "right" as const },
]

/** Server-side status buckets (§16.8). */
export const DEFICIENCY_TABS = [
  { id: "open", label: S.list.tabs.open, status: ["open"] },
  { id: "waiver", label: S.list.tabs.waiver, status: ["waiver_pending"] },
  { id: "charged", label: S.list.tabs.charged, status: ["charge_order_raised", "invoiced"] },
  { id: "done", label: S.list.tabs.done, status: ["closed", "waived", "recovered"] },
  { id: "all", label: S.list.tabs.all, status: undefined },
] as const

export type DeficiencyTabId = (typeof DEFICIENCY_TABS)[number]["id"]

export function toDeficiencyRow(d: CustomerDeficiencyWire): Record<string, unknown> {
  return {
    id: d.id,
    select: d.id,
    type: DEFICIENCY_TYPE_LABEL[d.deficiency_type as DeficiencyType] ?? d.deficiency_type,
    customer: d.account_name ?? "—",
    serial: d.serial_number ?? "—",
    order: d.order_number ?? "—",
    status: DEFICIENCY_STATUS_LABEL[d.status as DeficiencyStatus] ?? d.status,
    age: S.list.age(d.days_open),
    _status: d.status,
    _chargeable: d.status === "open" && !d.is_credit,
  }
}
