import { useMemo } from "react"
import { Link } from "react-router-dom"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"
import { formatINRCompact } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"

import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import { CellTooltip } from "../shared/CellTooltip"
import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import type { MaterialInquiryStatus } from "../../api"
import {
  MATERIAL_INQUIRY_STATUS_LABELS,
  MATERIAL_INQUIRY_STATUS_VARIANT,
} from "../../constants/material-inquiry-status"
import { useMaterialInquiriesList } from "../../hooks/material-inquiries/useMaterialInquiriesList"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MaterialInquiriesTable({ list }: { list: ReturnType<typeof useMaterialInquiriesList> }) {
  const tab: TabConfig = useMemo(
    () => ({
      id: "material-inquiries",
      label: S.list.tabLabel,
      columns: [
        { key: "enquiry_number", label: S.list.columns.enquiryNumber },
        { key: "linked_to", label: S.list.columns.linkedTo },
        { key: "categories", label: S.list.columns.categories },
        { key: "items_count", label: S.list.columns.items, sortable: true, align: "right" },
        { key: "status", label: S.list.columns.status, sortable: true },
        { key: "requested_by", label: S.list.columns.requestedBy },
        { key: "created_at", label: S.list.columns.created, sortable: true },
        { key: "description", label: S.list.columns.description },
        { key: "client_budget", label: S.list.columns.budget, sortable: true, align: "right" },
      ],
      data: list.items.map((mi) => ({
        id: mi.id,
        enquiry_number: mi.enquiry_number,
        description: stripHtml(mi.description) || "—",
        status: mi.status,
        client_budget: mi.client_budget,
        linked_to: mi.lead_id
          ? S.list.linkedTo.lead
          : mi.deal_id
            ? S.list.linkedTo.deal
            : "—",
        // 2026-05-27 enrichment — defensive `?? []` / `?? 0` for the
        // window where the running backend hasn't shipped these fields.
        categories: mi.categories ?? [],
        items_count: mi.items_count ?? 0,
        requested_by: mi.created_by_user?.name ?? "—",
        created_at: mi.created_at,
      })),
    }),
    [list.items],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "enquiry_number" && typeof value === "string") {
      return {
        display: (
          <Link
            to={`/crm/material-inquiries/${row.id}`}
            className="text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === "status" && typeof value === "string") {
      const s = value as MaterialInquiryStatus
      return {
        display: (
          <StatusBadge variant={MATERIAL_INQUIRY_STATUS_VARIANT[s] ?? "neutral"}>
            {MATERIAL_INQUIRY_STATUS_LABELS[s] ?? value}
          </StatusBadge>
        ),
      }
    }
    if (key === "client_budget") {
      if (value == null || value === 0) {
        return { display: <Typography variant="helper">—</Typography> }
      }
      return { display: formatINRCompact(Number(value), { decimals: true }) }
    }
    if (key === "created_at" && typeof value === "string" && value) {
      return {
        display: (
          <span className="text-muted-foreground">{formatIST_date(value)}</span>
        ),
      }
    }
    if (key === "categories" && Array.isArray(value)) {
      const categories = value as { id: string; name: string }[]
      return {
        display: (
          <OverflowPillList
            items={categories}
            getItemKey={(c) => c.id}
            getItemLabel={(c) => c.name}
            summaryLabel={S.list.pills.categories}
            hoverTitle={S.list.pills.categoriesHover}
          />
        ),
      }
    }
    if (key === "items_count" && typeof value === "number") {
      if (value === 0) return { display: <Typography variant="helper">—</Typography> }
      return { display: <span className="tabular-nums">{value}</span> }
    }
    if (key === "description" && typeof value === "string") {
      if (value === "—") {
        return { display: <Typography variant="helper">—</Typography> }
      }
      // Truncate the (plain-text) description to a single line with an
      // ellipsis; the cell tooltip surfaces the full text on hover. Cap the
      // cell width too so a long inquiry doesn't stretch the whole column.
      return {
        className: "max-w-[260px]",
        display: (
          <CellTooltip text={value} className="max-w-[260px] truncate">
            {value}
          </CellTooltip>
        ),
      }
    }
    return null
  }

  return (
    <CrmDataTable
      className="cpt-compact crm-premium-table"
      tabs={[tab]}
      cellFormatter={cellFormatter}
      pageSize={list.pageSize}
      searchable
      searchValue={list.search}
      onSearchChange={list.setSearch}
      toolbarFilters={list.toolbarFilters}
      onToolbarFilterChange={list.handleToolbarFilterChange}
      onToolbarDateRangeChange={list.handleToolbarDateRangeChange}
      onClearFilters={list.handleClearFilters}
      persistKey="material-inquiries-v2"
      onRowClick={(row) => list.openMi(String(row.id))}
      serverPagination={{
        page: list.page,
        pageSize: list.pageSize,
        total: list.total,
        isFetching: list.isFetching,
        onPageChange: list.setPage,
        onPageSizeChange: list.setPageSize,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
      }}
      emptyNode={
        list.isError && !isValidationError(list.error) ? (
          <LoadErrorState error={list.error} fallback={S.list.loadError} />
        ) : list.isLoading ? (
          <Typography variant="body" tone="muted" align="center" asChild>
            <div className="px-4 py-12">{S.list.loading}</div>
          </Typography>
        ) : undefined
      }
      emptyState={{
        title: S.list.empty.title,
        description: S.list.empty.description,
        action: list.canWriteMi
          ? {
              label: S.list.empty.action,
              onClick: list.openMiNew,
            }
          : undefined,
      }}
    />
  )
}
