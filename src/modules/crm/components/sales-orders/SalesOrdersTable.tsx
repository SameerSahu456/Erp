import { useMemo } from "react"
import { Link } from "react-router-dom"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import { CellTooltip } from "../shared/CellTooltip"
import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { CrmFilterAside } from "../shared/CrmFilterAside"
import { CrmClearAllButton } from "../shared/CrmClearAllButton"
import { CrmFiltersButton } from "../shared/CrmFiltersButton"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { AsyncUserMultiSelect } from "../shared/AsyncUserMultiSelect"
import { AsyncAccountMultiSelect } from "../shared/AsyncAccountMultiSelect"
import type { SalesOrdersListController } from "../../hooks/sales-orders/useSalesOrdersList"
import type { SOOrderableType, SOStatus } from "../../api"
import {
  SO_ORDERABLE_LABELS,
  SO_STATUS_LABELS,
  SO_STATUS_VARIANT,
} from "../../constants/so-status"
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings"

const columns = [
  { key: "orderNumber", label: S.list.columns.orderNumber, sortable: true },
  { key: "version", label: S.list.columns.version, align: "center" as const },
  {
    key: "accountName",
    label: S.list.columns.account,
    truncate: true,
    width: "220px",
  },
  { key: "channelType", label: S.list.columns.channelType, truncate: true, width: "140px" },
  // Created/Submitted "who" pair sits together beside the account, so the row
  // leads with ownership before the commercial figures. Created before
  // Submitted — the order the events actually happen in. Both read straight
  // off the list response's `*_by_detail` — no user lookup.
  { key: "createdBy", label: S.list.columns.createdBy, truncate: true, width: "160px" },
  { key: "submittedBy", label: S.list.columns.submittedBy, truncate: true, width: "160px" },
  { key: "approvedBy", label: S.list.columns.approvedBy, width: "180px" },
  { key: "itemsCount", label: S.list.columns.items, align: "right" as const },
  { key: "grandTotal", label: S.list.columns.total, sortable: true, align: "right" as const },
  { key: "status", label: S.list.columns.status, sortable: true },
  { key: "createdAt", label: S.list.columns.created, sortable: true },
  { key: "submittedAt", label: S.list.columns.submitted, sortable: true },
]

