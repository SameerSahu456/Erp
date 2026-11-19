import { Link } from "react-router-dom"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { PAGINATION } from "@/shared/constants"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import type { Lead } from "../../types"
import { LEADS_STRINGS as S } from "./leads.strings"

const formatDate = (dateStr: string) => formatIST_date(dateStr)

interface RejectedLeadsTableProps {
  leads: Lead[]
  page: number
  pageSize: number
  total: number
  isFetching: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onOpen: (id: string) => void
}

export function RejectedLeadsTable({
  leads,
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
  onPageSizeChange,
  onOpen,
}: RejectedLeadsTableProps) {
  const tab: TabConfig = {
    id: "rejected",
    label: S.rejected.tabLabel,
    columns: [
      { key: "leadNumber", label: S.rejected.columns.leadNumber },
      { key: "name", label: S.rejected.columns.name, sortable: true },
      { key: "company", label: S.rejected.columns.company, sortable: true },
      { key: "owner", label: S.rejected.columns.owner, sortable: true },
      { key: "rejectionReason", label: S.rejected.columns.rejectionReason, sortable: false },
      { key: "rejectedBy", label: S.rejected.columns.rejectedBy, sortable: false },
      { key: "rejectedAt", label: S.rejected.columns.rejectedAt, sortable: true },
      { key: "value", label: S.rejected.columns.value, sortable: true, align: "right" },
      { key: "categories", label: S.rejected.columns.categories, sortable: false },
      { key: "oems", label: S.rejected.columns.oems, sortable: false },
    ],
    data: leads.map((l) => ({
      id: l.id,
      leadNumber: l.leadCode ?? "—",
      name: l.name,
      company: l.company,
      owner: l.owner,
      rejectionReason: l.rejectionReason ?? "",
      rejectedBy: l.rejectedBy ?? "—",
      rejectedAt: l.rejectedAt ?? "",
      value: l.value,
      categories: l.categories.join(", "),
      categoryList: l.categories,
      oemList: l.oems ?? [],
    })),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "name" && typeof value === "string") {
      return {
        display: (
          <Link
            to={`/crm/leads/${row["id"]}?from=rejected`}
            className="text-primary hover:underline font-medium"
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === "value" && typeof value === "number") {
      return { display: formatINRCompact(value, { decimals: true }) }
    }
    if (key === "rejectedAt" && typeof value === "string" && value) {
      return { display: formatDate(value) }
    }
    if (key === "rejectionReason" && typeof value === "string") {
      return {
        display: (
          <span className="text-sm text-muted-foreground line-clamp-2 break-words">{value}</span>
        ),
      }
    }
    if (key === "categories") {
      const categories = Array.isArray(row.categoryList) ? row.categoryList : []
      return {
        display: (
          <OverflowPillList
            items={categories}
            getItemKey={(category) => String(category)}
            getItemLabel={(category) => String(category)}
            summaryLabel={S.rejected.categoriesPill.summaryLabel}
            hoverTitle={S.rejected.categoriesPill.hoverTitle}
          />
        ),
      }
    }
    if (key === "oems") {
      const oems = Array.isArray(row.oemList) ? row.oemList : []
      return {
        display: (
          <OverflowPillList
            items={oems}
            getItemKey={(oem) => String(oem)}
            getItemLabel={(oem) => String(oem)}
            summaryLabel={S.rejected.oemsPill.summaryLabel}
            hoverTitle={S.rejected.oemsPill.hoverTitle}
          />
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
      pageSize={pageSize}
      searchable={false}
      persistKey="crm-rejected-leads"
      onRowClick={(row) => onOpen(String(row.id))}
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
        title: S.rejected.empty.title,
        description: S.rejected.empty.description,
      }}
    />
  )
}
