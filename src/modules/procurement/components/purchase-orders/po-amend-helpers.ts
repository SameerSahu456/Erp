import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

export const AMEND_S = PURCHASE_ORDERS_STRINGS.amendForm

export const LINE_COLS: { label: string; cls: string; required?: boolean }[] = [
  { label: AMEND_S.columns.srNo, cls: "w-[64px]" },
  { label: AMEND_S.columns.partNo, cls: "w-[190px]" },
  { label: AMEND_S.columns.partName, cls: "w-[190px]" },
  { label: AMEND_S.columns.category, cls: "w-[150px]" },
  { label: AMEND_S.columns.description, cls: "w-[274px]" },
  { label: AMEND_S.columns.qty, cls: "w-[108px] text-right" },
  { label: AMEND_S.columns.unitPrice, cls: "w-[110px] text-right" },
  { label: AMEND_S.columns.tax, cls: "w-[96px] text-right" },
  { label: AMEND_S.columns.amount, cls: "w-[130px] text-right" },
  { label: "", cls: "w-[44px]" },
]