function formatDate(value: string | null): string {
  if (!value) return "—"
  return formatIST_date(value)
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "approvedBy") {
    // Every user who approved any line (distinct); "—" when no line is approved.
    const users = (row["approvedByUsers"] as { id: string; name: string | null }[] | undefined) ?? []
    return {
      display: (
        <OverflowPillList
          items={users}
          getItemKey={(u) => u.id}
          getItemLabel={(u) => u.name ?? "—"}
          summaryLabel={S.list.approvedByPill.summaryLabel}
          hoverTitle={S.list.approvedByPill.hoverTitle}
        />
      ),
    }
  }
  if (key === "orderNumber" && typeof value === "string") {
    // Order # → SO detail page. `stopPropagation` keeps the row
    // onRowClick (also SO detail) from firing again and double-pushing
    // the same route into history (back would need two clicks).
    return {
      display: (
        <span className="flex items-center gap-1.5">
          <CellTooltip text={S.list.openSalesOrder} className="inline-block">
            <Link
              to={`/crm/sales-orders/${row["id"]}`}
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline font-medium"
            >
              {value}
            </Link>
          </CellTooltip>
          {row["fromDemo"] ? (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {S.list.demoBadge}
            </Badge>
          ) : null}
          {row["isCharge"] ? (
            <Badge variant="warning" className="h-4 px-1 text-[10px]">
              {S.list.chargeBadge}
            </Badge>
          ) : null}
          {row["isRental"] ? (
            <Badge variant="info" className="h-4 px-1 text-[10px]">
              {S.list.rentalBadge}
            </Badge>
          ) : null}
        </span>
      ),
    }
  }
  if (key === "version") {
    return {
      display: (
        <Badge variant="outline" className="text-xs tabular-nums">
          v{String(value)}
        </Badge>
      ),
    }
  }
  if (key === "orderable" && typeof value === "string") {
    // "For" column → source lead/deal/account detail. Same propagation
    // guard so a single click opens the source and back returns here
    // in one press.
    const oType = row["orderableType"] as SOOrderableType | undefined
    const oId = row["orderableId"] as string | undefined
    if (oType && oId) {
      const href = `/crm/${oType}s/${oId}`
      return {
        display: (
          <CellTooltip
            text={S.list.openOrderable(SO_ORDERABLE_LABELS[oType])}
            className="inline-block"
          >
            <Link
              to={href}
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline font-medium"
            >
              {value}
            </Link>
          </CellTooltip>
        ),
      }
    }
    return { display: value }
  }
  if (key === "status" && typeof value === "string") {
    const variant = SO_STATUS_VARIANT[value as SOStatus] ?? "neutral"
    return {
      display: (
        <StatusBadge variant={variant}>
          {SO_STATUS_LABELS[value as SOStatus] ?? value}
        </StatusBadge>
      ),
    }
  }
  if (key === "labels" && Array.isArray(value)) {
    const labels = value as string[]
    if (labels.length === 0) return { display: <span className="text-muted-foreground">—</span> }
    return {
      display: (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <Badge key={l} variant="secondary" className="text-[10px]">
              {l}
            </Badge>
          ))}
        </div>
      ),
    }
  }
  if (key === "grandTotal" && typeof value === "number") {
    return {
      display: (
        <span className="font-medium tabular-nums">{formatINR(value)}</span>
      ),
    }
  }
  if (key === "itemsCount" && typeof value === "number") {
    if (value === 0) return { display: <span className="text-muted-foreground">—</span> }
    return { display: <span className="tabular-nums">{value}</span> }
  }
  if (key === "channelType") {
    if (typeof value !== "string" || !value || value === "—") {
      return { display: <span className="text-muted-foreground">—</span> }
    }
    return null
  }
  if (key === "accountName") {
    if (typeof value !== "string" || !value || value === "—") {
      return { display: <span className="text-muted-foreground">—</span> }
    }
    // Plain text (styled via className) so the grid's hover tooltip shows the
    // full name — a custom node would suppress it (renderCellContent).
    return { className: "font-medium" }
  }
  if (key === "submittedAt" || key === "createdAt") {
    return { display: formatDate(value as string | null) }
  }
  return null
}

