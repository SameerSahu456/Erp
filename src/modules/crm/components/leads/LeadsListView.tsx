import { useMemo } from "react"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { formatINRCompact } from "@/lib/currency"
import { formatClosureCountdown, formatIST_date } from "@shared/lib/date"
import { cn, stripHtml } from "@/lib/utils"
import { PAGINATION } from "@/shared/constants"

import { CellTooltip } from "../shared/CellTooltip"
import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import type { Lead } from "../../types"
import { LEAD_STAGE_VARIANT, isClosedStage, priorityVariant } from "../../lib/stage-styles"
import { leadStageLabel } from "../../constants/lead-stages"
import { sourceLabel } from "./leadForm.constants"
import { LEADS_STRINGS as S } from "./leads.strings"

interface LeadsListViewProps {
  leads: Lead[]
  page: number
  pageSize: number
  total: number
  isFetching: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  canWrite: boolean
  onOpen: (id: string) => void
  onCreate: () => void
}

export function LeadsListView({
  leads,
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
  onPageSizeChange,
  canWrite,
  onOpen,
  onCreate,
}: LeadsListViewProps) {
  const listTab: TabConfig = useMemo(
    () => ({
      id: "leads",
      label: S.list.tabLabel,
      columns: [
        { key: "leadNumber", label: S.list.columns.leadNumber, width: "150px" },
        { key: "company", label: S.list.columns.company, width: "200px" },
        { key: "closureDate", label: S.list.columns.closureDate, align: "right", width: "130px" },
        { key: "createdAt", label: S.list.columns.createdAt, width: "130px" },
        { key: "value", label: S.list.columns.value, align: "right", width: "130px" },
        { key: "latestQuoteValue", label: S.list.columns.latestQuoteValue, align: "right", width: "130px" },
        { key: "requirement", label: S.list.columns.requirement, width: "260px" },
        { key: "assignedTo", label: S.list.columns.assignedTo, filterable: true, width: "140px" },
        { key: "stage", label: S.list.columns.stage, filterable: true, width: "130px" },
        { key: "contactName", label: S.list.columns.contactName, width: "160px" },
        { key: "phone", label: S.list.columns.phone, width: "140px" },
        { key: "email", label: S.list.columns.email, width: "200px" },
        { key: "categories", label: S.list.columns.categories, filterable: true, width: "160px" },
        { key: "oems", label: S.list.columns.oems, width: "140px" },
        { key: "priority", label: S.list.columns.priority, filterable: true, width: "100px" },
        { key: "type", label: S.list.columns.type, filterable: true, width: "130px" },
        { key: "tags", label: S.list.columns.tags },
        // { key: "source", label: S.list.columns.source, sortable: true, filterable: true, width: "110px" },
        // { key: "location", label: S.list.columns.location, sortable: true, filterable: true, width: "120px" },
        // { key: "value", label: S.list.columns.value, sortable: true, align: "right" },
      ],
      data: leads.map((lead) => ({
        id: lead.id,
        leadNumber: lead.leadCode ?? "—",
        company: lead.company,
        contactName: lead.name,
        phone: lead.phone,
        createdAt: lead.createdAt ?? "",
        email: lead.email,
        source: sourceLabel(lead.source),
        location: lead.location?.toUpperCase() ?? "—",
        categories: lead.categories.join(", "),
        categoryList: lead.categories,
        oemList: lead.oems ?? [],
        tags: lead.tags ?? [],
        requirement: stripHtml(lead.description),
        stage: lead.stage,
        priority: lead.priority,
        type: lead.customerType ?? "—",
        assignedTo: lead.assignedTo ?? lead.owner,
        value:  lead.value?formatINRCompact(lead.value)
                    :formatINRCompact(0),
        closureDate: lead.closureDate ?? "",
        // No quote yet → show "₹0" (symbol kept, no decimals) rather than "₹0.00".
        latestQuoteValue: lead.latestQuoteValue
          ? formatINRCompact(lead.latestQuoteValue, { decimals: true })
          : formatINRCompact(0),
      })),
    }),
    [leads]
  )

  const TRUNCATE_KEYS: Record<string, number> = {
    email: 180,
    requirement: 240,
    company: 180,
    contactName: 140,
  }

  const listCellFormatter: CellFormatter = (value, key, row) => {
    if (key === "closureDate") {
      // Once a lead is Closed Won / Closed Lost the closure countdown is moot.
      if (isClosedStage(typeof row.stage === "string" ? row.stage : null)) {
        return { display: <span className="text-muted-foreground">—</span> }
      }
      const countdown = formatClosureCountdown(typeof value === "string" ? value : null)
      if (!countdown) {
        return { display: <span className="text-muted-foreground">—</span> }
      }
      return {
        display: (
          <span
            className={cn(
              "font-medium tabular-nums",
              countdown.isOverdue ? "text-destructive" : "text-success",
            )}
          >
            {countdown.text}
          </span>
        ),
      }
    }
    if (key === "createdAt") {
      const iso = typeof value === "string" ? value : ""
      if (!iso) return { display: <span className="text-muted-foreground">—</span> }
      return { display: <span className="tabular-nums">{formatIST_date(iso)}</span> }
    }
    if (key === "stage" && typeof value === "string") {
      return {
        display: (
          <StatusBadge variant={LEAD_STAGE_VARIANT[value as Lead["stage"]] ?? "neutral"}>
            {leadStageLabel(value)}
          </StatusBadge>
        ),
      }
    }

    if (key === "priority" && typeof value === "string") {
      return {
        display: (
          <Badge variant={priorityVariant(value)} className="text-[10px]">
            {value}
          </Badge>
        ),
      }
    }

    // Order Type is single-valued now — a plain pill, no overflow/hover list.
    if (key === "tags") {
      const tag = Array.isArray(value) ? value[0] : undefined
      if (!tag) return { display: <span className="text-muted-foreground">—</span> }
      return {
        display: (
          <Badge
            variant="secondary"
            className="h-5 max-w-[180px] justify-start rounded-md border border-border/60 bg-muted px-1 text-foreground shadow-none dark:border-white/10 dark:bg-white/10 dark:text-white/90"
          >
            <span className="min-w-0 truncate">{String(tag)}</span>
          </Badge>
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
            summaryLabel={S.list.categoriesPill.summaryLabel}
            hoverTitle={S.list.categoriesPill.hoverTitle}
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
            summaryLabel={S.list.oemsPill.summaryLabel}
            hoverTitle={S.list.oemsPill.hoverTitle}
          />
        ),
      }
    }

    const max = TRUNCATE_KEYS[key]
    if (max && typeof value === "string" && value) {
      return {
        display: (
          <CellTooltip
            text={value}
            className={cn("truncate", key === "company" && "uppercase")}
            style={{ maxWidth: max }}
          >
            {value}
          </CellTooltip>
        ),
      }
    }

    const stage = row["stage"]
    if (stage === "Closed Lost") {
      return { className: "text-destructive" }
    }
    if (stage === "Closed Won") {
      return { className: "text-status-success-text" }
    }
    return null
  }

  return (
    <CrmDataTable
      className="cpt-compact crm-premium-table"
      tabs={[listTab]}
      cellFormatter={listCellFormatter}
      pageSize={pageSize}
      searchable={false}
      persistKey="crm-leads"
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
        title: S.list.empty.title,
        description: S.list.empty.description,
        action: canWrite
          ? {
              label: S.list.empty.action,
              onClick: onCreate,
            }
          : undefined,
      }}
    />
  )
}
