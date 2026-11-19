import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";

import { WAREHOUSE_TEAM_STRINGS as S } from "./warehouse-team.strings";

/** Table column key → backend `sort` field (server allow-list). */
export const TEAM_SORT_FIELDS: Readonly<Record<string, string>> = {
  name: "name",
  email: "email",
  role: "role",
  level: "level",
};

/** The actions column only exists for team managers (§0.9). */
export function teamColumns(canManage: boolean): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "name", label: S.columns.name, sortable: true },
    { key: "email", label: S.columns.email, sortable: true },
    { key: "role", label: S.columns.role, sortable: true },
    { key: "level", label: S.columns.level, sortable: true },
  ];
  if (canManage) columns.push({ key: "actions", label: S.columns.actions, align: "right", width: "7rem" });
  return columns;
}
