import type { ToolbarFilter } from "@/components/common/tables/BusinessMetricsTable";

import type { useStockAdjustmentsList } from "../../hooks/stock-adjustments/useStockAdjustmentsList";
import {
  ADJUSTMENT_TAB_IDS,
  ADJUSTMENT_TAB_LABEL,
  STOCK_ADJUSTMENT_REASON_LABEL,
  STOCK_ADJUSTMENT_REASONS,
  type AdjustmentTabId,
} from "../../lib/stock-adjustment-labels";
import type { StockAdjustmentReason } from "../../stock-adjustments.api";
import { WarehousePicker } from "../shared/WarehousePicker";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

type ListView = ReturnType<typeof useStockAdjustmentsList>["lv"];

const REASON_OPTIONS = STOCK_ADJUSTMENT_REASONS.map((r) => ({
  value: r,
  label: STOCK_ADJUSTMENT_REASON_LABEL[r],
}));

// Status options mirror the tabs (minus "All"); the dropdown drives the same
// `activeTab`, so the status filter and the status tabs stay one source of truth.
const STATUS_OPTIONS = ADJUSTMENT_TAB_IDS.filter((id) => id !== "all").map((id) => ({
  value: id,
  label: ADJUSTMENT_TAB_LABEL[id],
}));

/** Toolbar filters for the adjustments list: warehouse, reason, status. */
export function adjustmentToolbarFilters(lv: ListView): ToolbarFilter[] {
  const { filters } = lv.view;
  return [
    {
      key: "warehouse",
      label: S.list.filterWarehouse,
      value: filters.warehouseId,
      options: [],
      render: () => (
        <div className="w-[220px]">
          <WarehousePicker
            value={filters.warehouseId}
            label={filters.warehouseName}
            onChange={(id, name) => lv.setFilters({ warehouseId: id, warehouseName: name })}
            placeholder={S.list.filterWarehouse}
            clearable
          />
        </div>
      ),
    },
    {
      key: "reason",
      label: S.list.filterReason,
      allLabel: S.list.allReasons,
      value: filters.reason,
      options: REASON_OPTIONS,
    },
    {
      key: "status",
      label: S.list.filterStatus,
      allLabel: S.list.allStatus,
      value: lv.activeTab === "all" ? "" : lv.activeTab,
      options: STATUS_OPTIONS,
    },
  ];
}

/** Toolbar "reset" / select changes → filter patch. */
export function onAdjustmentToolbarChange(lv: ListView, key: string, value: string): void {
  if (key === "reason") lv.setFilters({ reason: value as StockAdjustmentReason | "" });
  else if (key === "warehouse" && !value) lv.setFilters({ warehouseId: "", warehouseName: "" });
  else if (key === "status") lv.setActiveTab((value || "all") as AdjustmentTabId);
}
