import { useMemo } from "react";
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { useNavigate } from "react-router-dom";

import { recordLabelState } from "@shared/routing/record-label";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { StatsRow } from "@/components/common/display/StatsRow";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EntityRef } from "@/components/common/display/EntityRef";
import { AsyncSelect } from "@/components/ui/async-select";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { formatIST_date } from "@shared/lib/date";
import { formatINRCompact } from "@/lib/currency";
import { PAGINATION } from "@/shared/constants";

import { usePurchaseReturnsList } from "../../hooks/purchase-returns/usePurchaseReturnsList";
import type { PurchaseReturnStatus } from "../../api";
import {
  PURCHASE_RETURNS_LIST_STRINGS as S,
  PURCHASE_RETURN_STATUS_VARIANT,
  getPurchaseReturnStatusLabel,
} from "./purchase-returns.strings";
import type { PurchaseReturnTabId as TabId } from "./purchase-returns-list.columns";

// Depends on nothing in component scope, so it lives at module level.
const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "pret_number") {
    return {
      display: (
        <EntityRef
          kind="purchase_return"
          id={String(row.id)}
          value={String(value)}
          // Match the Sales Returns number column; truncate, never widen (§8.7).
          className="min-w-0 truncate font-semibold"
        >
          {String(value)}
        </EntityRef>
      ),
    };
  }
  if (key === "status") {
    const status = value as PurchaseReturnStatus;
    // Display-only: a decided-but-unshipped `raised` return reads "Pending
    // Dispatch"; the badge variant stays `raised`'s.
    return {
      display: (
        <StatusBadge variant={PURCHASE_RETURN_STATUS_VARIANT[status]}>
          {getPurchaseReturnStatusLabel(status, Number(row.undecided_count ?? 0))}
        </StatusBadge>
      ),
    };
  }
  if (key === "credit_pending") {
    return { display: formatINRCompact(Number(value ?? 0)) };
  }
  if (key === "created_at") {
    return { display: formatIST_date(String(value)) };
  }
  return null;
};

/** Purchase returns — server-paginated, status-tabbed list (§16.7). */
export function PurchaseReturnsBody() {
  const navigate = useNavigate();
  const l = usePurchaseReturnsList();
  const { lv, poId, vendorId, poValue, vendorValue, usePoOptions, useVendorFilterOptions } = l;

  const toolbarFilters = useMemo(
    () => [
      {
        key: "purchase_order_id",
        label: S.filters.po,
        allLabel: S.filters.allPos,
        // Keep `value` set so "clear filters" still detects the PO filter as
        // active; the AsyncSelect below owns the real value/change.
        value: poId ?? "",
        options: [],
        render: () => (
          <AsyncSelect
            value={poValue}
            onValueChange={(next) => lv.setFilters({ poId: next?.id })}
            useOptions={usePoOptions}
            toLabel={(o) => o.label}
            searchable
            clearable
            placeholder={S.filters.allPos}
            className="h-8 w-[185px] rounded-[5px] text-foreground"
          />
        ),
      },
      {
        key: "vendor_id",
        label: S.filters.vendor,
        allLabel: S.filters.allVendors,
        value: vendorId ?? "",
        options: [],
        render: () => (
          <AsyncSelect
            value={vendorValue}
            onValueChange={(next) => lv.setFilters({ vendorId: next?.id })}
            useOptions={useVendorFilterOptions}
            toLabel={(o) => o.label}
            searchable
            clearable
            placeholder={S.filters.allVendors}
            className="h-8 w-[185px] rounded-[5px] text-foreground"
          />
        ),
      },
    ],
    [poId, vendorId, poValue, vendorValue, usePoOptions, useVendorFilterOptions, lv],
  );

  return (
    <ListPageShell
      title={S.title}
      subtitle={S.subtitle}
      stats={<StatsRow stats={l.kpis} />}
      actions={
        l.canWrite ? (
          <Button onClick={() => navigate("/wms/purchase-returns/new")}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.newButton}
          </Button>
        ) : undefined
      }
    >
      {l.query.isError ? (
        <LoadErrorState error={l.query.error} fallback={S.error} />
      ) : (
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          searchable
          searchValue={l.search}
          searchPlaceholder={S.searchPlaceholder}
          onSearchChange={(q) => lv.setSearch(q)}
          tabs={l.tabs}
          activeTab={l.activeTab}
          onTabChange={(tabId) => lv.setActiveTab(tabId as TabId)}
          cellFormatter={cellFormatter}
          pageSize={l.pageSize}
          persistKey="wms-purchase-returns-v2"
          onRowClick={(row) =>
            navigate(`/wms/purchase-returns/${row.id}`, {
              state: recordLabelState(row.pret_number),
            })
          }
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(key, value) => {
            if (key === "purchase_order_id") lv.setFilters({ poId: value || undefined });
            if (key === "vendor_id") lv.setFilters({ vendorId: value || undefined });
          }}
          onClearFilters={() => lv.clearFilters()}
          dateRange={{
            value: l.dateRange,
            onChange: (r) => lv.setFilters({ dateRange: r }),
          }}
          serverPagination={{
            page: l.page,
            pageSize: l.pageSize,
            total: l.total,
            isFetching: l.query.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
            sort: { column: l.sortColumn, direction: l.sortDirection },
            onSortChange: (col, dir) => lv.setSort(col, dir),
          }}
          emptyNode={
            l.query.isLoading && l.items.length === 0 ? (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="px-4 py-12">{S.loading}</div>
              </Typography>
            ) : undefined
          }
          emptyState={{
            title: S.empty.title,
            description: S.empty.description,
            action: l.canWrite
              ? {
                  label: S.newButton,
                  onClick: () => navigate("/wms/purchase-returns/new"),
                }
              : undefined,
          }}
        />
      )}
    </ListPageShell>
  );
}
