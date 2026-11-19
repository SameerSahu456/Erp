import type { DateRange } from "@/components/common/pickers/DateRangePicker";

import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";

export type TransferTabId = "all" | "in_transit" | "overdue" | "received";
export const TRANSFER_TAB_IDS = ["all", "in_transit", "overdue", "received"] as const;

export const TRANSFER_TAB_LABEL: Record<TransferTabId, string> = {
  all: S.tabAll,
  in_transit: S.tabInTransit,
  overdue: S.tabOverdue,
  received: S.tabReceived,
};

/** The status/overdue filter each tab maps to on the server. */
export const TRANSFER_TAB_FILTER: Record<TransferTabId, { status?: string; overdue?: boolean }> = {
  all: {},
  in_transit: { status: "in_transit" },
  overdue: { overdue: true },
  received: { status: "received" },
};

/** Table column key → backend sort field. Only these three columns sort. */
export const TRANSFER_SORT_FIELD_MAP: Readonly<Record<string, string>> = {
  number: "transfer_number",
  dispatched: "dispatched_at",
  expected: "expected_delivery_date",
};

export interface TransferFilters {
  /** Sent (dispatched_at) IST-day range. */
  sentRange: DateRange | undefined;
  /** Expected delivery IST-day range. */
  expectedRange: DateRange | undefined;
}

export const emptyTransferFilters = (): TransferFilters => ({
  sentRange: undefined,
  expectedRange: undefined,
});

export const TRANSFER_COLUMNS = [
  { key: "number", label: S.colNumber, sortable: true },
  { key: "route", label: S.colRoute },
  { key: "status", label: S.colStatus },
  { key: "units", label: S.colUnits, align: "right" as const },
  { key: "dispatched", label: S.colDispatched, align: "right" as const, sortable: true },
  { key: "expected", label: S.colExpected, align: "right" as const, sortable: true },
];

// Same fixed width as BMT's built-in date filter so both ranges match.
export const TRANSFER_DATE_FILTER_CLASS = "h-9 w-[248px]";
