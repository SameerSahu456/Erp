import { useMemo } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { CrmFilterAside } from "../shared/CrmFilterAside"
import { CrmClearAllButton } from "../shared/CrmClearAllButton"
import { CrmFiltersButton } from "../shared/CrmFiltersButton"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { AsyncAccountMultiSelect } from "../shared/AsyncAccountMultiSelect"
import { EnumMultiSelect } from "../shared/EnumMultiSelect"
import type { CrmIdNameRef, QuotableType, QuoteStatus } from "../../api"
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_VARIANT } from "../../constants/quote-status"
import { useQuotesList } from "../../hooks/quotes/useQuotesList"
import { QuoteRowActions } from "./QuoteRowActions"
import { QUOTES_STRINGS as S } from "./quotes.strings"

const QUOTABLE_ROUTE: Record<QuotableType, string> = {
  account: "/crm/accounts",
  deal: "/crm/deals",
  lead: "/crm/leads",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return formatIST_date(value)
}

export function QuotesTable({ list }: { list: ReturnType<typeof useQuotesList> }) {
  const columns = useMemo(
    () => [
      { key: "quoteNumber", label: S.list.columns.quoteNumber, sortable: true },
      { key: "accountName", label: S.list.columns.account },
      { key: "createdBy", label: S.list.columns.createdBy, width: "160px" },
      { key: "approvedBy", label: S.list.columns.approvedBy, width: "180px" },
      { key: "quotable", label: S.list.columns.for },
      { key: "vertical", label: S.list.columns.vertical },
      { key: "items", label: S.list.columns.items, align: "center" as const },
      { key: "total", label: S.list.columns.total, sortable: true, align: "right" as const },
      { key: "status", label: S.list.columns.status, sortable: true },
      { key: "version", label: S.list.columns.version, align: "center" as const },
      { key: "validUntil", label: S.list.columns.validUntil, sortable: true },
      { key: "createdAt", label: S.list.columns.created, sortable: true },
      { key: "actions", label: "", align: "center" as const },
    ],
    [],
  )

  const quotesTab: TabConfig = useMemo(
    () => ({
      id: "quotes",
      label: S.list.tabLabel,
      columns,
      data: list.rows,
    }),
    [columns, list.rows],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "quoteNumber" && typeof value === "string") {
      return {
        display: (
          <Link
            to={`/crm/quotes/${row["id"]}`}
            className="text-primary hover:underline font-medium"
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === "approvedBy") {
      const users = (row["approvedByUsers"] as CrmIdNameRef[] | undefined) ?? []
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
    if (key === "quotable" && typeof value === "string") {
      const qType = row["quotableType"] as QuotableType
      const qId = row["_quotableId"] as string
      const target = `${QUOTABLE_ROUTE[qType]}/${qId}`
      return {
        display: (
          <Link
            to={target}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === "vertical") {
      if (typeof value !== "string" || !value) {
        return { display: <span className="text-muted-foreground">—</span> }
      }
      return {
        display: (
          <Badge variant="secondary" className="text-xs">
            {value}
          </Badge>
        ),
      }
    }
    if (key === "accountName") {
      if (typeof value !== "string" || !value) {
        return { display: <span className="text-muted-foreground">—</span> }
      }
      // Plain text (styled via className) so the grid's hover tooltip shows the
      // full name — a custom node would suppress it (renderCellContent).
      return { className: "font-medium" }
    }
    if (key === "items" && typeof value === "number") {
      if (value === 0) return { display: <span className="text-muted-foreground">—</span> }
      return { display: <span className="tabular-nums">{value}</span> }
    }
    if (key === "total" && typeof value === "number") {
      return {
        display: (
          <span className="font-semibold tabular-nums">
            {formatINRCompact(value, { decimals: true })}
          </span>
        ),
      }
    }
    if (key === "status" && typeof value === "string") {
      const status = value as QuoteStatus
      const variant = QUOTE_STATUS_VARIANT[status] ?? "neutral"
      return {
        display: (
          <StatusBadge variant={variant}>
            {QUOTE_STATUS_LABELS[status] ?? value}
          </StatusBadge>
        ),
      }
    }
    if (key === "version") {
      return {
        display: (
          <Badge variant="outline" className="text-xs">
            {S.versionPrefix}{String(value)}
          </Badge>
        ),
      }
    }
    if (key === "validUntil") {
      const v = value as string | null
      const expired = !!v && new Date(v) < new Date()
      return {
        display: (
          <span className={expired ? "text-destructive" : ""}>{formatDate(v)}</span>
        ),
      }
    }
    if (key === "createdAt") {
      return { display: formatDate(value as string | null) }
    }
    if (key === "actions") {
      const quoteId = row["id"] as string
      const quoteNumber = row["quoteNumber"] as string
      const rowVersion = row["version"] as number
      const rowStatus = row["_status"] as QuoteStatus
      const rowIsLatest = row["_isLatest"] as boolean
      const rowViewOnly = row["_viewOnly"] as boolean
      const rowQuotableType = row["quotableType"] as QuotableType
      const rowQuotableId = row["_quotableId"] as string
      return {
        display: (
          <QuoteRowActions
            quoteId={quoteId}
            quoteNumber={quoteNumber}
            versionNumber={rowVersion}
            status={rowStatus}
            isLatest={rowIsLatest}
            onAmended={(newId) => list.openQuoteEdit(newId)}
            // Mention-only rows are read-only — PDF download stays.
            canAmend={list.canWriteQuote && !rowViewOnly}
            // Convert-to-SO needs SO write (destination gate) and a
            // non-mention-only row; QuoteRowActions itself limits it to
            // Approved quotes.
            onConvertToSO={
              list.canConvertToSo && !rowViewOnly
                ? () => list.convertQuoteToSO(quoteId, rowQuotableType, rowQuotableId)
                : undefined
            }
            versionMut={list.versionMut}
          />
        ),
      }
    }
    return null
  }

  return (
    <div className="flex">
      <CrmFilterAside
        open={list.filtersOpen}
        activeFilterCount={list.activeFilterCount}
        onClose={() => list.setFiltersOpen(false)}
      >
        <CrmListFilterPanel
          selects={list.asideSelects}
          createdBy={{
            label: S.list.columns.createdBy,
            value: list.selectedCreatedBy,
            onChange: list.setSelectedCreatedBy,
          }}
          userMultiSelects={[
            {
              key: "approvedBy",
              label: S.list.columns.approvedBy,
              value: list.selectedApprovedBy,
              onChange: list.setSelectedApprovedBy,
            },
          ]}
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
          tabs={[quotesTab]}
          cellFormatter={cellFormatter}
          pageSize={list.pageSize}
          searchable
          searchValue={list.search}
          onSearchChange={list.setSearch}
          toolbarFilters={list.toolbarFilters}
          onToolbarFilterChange={list.handleToolbarFilterChange}
          onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
          onClearFilters={list.handleClearFilters}
          extraFilters={
            // Sized to match the toolbar's static selects (h-8 rounded-[5px]).
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
                <EnumMultiSelect
                  label={S.list.filters.channelTypeLabel}
                  value={list.selectedChannelTypes}
                  options={list.channelTypeOptions}
                  onChange={list.setSelectedChannelTypes}
                  className="h-8 rounded-[5px] shadow-none"
                />
              </div>
            </>
          }
          // Filters button + Created Date chip sit right beside the search box
          // (same layout as Sales Orders).
          dateRangePlacement="start"
          leadingFilters={
            <CrmFiltersButton
              compact
              open={list.filtersOpen}
              onToggle={() => list.setFiltersOpen((v) => !v)}
              activeFilterCount={list.activeFilterCount}
            />
          }
          trailingFilters={
            list.activeFilterCount > 0 ? <CrmClearAllButton compact onClick={list.resetAsideFilters} /> : null
          }
          persistKey="crm-quotes"
          onRowClick={(row) => list.openQuote(String(row.id))}
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
              <LoadErrorState error={list.error} fallback={S.list.loadError} />
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
                  // No direct creation: a quote is only reachable from its
                  // originating Lead or Deal (the header button is hidden in
                  // `QuotesPage` too).
                }
          }
        />
      </div>
    </div>
  )
}
