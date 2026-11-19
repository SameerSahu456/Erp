import { DISPATCH_STATUS_TABS } from "../../constants/dispatch-request";
import { DISPATCH_STRINGS as S } from "./dispatches.strings";

export type DispatchStatusTabId = (typeof DISPATCH_STATUS_TABS)[number]["id"];
export const DISPATCH_STATUS_TAB_IDS: DispatchStatusTabId[] = DISPATCH_STATUS_TABS.map((t) => t.id);

export function dispatchStatusForTab(id: DispatchStatusTabId) {
  return DISPATCH_STATUS_TABS.find((t) => t.id === id)?.status;
}

// Backend `q` cap — a long paste never 422s the list.
export const DISPATCH_SEARCH_MAX = 100;

export const DISPATCH_LIST_COLUMNS = [
  { key: "dispatchNumber", label: S.list.columns.dispatchNumber, sortable: true },
  { key: "account", label: S.list.columns.account },
  { key: "dispatchType", label: S.list.columns.dispatchType, sortable: true },
  { key: "status", label: S.list.columns.status, sortable: true },
  { key: "warehouse", label: S.list.columns.warehouse, sortable: true },
  { key: "dispatched", label: S.list.columns.dispatched, sortable: true },
];

// Column key → backend `sort` field; only server-sortable columns.
export const DISPATCH_SORT_FIELD_MAP: Readonly<Record<string, string>> = {
  dispatchNumber: "dispatch_number",
  dispatchType: "dispatch_type",
  status: "status",
  warehouse: "warehouse",
  dispatched: "dispatched_at",
};
