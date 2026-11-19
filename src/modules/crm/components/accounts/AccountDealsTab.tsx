import { Link } from "react-router-dom"

import { useMemoryState } from "@/shared/hooks"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { formatIST, formatIST_date } from "@shared/lib/date"

import type { useAccountDetail } from "../../hooks/accounts/useAccountDetail"
import { DEAL_STAGE_VARIANT } from "../../lib/stage-styles"
import { CellTooltip, HeadTooltip } from "../shared/CellTooltip"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { EmbeddedEmptyRow } from "../shared/EmbeddedEmptyRow"
import { EmbeddedFilterLayout } from "../shared/EmbeddedFilterLayout"
import {
  EmbeddedDateRangeFilter,
  EmbeddedListToolbar,
} from "../shared/EmbeddedListToolbar"
import { DEAL_STAGE_LIST, type DealStage } from "../../api"
import { dealStageLabel } from "../../constants/deal-stages"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

type Detail = ReturnType<typeof useAccountDetail>

// Every stage a deal can be in — the labels come from the domain map.
const DEAL_STAGE_OPTIONS = DEAL_STAGE_LIST.map((stage) => ({
  value: stage,
  label: dealStageLabel(stage),
}))

// "Closed Date" is `closed_won_at` — the server stamps it when the deal is won.
// No fallback: a deal without it (open, or lost) shows "—", never the expected
// closure date or `closed_lost_at`.
function ClosedDateCell({ deal }: { deal: Detail["deals"][number] }) {
  if (!deal.closed_won_at) return <span className="text-muted-foreground">—</span>
  return (
    <CellTooltip text={S.deals.closedOnTip(formatIST(deal.closed_won_at))} className="truncate">
      {formatIST_date(deal.closed_won_at)}
    </CellTooltip>
  )
}

interface AccountDealsTabProps {
  /** Scopes the remembered sidebar state to this account. */
  accountId: string
  deals: Detail["deals"]
  /** Total deals across all pages (server count, not this page's length). */
  total: number
  /** Search + filter state of this tab. */
  filters: Detail["dealsFilters"]
  isLoading: boolean
  isFetching: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onOpenDeal: (id: string) => void
}

// Laid out like the Quotes tab (QuoteSection): one bordered box holding a
// table whose columns size to their content (it scrolls sideways inside the card when
// wider), with the numbered pagination footer below.
export function AccountDealsTab({
  accountId,
  deals,
  total,
  filters,
  isLoading,
  isFetching,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpenDeal,
}: AccountDealsTabProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // The sidebar starts closed (like the Accounts list) — an applied filter in the URL
  // doesn't force it open; it then stays as the user left it across detail round-trips.
  const [filtersOpen, setFiltersOpen] = useMemoryState(`crm:tab:deals:${accountId}:open`, false)
  return (
    <EmbeddedFilterLayout
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      activeFilterCount={filters.asideActiveCount}
      aside={
        <CrmListFilterPanel
          selects={[
            {
              key: "stage",
              label: S.deals.filters.stage,
              allLabel: S.deals.filters.allStages,
              value: filters.stage,
              options: DEAL_STAGE_OPTIONS,
              onChange: (next) => filters.setStage(next as DealStage | ""),
            },
          ]}
          userMultiSelects={[
            {
              key: "owner",
              label: S.deals.filters.accountOwner,
              value: filters.owners,
              onChange: filters.setOwners,
            },
          ]}
          categoryOem={{
            categories: filters.categories,
            onCategoriesChange: filters.setCategories,
            oems: filters.oems,
            onOemsChange: filters.setOems,
          }}
          activeFilterCount={filters.asideActiveCount}
          onResetAll={filters.resetAside}
        />
      }
    >
      {/* Search + filters (shared with the Quotes / Sales Orders tabs). Always shown — an empty tab keeps its filters and shows the empty state below. */}
      {(
        <EmbeddedListToolbar
          search={filters.search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={S.deals.filters.searchPlaceholder}
          asideOpen={filtersOpen}
          onToggleAside={() => setFiltersOpen((v) => !v)}
          asideActiveCount={filters.asideActiveCount}
          onClearAside={filters.resetAside}
        >
          <EmbeddedDateRangeFilter
            label={S.deals.filters.createdOn}
            value={filters.createdOn}
            onChange={filters.setCreatedOn}
          />
          <EmbeddedDateRangeFilter
            label={S.deals.filters.closedDate}
            value={filters.closedOn}
            onChange={filters.setClosedOn}
          />
        </EmbeddedListToolbar>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      )}

      {!isLoading && (
        <div>
          <Table className="min-w-full whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead><HeadTooltip label={S.deals.dealNumber} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.stage} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.dealName} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.accountOwner} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.createdOn} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.closedDate} /></TableHead>
                <TableHead><HeadTooltip label={S.deals.categories} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <EmbeddedEmptyRow
                  colSpan={7}
                  filtered={filters.hasActive}
                  emptyTitle={S.deals.empty}
                  onClearFilters={filters.clearAll}
                />
              ) : deals.map((deal) => (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer"
                  onClick={() => onOpenDeal(deal.id)}
                >
                  <TableCell>
                    {deal.deal_number ? (
                      <CellTooltip text={deal.deal_number} className="truncate">
                        <Link
                          to={`/crm/deals/${deal.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {deal.deal_number}
                        </Link>
                      </CellTooltip>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={DEAL_STAGE_VARIANT[deal.stage] ?? "neutral"}
                      className="max-w-full"
                    >
                      <CellTooltip text={deal.stage} className="truncate">
                        {deal.stage}
                      </CellTooltip>
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <CellTooltip text={deal.title} className="truncate">
                      {deal.title}
                    </CellTooltip>
                  </TableCell>
                  {/* The deal's assignee — the Deals list calls this "Account Owner". */}
                  <TableCell>
                    {deal.assigned_to?.name ? (
                      <CellTooltip text={deal.assigned_to.name} className="truncate">
                        {deal.assigned_to.name}
                      </CellTooltip>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <CellTooltip text={formatIST(deal.created_at)} className="truncate">
                      {formatIST_date(deal.created_at)}
                    </CellTooltip>
                  </TableCell>
                  <TableCell>
                    <ClosedDateCell deal={deal} />
                  </TableCell>
                  <TableCell>
                    <OverflowPillList
                      items={deal.categories.map((c) => c.name)}
                      getItemKey={(name) => name}
                      getItemLabel={(name) => name}
                      summaryLabel={S.deals.categoriesPill.summaryLabel}
                      hoverTitle={S.deals.categoriesPill.hoverTitle}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          )}
        </div>
      )}
    </EmbeddedFilterLayout>
  )
}
