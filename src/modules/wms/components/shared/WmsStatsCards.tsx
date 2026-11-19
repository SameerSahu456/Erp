import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CheckCircle2,
  Clock,
  Cpu,
  FileClock,
  Microscope,
  PackageCheck,
  PackageSearch,
  Paintbrush,
  RotateCcw,
  ScanLine,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";

import type { DataCardAccent } from "@/components/common/display/DataCard";
import { StatsRow, type StatCardData } from "@/components/common/display/StatsRow";

import type { WmsStatsScope } from "../../api";
import { useEngineerScope } from "../../hooks/operations/useStageAccess";
import { useWmsStats } from "../../hooks/operations/useWmsStats";
import { WMS_STATS_CARDS_STRINGS as S } from "./wms-stats-cards.strings";

type CardDef = { key: string; label: string; icon: LucideIcon; accent: DataCardAccent };

// Card PRESENTATION per scope (label · icon · accent). The VALUES come from the
// backend /wms/stats/{scope} endpoint, matched by `key`. Keep keys in sync with
// WmsStatsService's returned dicts.
const STAT_CONFIG: Record<WmsStatsScope, CardDef[]> = {
  inward: [
    { key: "draft", label: S.inward.draft, icon: FileClock, accent: "primary" },
    { key: "completed", label: S.inward.completed, icon: CheckCircle2, accent: "success" },
    { key: "cancelled", label: S.inward.cancelled, icon: XCircle, accent: "warning" },
    { key: "total", label: S.inward.total, icon: Boxes, accent: "info" },
  ],
  devices: [
    { key: "in_inspection", label: S.devices.in_inspection, icon: ScanLine, accent: "info" },
    { key: "in_repair", label: S.devices.in_repair, icon: Wrench, accent: "warning" },
    { key: "in_qc", label: S.devices.in_qc, icon: Microscope, accent: "violet" },
    { key: "total", label: S.devices.total, icon: Cpu, accent: "primary" },
  ],
  inspection: [
    { key: "pending", label: S.inspection.pending, icon: Clock, accent: "warning" },
    { key: "under_inspection", label: S.inspection.under_inspection, icon: ScanLine, accent: "info" },
    { key: "completed", label: S.inspection.completed, icon: CheckCircle2, accent: "success" },
  ],
  repair: [
    { key: "in_repair", label: S.repair.in_repair, icon: Wrench, accent: "warning" },
    { key: "completed", label: S.repair.completed, icon: CheckCircle2, accent: "success" },
    { key: "total", label: S.repair.total, icon: Boxes, accent: "primary" },
  ],
  spares: [
    { key: "open_requests", label: S.spares.open_requests, icon: PackageSearch, accent: "warning" },
    { key: "fulfilled", label: S.spares.fulfilled, icon: PackageCheck, accent: "success" },
    { key: "cancelled", label: S.spares.cancelled, icon: XCircle, accent: "danger" },
  ],
  paint: [
    { key: "in_paint", label: S.paint.in_paint, icon: Paintbrush, accent: "violet" },
    { key: "at_vendor", label: S.paint.at_vendor, icon: Truck, accent: "warning" },
    { key: "completed", label: S.paint.completed, icon: CheckCircle2, accent: "success" },
    { key: "total", label: S.paint.total, icon: Boxes, accent: "primary" },
  ],
  qc: [
    { key: "pending_qc", label: S.qc.pending_qc, icon: Clock, accent: "warning" },
    { key: "under_qc", label: S.qc.under_qc, icon: Microscope, accent: "info" },
    { key: "completed", label: S.qc.completed, icon: PackageCheck, accent: "primary" },
    { key: "passed", label: S.qc.passed, icon: CheckCircle2, accent: "success" },
    { key: "failed", label: S.qc.failed, icon: XCircle, accent: "danger" },
  ],
  material_issue: [
    { key: "issued", label: S.material_issue.issued, icon: PackageCheck, accent: "info" },
    { key: "ready_for_dispatch", label: S.material_issue.ready_for_dispatch, icon: Truck, accent: "warning" },
    { key: "returned", label: S.material_issue.returned, icon: RotateCcw, accent: "teal" },
    { key: "total", label: S.material_issue.total, icon: Boxes, accent: "primary" },
  ],
  dispatch: [
    { key: "draft", label: S.dispatch.draft, icon: FileClock, accent: "primary" },
    { key: "dispatched", label: S.dispatch.dispatched, icon: Truck, accent: "info" },
    { key: "delivered", label: S.dispatch.delivered, icon: CheckCircle2, accent: "success" },
    { key: "total", label: S.dispatch.total, icon: Boxes, accent: "violet" },
  ],
};

/**
 * Summary stat cards atop a WMS page, backed by the dedicated
 * `GET /wms/stats/{scope}` endpoint. Warehouse-scoped and filter-independent —
 * the values never change with the table's tabs, search, filters, or pagination.
 * Drop directly under the page header, above the table.
 */
export function WmsStatsCards({
  scope,
  warehouseId,
  warehouseIds,
}: {
  scope: WmsStatsScope;
  /** Back-compat single warehouse — use `warehouseIds` for the navbar
   *  multi-select. When both are omitted the cards are warehouse-wide. */
  warehouseId?: string;
  /** Navbar multi-select — the union of these warehouses. */
  warehouseIds?: string[];
}) {
  // Engineer roles get scoped to their own assigned devices/ops (managers &
  // admin resolve to no assignee → warehouse-wide). Inward/spares ignore it BE-side.
  const { assignee_id: assigneeId } = useEngineerScope();
  const ids = warehouseIds ?? (warehouseId ? [warehouseId] : []);
  const { data } = useWmsStats(scope, ids, assigneeId);
  // On Material Issue the engineer only owns Issued + Ready-for-Dispatch work
  // (no Returned, and no warehouse-wide Total) — so they see just those two
  // cards, which now scope to their own units (CP-193 #8). `assigneeId` is set
  // only for a pure engineer; managers/admin keep all four cards warehouse-wide.
  const cardDefs =
    scope === "material_issue" && assigneeId
      ? STAT_CONFIG[scope].filter(
          (c) => c.key === "issued" || c.key === "ready_for_dispatch",
        )
      : STAT_CONFIG[scope];
  const stats: StatCardData[] = cardDefs.map((c) => ({
    label: c.label,
    value: data?.stats?.[c.key] ?? 0,
    icon: c.icon,
    accent: c.accent,
  }));
  return <StatsRow stats={stats} />;
}
