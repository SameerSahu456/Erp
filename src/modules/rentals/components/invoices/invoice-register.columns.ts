import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import type { CreditNoteRegisterRow } from "../../api/credit-notes";
import type { AutoInvoiceDay, RentalInvoiceRow } from "../../api/invoices";
import { formatRentalDay } from "../../lib/format";
import { INVOICE_STRINGS as S } from "./invoices.strings";

const CN = S.invoices.creditNoteRegister;
import { BILLING_COMMON_STRINGS as B } from "../shared/billing-common.strings";

// `sortable` mirrors exactly what the backend accepts — a header it cannot
// sort on would silently return the default order.
export const INVOICE_COLUMNS: ColumnDef[] = [
  { key: "number", label: S.invoices.columns.number, sortable: true },
  { key: "salesOrder", label: S.invoices.columns.salesOrder },
  { key: "account", label: S.invoices.columns.account, sortable: true },
  { key: "period", label: S.invoices.columns.period, sortable: true },
  { key: "issued", label: S.invoices.columns.issued, sortable: true },
  { key: "due", label: S.invoices.columns.due, sortable: true },
  { key: "lines", label: S.invoices.columns.lines, sortable: true, align: "right" },
  { key: "total", label: S.invoices.columns.total, sortable: true, align: "right" },
];

// The Auto tab pages over DAYS, newest first; there is no other order a
// list of runs is read in, so nothing sorts.
export const AUTO_DAY_COLUMNS: ColumnDef[] = [
  { key: "day", label: S.invoices.autoDays.day },
  { key: "count", label: S.invoices.autoDays.count, align: "right" },
  { key: "total", label: S.invoices.autoDays.total, align: "right" },
  { key: "download", label: "", align: "right" },
];

export function toInvoiceRow(inv: RentalInvoiceRow): Record<string, unknown> {
  return {
    id: inv.id,
    number: inv.invoice_number,
    salesOrder: inv.order_numbers.length ? inv.order_numbers.join(", ") : EMPTY_VALUE,
    account: inv.account ?? EMPTY_VALUE,
    period: inv.period ?? EMPTY_VALUE,
    issued: formatRentalDay(inv.issue_date),
    due: inv.due_date ? formatRentalDay(inv.due_date) : B.noDueDate,
    lines: inv.line_count,
    total: inv.total,
    _voided: inv.deleted_at != null,
    _noDueDate: !inv.due_date,
    _salesOrderId: inv.sales_order_ids[0] ?? null,
  };
}

// The Credit notes tab pages newest first; the register endpoint takes no sort.
export const CREDIT_NOTE_REGISTER_COLUMNS: ColumnDef[] = [
  { key: "salesOrder", label: CN.columns.salesOrder },
  { key: "invoice", label: CN.columns.invoice },
  { key: "cnNumber", label: CN.columns.cnNumber },
  { key: "cnDate", label: CN.columns.cnDate },
  { key: "account", label: CN.columns.account },
  { key: "amount", label: CN.columns.amount, align: "right" },
];

export function toCreditNoteRegisterRow(n: CreditNoteRegisterRow): Record<string, unknown> {
  return {
    id: n.id,
    salesOrder: n.order_numbers?.length ? n.order_numbers.join(", ") : EMPTY_VALUE,
    invoice: n.invoice_number,
    cnNumber: n.cn_number ?? CN.notIssued,
    cnDate: formatRentalDay(n.cn_date),
    account: n.account ?? EMPTY_VALUE,
    amount: formatINR(Number(n.amount)),
  };
}

export function toAutoDayRow(d: AutoInvoiceDay): Record<string, unknown> {
  return {
    id: d.day,
    day: formatRentalDay(d.day),
    count: d.invoice_count,
    total: d.total,
    // The raw ISO day for the download; the `day` cell is for reading.
    _day: d.day,
  };
}
