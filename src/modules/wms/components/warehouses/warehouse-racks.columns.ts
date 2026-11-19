import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";

import { WAREHOUSE_LOCATIONS_STRINGS } from "./warehouse-locations.strings";

const S = WAREHOUSE_LOCATIONS_STRINGS.racks;

/** Table column key → backend `sort` field (server allow-list). */
export const RACK_SORT_FIELDS: Readonly<Record<string, string>> = {
  name: "name",
  capacity: "capacity",
  current_occupancy: "current_occupancy",
};

/** The row menu's column only exists for location managers (§0.9). */
export function rackColumns(canManage: boolean): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "expand", label: "", width: "3.5rem" },
    { key: "name", label: S.columns.name, sortable: true },
    { key: "capacity", label: S.columns.storageSlots, align: "right", sortable: true },
    { key: "current_occupancy", label: S.columns.occupied, align: "right", sortable: true },
    { key: "utilisation", label: S.columns.utilisation, width: "18rem" },
  ];
  if (canManage) columns.push({ key: "actions", label: "", width: "3.5rem" });
  return columns;
}

export const RACK_TYPE_OPTIONS = [
  { value: "direct", label: S.filters.typeDirect },
  { value: "with-bins", label: S.filters.typeWithBins },
];

