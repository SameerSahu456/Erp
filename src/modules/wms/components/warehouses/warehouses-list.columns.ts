import type { TabConfig } from "@/components/common/tables/BusinessMetricsTable";

import { CONDITION_LABELS } from "../../constants/condition";
import { WAREHOUSES_BODY_STRINGS as S } from "./warehouses-body.strings";

export type WarehouseStatusTabId = "active" | "inactive" | "all";

// Status filter tabs → backend `is_active` value (undefined on "All" = no
// filter). Each tab is a real server-side filter — never a client-side slice.
export const WAREHOUSE_STATUS_TABS: readonly { id: WarehouseStatusTabId; isActive: boolean | undefined }[] = [
  { id: "active", isActive: true },
  { id: "inactive", isActive: false },
  { id: "all", isActive: undefined },
];
export const WAREHOUSE_STATUS_TAB_IDS = WAREHOUSE_STATUS_TABS.map((t) => t.id);

export const isActiveForTab = (id: WarehouseStatusTabId) =>
  WAREHOUSE_STATUS_TABS.find((t) => t.id === id)?.isActive;

// Table column key → backend `sort` field (server allow-list).
export const WAREHOUSE_SORT_FIELD_MAP: Readonly<Record<string, string>> = { name: "name", code: "code" };
// With no column sort, newest-first — the backend defaults to name-asc.
export const WAREHOUSE_DEFAULT_SORT = "-created_at";

export const WAREHOUSE_CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Actions column is hidden for users who can't manage (§0.9).
export function warehouseColumns(canManage: boolean): TabConfig["columns"] {
  const cols: TabConfig["columns"] = [
    { key: "name", label: S.columns.name, sortable: true, width: "18rem" },
    { key: "code", label: S.columns.code, sortable: true, width: "12%" },
    { key: "location", label: S.columns.location, width: "22%" },
    { key: "conditions", label: S.columns.conditions, width: "24%" },
    { key: "status", label: S.columns.status, width: "8%" },
  ];
  if (canManage) cols.push({ key: "actions", label: S.columns.actions, align: "right", width: "8%" });
  return cols;
}