export function SalesOrdersTable({ list }: { list: SalesOrdersListController }) {
  // Single static tab — status is a select in the filter aside (see
  // `list.asideSelects`), mirroring the Quotes table, instead of the old
  // per-status `cpt-tabs` strip.
  const salesOrdersTab: TabConfig = useMemo(
    () => ({
      id: "sales-orders",
      label: S.list.tabLabel,
      columns,
      data: list.rows,
    }),
    [list.rows],
  )

  return (
    <div className="flex">
      <CrmFilterAside
        open={list.filtersOpen}
        activeFilterCount={list.activeFilterCount}
        onClose={() => list.setFiltersOpen(false)}
      >
        <CrmListFilterPanel
          selects={list.asideSelects}
          createdByFirst
          createdBy={{
            label: S.list.columns.createdBy,
            value: list.selectedCreatedBy,
            onChange: list.setSelectedCreatedBy,
          }}
          userMultiSelects={list.asideUserMultiSelects}
          enumMultiSelects={list.asideEnumMultiSelects}
          dateRanges={list.asideDateRanges}
          categoryOem={{
            categories: list.selectedCategories,
            onCategoriesChange: list.setSelectedCategories,
            oems: list.selectedOems,
            onOemsChange: list.setSelectedOems,
          }}
          valueRange={{
            label: S.list.columns.total,
            value: list.totalRange,
            onChange: list.setTotalRange,
          }}
          activeFilterCount={list.activeFilterCount}
          onResetAll={list.resetAsideFilters}
        />
      </CrmFilterAside>
      <div className="min-w-0 flex-1">
        <CrmDataTable
          className="cpt-compact crm-premium-table crm-toolbar-wrap"
          toolbarLayout="inline"
          tabs={[salesOrdersTab]}
          searchable
          searchValue={list.rawSearch}
          onSearchChange={list.handleSearchChange}
          toolbarFilters={list.toolbarFilters}
          onToolbarFilterChange={list.handleToolbarFilterChange}
          onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
          onClearFilters={list.clearFilters}
          extraFilters={
            // All inline chips are sized to match the toolbar's static filter
            // selects (size="sm" → h-8 rounded-[5px] no shadow), and share one
            // fixed width so a long "Submitted By (12)" trigger doesn't push
            // the row out of alignment. Order (left → right): Submitted By →
            // Account → Approved By. "Approved By" sits last so it lands
            // immediately before the Created Date chip, matching the design.
            <>
              <div className="w-[170px]">
                <AsyncAccountMultiSelect
                  value={list.selectedAccounts}
                  onValueChange={list.setSelectedAccounts}
                  label={S.list.columns.account}
                  placeholder={S.list.columns.account}
                  className="h-8 rounded-[5px] shadow-none"
                />
              </div>
              <div className="w-[170px]">
                <AsyncUserMultiSelect
                  value={list.selectedApprovers}
                  onValueChange={list.setSelectedApprovers}
                  label={S.list.filters.approverLabel}
                  placeholder={S.list.filters.approverLabel}
                  className="h-8 rounded-[5px] shadow-none"
                />
              </div>
            </>
          }
          // Filters button + Created Date chip sit right beside the search box.
          dateRangePlacement="start"
          // Filters-aside toggle sits right beside the search box (leadingFilters).
          leadingFilters={
            <>
              <CrmFiltersButton
                compact
                open={list.filtersOpen}
                onToggle={() => list.setFiltersOpen((v) => !v)}
                activeFilterCount={list.activeFilterCount}
              />
              <div className="w-[170px]">
                <AsyncUserMultiSelect
                  value={list.selectedSubmittedBy}
                  onValueChange={list.setSelectedSubmittedBy}
                  label={S.list.columns.submittedBy}
                  placeholder={S.list.columns.submittedBy}
                  className="h-8 rounded-[5px] shadow-none"
                />
              </div>
            </>
          }
          cellFormatter={cellFormatter}
          pageSize={list.pageSize}
          // Whole-row click opens the SO detail page; the Order # and "For"
          // column Links (which stopPropagation) override this for the
          // lead/deal/account source navigation.
          trailingFilters={
            list.activeFilterCount > 0 ? <CrmClearAllButton compact onClick={list.resetAsideFilters} /> : null
          }
          onRowClick={(row) => list.goToDetail(String(row.id))}
          serverPagination={{
            page: list.page,
            pageSize: list.pageSize,
            total: list.total,
            isFetching: list.isFetching,
            onPageChange: list.setPage,
            onPageSizeChange: list.setPageSize,
            pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
            sort: { column: list.sortColumn, direction: list.sortDirection },
            onSortChange: list.setSort,
          }}
          emptyNode={
            list.isError && !isValidationError(list.error) ? (
              <LoadErrorState error={list.error} fallback={S.list.error} />
            ) : list.isLoading && list.rows.length === 0 ? (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="px-4 py-12">{S.list.loading}</div>
              </Typography>
            ) : undefined
          }
          emptyState={
            list.hasActiveFilters
              ? {
                  title: S.list.emptyFiltered.title,
                  description: S.list.emptyFiltered.description,
                }
              : {
                  title: S.list.empty.title,
                  description: S.list.empty.description,
                  // No direct creation: a sales order is only reachable from its
                  // originating Lead or Deal (the header button is hidden in
                  // `SalesOrdersPage` too).
                }
          }
        />
      </div>
    </div>
  )
}
