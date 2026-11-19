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
import type { StockItemListRow } from "../../api";
import { PARTS_STRINGS } from "./parts.strings";
import { formatDate } from "./part-detail-helpers";

const SI = PARTS_STRINGS.inventory;

// Static, searchable option source for the inventory Status filter (the same
// AsyncSelect used across IMS/WMS filters). Built once — the status set is fixed.
const useStockStatusFilterOptions = makeStaticAsyncOptions(
  STOCK_STATUS_FILTER_OPTIONS.map((o) => ({ id: o.value, name: o.label })),
  (o) => o.name,
);
// Sibling of the Status filter — the three physical conditions a stock unit
// can carry. Same fixed, searchable AsyncSelect source.
const CONDITION_FILTER_VALUES = ["new", "refurbished", "new_pull"] as const;
const CONDITION_FILTER_LABELS =
  PARTS_STRINGS.inventory.conditionFilter.options;
const useConditionFilterOptions = makeStaticAsyncOptions(
  CONDITION_FILTER_VALUES.map((v) => ({ id: v, name: CONDITION_FILTER_LABELS[v] })),
  (o) => o.name,
);

// ─── Inventory tab — condition-grouped variant tables ────────────────────────

// Inventory tab — physical stock items across every variant under this
// part. Server-paginated via /stock-items?part_id=…. Matches the
// VariantDetailPage Inventory tab vocabulary (Serial / Location / Status
// / Added) but adds a leading "Variant" column so operators can tell
// which sub-SKU each unit belongs to without leaving the page.
export function InventoryTab({
  stockItems,
  page,
  pageSize,
  total,
  isFetching,
  search,
  status,
  onStatusChange,
  condition,
  onConditionChange,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
}: {
  stockItems: StockItemListRow[];
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
  search: string;
  status: string;
  onStatusChange: (v: string) => void;
  condition: string;
  onConditionChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Reset every inventory filter (search + status + condition) in ONE write. */
  onClearFilters: () => void;
}) {

  const navigate = useNavigate();
  const conditionMeta: Record<
    string,
    { label: string; variant: "success" | "info" | "warning" }
  > = {
    new: { label: "New", variant: "success" },
    refurbished: { label: "Refurbished", variant: "info" },
    new_pull: { label: "New Pull", variant: "warning" },
  };

  // True-empty (no stock at all, no search, no active filter) — drop the search
  // affordance entirely so the page isn't a search box over nothing.
  if (
    total === 0 &&
    search.trim().length === 0 &&
    status === "all" &&
    condition === "all"
  ) {
    return (
      <Typography variant="body" tone="muted" align="center" className="py-8">
        {SI.noStockYet}
      </Typography>
    );
  }

  const columns: TabConfig["columns"] = [
    { key: "variant", label: SI.columns.variant },
    { key: "sku", label: SI.columns.sku },
    { key: "condition", label: SI.columns.condition },
    { key: "serialQty", label: SI.columns.serialQty },
    { key: "location", label: SI.columns.location },
    { key: "status", label: SI.columns.status },
    { key: "added", label: SI.columns.added },
  ];
  const rows = stockItems.map((s) => ({
    id: s.id,
    variant: s.variant_name,
    sku: s.sku_code ?? "—",
    condition: s.variant_condition,
    serialQty: s.serial_number
      ? s.serial_number
      : s.quantity != null
        ? `${s.quantity} pcs`
        : SI.bulkUnit,
    location:
      s.location_name ?? ([s.rack, s.bin].filter(Boolean).join(" / ") || null),
    warehouse: s.warehouse_name,
    status: s.status,
    workflow_status: s.workflow_status,
    vendor_prior_workflow_status: s.vendor_prior_workflow_status ?? null,
    vendor_section_names: s.vendor_section_names ?? null,
    added: s.created_at,
    // A serialized unit IS a WMS device (device id == stock-item id) — its row
    // opens the device page. Bulk rows aren't devices.
    isDevice: !!s.serial_number,
  }));
  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "variant") {
      return {
        display: (
          <Typography variant="body-strong" className="min-w-0 truncate">
            {String(value)}
          </Typography>
        ),
      };
    }
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
      const cond = conditionMeta[String(value)] ?? {
        label: String(value) || "—",
        variant: "info" as const,
      };
      return {
        display: <StatusBadge variant={cond.variant}>{cond.label}</StatusBadge>,
      };
    }
    if (key === "serialQty") {
      return { display: <Typography variant="helper" tone="inherit" className="font-mono">{String(value)}</Typography> };
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
            <span className="text-muted-foreground">—</span>
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
      // The label can grow long ("In Repair · Section A, Section B …"), so cap
      // the pill to the cell and ellipsize INSIDE it — the badge is an
      // inline-flex box, so the td's own `truncate` can't ellipsize it and it
      // was being clipped with a hard edge. `max-w-full min-w-0` on the pill +
      // `truncate` on the text keeps the pill shape + dot; `title` reveals the
      // full label on hover (the td shows no tooltip here — `value` is the short
      // status, so there's no double-tooltip).
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
  const filtersActive =
    search.trim().length > 0 || status !== "all" || condition !== "all";

  return (
    <BusinessMetricsTable
      showIndex
      searchable
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={SI.searchPlaceholder}
      tabs={[{ id: "inventory", label: SI.tableAriaLabel, columns, data: rows }]}
      activeTab="inventory"
      cellFormatter={cellFormatter}
      onRowClick={(row) => {
        if (row.isDevice) navigate(`/wms/devices/${String(row.id)}`);
      }}
      // The empty-state "Clear Filters" button: reset search + status +
      // condition in ONE URL write (parent-owned). Calling the individual
      // setters here raced — each read the same stale URL, so only the last
      // survived and Status stayed applied.
      onClearFilters={onClearFilters}
      toolbarFilters={[
        {
          key: "status",
          label: SI.statusFilter.label,
          // `value` stays populated so "clear filters" detects an active status;
          // `render` owns the actual control (a searchable AsyncSelect), so the
          // static `options` list is ignored.
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
              placeholder={SI.statusFilter.all}
              allOption={SI.statusFilter.all}
              searchPlaceholder={SI.statusFilter.searchPlaceholder}
              searchable
              clearable
              chevron="down"
              className="h-9 w-[190px]"
            />
          ),
        },
        {
          key: "condition",
          label: SI.conditionFilter.label,
          value: condition === "all" ? "" : condition,
          options: [],
          render: () => (
            <AsyncSelect
              value={
                condition === "all"
                  ? null
                  : {
                      id: condition,
                      label:
                        SI.conditionFilter.options[
                          condition as keyof typeof SI.conditionFilter.options
                        ] ?? condition,
                    }
              }
              onValueChange={(next) => onConditionChange(next?.id ?? "all")}
              useOptions={useConditionFilterOptions}
              toLabel={(o) => o.name}
              placeholder={SI.conditionFilter.all}
              allOption={SI.conditionFilter.all}
              searchPlaceholder={SI.conditionFilter.searchPlaceholder}
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
        isFetching,
        onPageChange,
        onPageSizeChange,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
      }}
      emptyState={{
        title: filtersActive ? SI.noFilterMatch : SI.noStockYet,
        description: SI.noMatchHelper,
      }}
    />
  );
}
