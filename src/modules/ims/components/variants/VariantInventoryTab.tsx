import { useNavigate } from "react-router-dom";

import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";
import {
  AsyncSelect,
  makeStaticAsyncOptions,
} from "@/components/ui/async-select";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import {
  STOCK_STATUS_FILTER_OPTIONS,
  STOCK_STATUS_LABELS,
  stockDisplayStatus,
} from "../../constants";
import { PAGINATION } from "@/shared/constants";
import { VARIANTS_STRINGS } from "./variants.strings";
import { formatDate } from "./variant-detail-helpers";

// ---------------------------------------------------------------------------
// Inventory tab
// ---------------------------------------------------------------------------

// Static, searchable option source for the inventory Status filter — the same
// AsyncSelect used across IMS/WMS filters. Built once; the status set is fixed.
const useStockStatusFilterOptions = makeStaticAsyncOptions(
  STOCK_STATUS_FILTER_OPTIONS.map((o) => ({ id: o.value, name: o.label })),
  (o) => o.name,
);

export function InventoryTab({
  stockItems,
  variantSku,
  conditionLabel,
  conditionVariant,
  page,
  pageSize,
  total,
  allTotal,
  search,
  status,
  onStatusChange,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
}: {
  stockItems: Array<{
    id: string;
    serial_number: string | null;
    rack: string | null;
    bin: string | null;
    warehouse_name?: string | null;
    location_name?: string | null;
    status: string;
    workflow_status?: string | null;
    vendor_prior_workflow_status?: string | null;
    vendor_section_names?: string[] | null;
    created_at: string;
  }>;
  // Every unit here belongs to THIS variant, so SKU + Condition are constants
  // pulled from the variant (matching the Part inventory table's columns,
  // minus the redundant per-row "Variant" name).
  variantSku: string;
  conditionLabel: string;
  conditionVariant: "success" | "info" | "warning";
  page: number;
  pageSize: number;
  total: number;
  /** Total count before the search/status filters — distinguishes
   *  "variant has no stock at all" from "no rows match the filters". */
  allTotal: number;
  search: string;
  status: string;
  onStatusChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const navigate = useNavigate();
  // True empty (no stock at all) — no search input, no filter affordance.
  if (allTotal === 0) {
    return (
      <Typography variant="body" tone="muted" align="center" className="py-8">
        {VARIANTS_STRINGS.inventory.noStockItems}
      </Typography>
    );
  }

  const columns: TabConfig["columns"] = [
    { key: "sku", label: VARIANTS_STRINGS.inventory.colSku },
    { key: "condition", label: VARIANTS_STRINGS.inventory.colCondition },
    { key: "serialQty", label: VARIANTS_STRINGS.inventory.colSerialQty },
    { key: "location", label: VARIANTS_STRINGS.inventory.colLocation },
    { key: "status", label: VARIANTS_STRINGS.inventory.colStatus },
    { key: "added", label: VARIANTS_STRINGS.inventory.colAdded },
  ];
  const rows = stockItems.map((s) => ({
    id: s.id,
    sku: variantSku,
    serialQty: s.serial_number,
    location:
      s.location_name ?? ([s.rack, s.bin].filter(Boolean).join(" / ") || null),
    warehouse: s.warehouse_name ?? null,
    status: s.status,
    workflow_status: s.workflow_status ?? null,
    vendor_prior_workflow_status: s.vendor_prior_workflow_status ?? null,
    vendor_section_names: s.vendor_section_names ?? null,
    added: s.created_at,
    // Serialized unit == WMS device (device id == stock-item id); its row opens
    // the device page. Bulk rows stay static.
    isDevice: !!s.serial_number,
  }));
  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "sku") {
      return {
        display: (
          <Typography variant="helper" className="font-mono">
            {String(value)}
          </Typography>
        ),
      };
    }
    if (key === "condition") {
      return {
        display: (
          <StatusBadge variant={conditionVariant}>{conditionLabel}</StatusBadge>
        ),
      };
    }
    if (key === "serialQty") {
      return {
        display: value ? (
          <Typography variant="helper" tone="inherit" className="font-mono">{String(value)}</Typography>
        ) : (
          <Typography variant="helper">
            {VARIANTS_STRINGS.inventory.bulkUnit}
          </Typography>
        ),
      };
    }
    if (key === "location") {
      const loc = (value as string | null) ?? null;
      const wh = (row.warehouse as string | null) ?? null;
      return {
        display:
          loc || wh ? (
            <div className="flex flex-col leading-tight">
              <TruncatedText value={loc ?? "—"} className="text-foreground" />
              {wh && (
                <TruncatedText value={wh} className="text-muted-foreground" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{"—"}</span>
          ),
      };
    }
    if (key === "status") {
      // In-pipeline units (workflow_status set) show their ops STAGE, not the
      // decoupled physical "available".
      const disp = stockDisplayStatus(
        String(value),
        row.workflow_status as string | null,
        row.vendor_prior_workflow_status as string | null,
        row.vendor_section_names as string[] | null,
      );
      // Long composed labels ("In Repair · Section A, Section B …") must
      // ellipsize INSIDE the pill — the badge is an inline-flex box, so the
      // 200px table cell clips it with a hard edge otherwise. Cap the pill +
      // truncate the text; `title` reveals the full label on hover.
      return {
        display: (
          <StatusBadge variant={disp.variant} className="max-w-full min-w-0">
            <span className="min-w-0 truncate" title={disp.label}>
              {disp.label}
            </span>
          </StatusBadge>
        ),
      };
    }
    if (key === "added") {
      return { display: formatDate(String(value)) };
    }
    return null;
  };
  const filtersActive = search.trim().length > 0 || status !== "all";

  return (
    <BusinessMetricsTable
      showIndex
      searchable
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={VARIANTS_STRINGS.inventory.searchPlaceholder}
      tabs={[
        {
          id: "inventory",
          label: VARIANTS_STRINGS.inventory.tableAriaLabel,
          columns,
          data: rows,
        },
      ]}
      activeTab="inventory"
      cellFormatter={cellFormatter}
      onRowClick={(row) => {
        if (row.isDevice) navigate(`/wms/devices/${String(row.id)}`);
      }}
      toolbarFilters={[
        {
          key: "status",
          label: VARIANTS_STRINGS.inventory.statusFilter.label,
          // `value` stays populated so "clear filters" detects an active status;
          // `render` owns the actual control (a searchable AsyncSelect).
          value: status === "all" ? "" : status,
          options: [],
          render: () => (
            <AsyncSelect
              value={
                status === "all"
                  ? null
                  : { id: status, label: STOCK_STATUS_LABELS[status] ?? status }
              }
              onValueChange={(next) => onStatusChange(next?.id ?? "all")}
              useOptions={useStockStatusFilterOptions}
              toLabel={(o) => o.name}
              placeholder={VARIANTS_STRINGS.inventory.statusFilter.all}
              allOption={VARIANTS_STRINGS.inventory.statusFilter.all}
              searchPlaceholder={
                VARIANTS_STRINGS.inventory.statusFilter.searchPlaceholder
              }
              searchable
              clearable
              chevron="down"
              className="h-9 w-[190px]"
            />
          ),
        },
      ]}
      serverPagination={{
        page,
        pageSize,
        total,
        onPageChange,
        onPageSizeChange,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
      }}
      emptyState={{
        title: filtersActive
          ? VARIANTS_STRINGS.inventory.noFilterMatch
          : VARIANTS_STRINGS.inventory.noStockItems,
        description: VARIANTS_STRINGS.inventory.noMatchHint,
      }}
      // Reset the parent-owned search + status so the empty-state "Clear
      // filters" returns to the full inventory; `externalFiltersActive` keeps
      // the "No results match your filters" state showing for either filter.
      onClearFilters={() => {
        onSearchChange("");
        onStatusChange("all");
      }}
      externalFiltersActive={filtersActive}
    />
  );
}
