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
import {
  dealValueToNumber,
  type DealListItem,
  type DealStage,
} from "../../api"
import { DEAL_STAGE_VARIANT, isClosedStage, priorityVariant } from "../../lib/stage-styles"
import { dealStageLabel } from "../../constants/deal-stages"
import { accountLabel } from "../../hooks/deals/useDealsBoard"
import { sourceLabel } from "../leads/leadForm.constants"
import { DEALS_STRINGS } from "./deals.strings"

interface DealsListViewProps {
  rows: DealListItem[]
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

export function DealsListView({
  rows,
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
  onPageSizeChange,
  canWrite,
  onOpen,
  onCreate,
}: DealsListViewProps) {
  const listTab: TabConfig = useMemo(
    () => ({
      id: "deals",
      label: DEALS_STRINGS.list.tabLabel,
      columns: [
        { key: "dealNumber", label: DEALS_STRINGS.list.columns.dealNumber },
        { key: "company", label: DEALS_STRINGS.list.columns.company },
        { key: "closureDate", label: DEALS_STRINGS.list.columns.closureDate, align: "right" },
        { key: "createdAt", label: DEALS_STRINGS.list.columns.createdAt },
        { key: "value", label: DEALS_STRINGS.list.columns.value, align: "right" },
        { key: "latestQuoteValue", label: DEALS_STRINGS.list.columns.latestQuoteValue, align: "right" },
        { key: "requirement", label: DEALS_STRINGS.list.columns.requirement },
        { key: "assignedTo", label: DEALS_STRINGS.list.columns.assignedTo },
        { key: "stage", label: DEALS_STRINGS.list.columns.stage, filterable: true },
        { key: "contactName", label: DEALS_STRINGS.list.columns.contactName },
        { key: "phone", label: DEALS_STRINGS.list.columns.phone },
        { key: "email", label: DEALS_STRINGS.list.columns.email },
        { key: "categories", label: DEALS_STRINGS.list.columns.categories },
        { key: "oems", label: DEALS_STRINGS.list.columns.oems },
        { key: "priority", label: DEALS_STRINGS.list.columns.priority, filterable: true },
        { key: "type", label: DEALS_STRINGS.list.columns.type },
        { key: "tags", label: DEALS_STRINGS.list.columns.tags },
        // { key: "designation", label: DEALS_STRINGS.list.columns.designation },
        // { key: "source", label: DEALS_STRINGS.list.columns.source },
        // { key: "location", label: DEALS_STRINGS.list.columns.location, sortable: true, filterable: true },
        // { key: "title", label: DEALS_STRINGS.list.columns.title, sortable: true },
        // { key: "value", label: DEALS_STRINGS.list.columns.value, sortable: true, align: "right" },
      ],
      data: rows.map((d) => {
        // Backend embeds resolved `{id, name}` category refs on each list
        // row — use them directly. Fall back to `category_ids` only if a
        // legacy payload arrives without the resolved field.
        const categoryNames =
          (d.categories?.length ?? 0) > 0
            ? d.categories.map((c) => c.name)
            : (d.category_ids ?? [])
        return {
          id: d.id,
          dealNumber: d.deal_number ?? "—",
          company: accountLabel(d),
          contactName: d.contact_details?.name ?? "—",
          phone: d.contact_details?.phone ?? "—",
          email: d.contact_details?.email ?? "—",
          createdAt: d.created_at ?? "",
          designation: d.contact_details?.designation ?? "—",
          title: d.title,
          closureDate: d.estimated_closure_date ?? "",
          source: d.source ? sourceLabel(d.source) : "—",
          location: d.location?.toUpperCase() ?? "—",
          categories: categoryNames.join(", "),
          categoryList: categoryNames,
          oemList: (d.oems ?? []).map((o) => o.name),
          requirement: stripHtml(d.requirement) || "—",
          stage: d.stage,
          priority: d.priority,
          // Zero amount → "₹0" (symbol kept, no decimals) rather than "₹0.00".
          value: dealValueToNumber(d.value)
            ? formatINRCompact(dealValueToNumber(d.value), { decimals: true })
            : formatINRCompact(0),
          latestQuoteValue: dealValueToNumber(d.latest_quote_value)
            ? formatINRCompact(dealValueToNumber(d.latest_quote_value), { decimals: true })
            : formatINRCompact(0),
          type: d.channel_type ?? "—",
          tags: d.tags ?? [],
          assignedTo: d.assigned_to ? [d.assigned_to.name] : [],
        }
      }),
    }),
    [rows],
  )

  const TRUNCATE_KEYS: Record<string, number> = {
    company: 200,
    title: 220,
    requirement: 280,
  }

  const listCellFormatter: CellFormatter = (value, key, row) => {
    if (key === "closureDate") {
      // Once a deal is Closed Won / Closed Lost the closure countdown is moot.
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
      const variant = DEAL_STAGE_VARIANT[value as DealStage] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{dealStageLabel(value)}</StatusBadge> }
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
      const cats = Array.isArray(row.categoryList) ? row.categoryList : []
      return {
        display: (
          <OverflowPillList
            items={cats}
            getItemKey={(c) => String(c)}
            getItemLabel={(c) => String(c)}
            summaryLabel={DEALS_STRINGS.list.pills.categoriesSummary}
            hoverTitle={DEALS_STRINGS.list.pills.categoriesHover}
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
            summaryLabel={DEALS_STRINGS.list.pills.oemsSummary}
            hoverTitle={DEALS_STRINGS.list.pills.oemsHover}
          />
        ),
      }
    }

    if (key === "assignedTo" && Array.isArray(value)) {
      if (value.length === 0)
        return {
          display: <span className="text-muted-foreground">{DEALS_STRINGS.list.unassigned}</span>,
        }
      return {
        display: (
          <OverflowPillList
            items={value}
            getItemKey={(u) => String(u)}
            getItemLabel={(u) => String(u)}
            summaryLabel={DEALS_STRINGS.list.pills.ownerSummary}
            hoverTitle={DEALS_STRINGS.list.pills.ownerHover}
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
    return null
  }

  return (
    <CrmDataTable
      className="cpt-compact crm-premium-table"
      tabs={[listTab]}
      cellFormatter={listCellFormatter}
      pageSize={pageSize}
      searchable={false}
      persistKey="crm-deals"
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
        title: "No deals yet",
        description:
          "Create your first deal to start tracking opportunities through the pipeline.",
        action: canWrite
          ? {
              label: "Add Deal",
              onClick: onCreate,
            }
          : undefined,
      }}
    />
  )
}
