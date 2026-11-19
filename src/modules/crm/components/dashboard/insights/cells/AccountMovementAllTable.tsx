import { TablePagination } from "@/components/common/tables/TablePagination"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { AccountMovementParams, AccountMovementRow } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useAccountMovement } from "../../../../hooks/dashboard/useAccountMovement"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.accountMovement

// All Accounts — Movement: the paginated table on the insights page.
//
// `GET /crm/dashboard/account-movement?movement=all&page=&page_size=` — the
// endpoint's DRILL-DOWN mode. Every classified account (growing + declining
// + new + lapsed + flat) sorted by `abs(delta)` DESC, one page at a time.
//
// This is its OWN request, unlike the tiles strip / bucket cards / mix donut,
// which all share the widget-mode response. The widget response only carries
// the top-N of each bucket, so the full list has to be fetched separately —
// and it is fetched one page at a time (§16.7), never auto-paged.
//
// The reference board's table, column for column:
//
//   ACCOUNT · TYPE · REP · <previous window> · <current window> · CHANGE · % · MOVEMENT
//
// No rank gutter — the reference numbers nothing here, the sort is already
// the story. Every column takes an equal share of the full-width card (the
// `InsightRankingTable` default), the two window columns are headed by the
// SERVER's labels once the first page lands, and the Movement class is a
// neutral outline pill — the reference does not colour it, and nor does the
// `%` cell: the sign carries the direction on its own.

/** Signed short currency — `+₹63.2L` / `-₹40L`. Same shape the tiles strip
 *  renders for the bucket deltas. */
function signedAmount(delta: number): string {
  return `${delta >= 0 ? "+" : "-"}${formatINRShort(Math.abs(delta))}`
}

/** `%` cell — the signed whole percentage (`+168%`, as on the reference).
 *  `new` / `lapsed` rows carry the backend's ±100 encoding and print as
 *  `+100%` / `-100%`; the Movement column already names the status. */
function pctText(row: AccountMovementRow): string {
  return `${row.delta_pct >= 0 ? "+" : ""}${row.delta_pct.toFixed(0)}%`
}

interface AccountMovementAllTableProps {
  /** Period / facet slice. `movement`, `page` and `page_size` are set here. */
  params: AccountMovementParams
  /** URL-backed page + page size — its own key, so paging this table never
   *  moves the breakdown tables below it. */
  paging: InsightPaging
  span?: Span
  title?: string
  why?: string
}

export function AccountMovementAllTable({
  params,
  paging,
  span = 6,
  title,
  why,
}: AccountMovementAllTableProps) {
  const { data, isLoading, isFetching, isError, error } = useAccountMovement({
    ...params,
    movement: "all",
    page: paging.page,
    page_size: paging.pageSize,
  })

  // Window labels head the two value columns. Until the first response lands
  // the generic words hold the header so it does not jump on load.
  const prevLabel = data?.previous_window.label ?? S.columnPrevious
  const curLabel = data?.current_window.label ?? S.columnCurrent

  // No widths: the reference splits the row evenly, which is exactly the
  // table's default (see `RankingCol.width`).
  const columns: RankingCol[] = [
    { key: "type", label: S.columnType },
    { key: "rep", label: S.columnRep },
    { key: "prev", label: prevLabel, align: "right" },
    { key: "cur", label: curLabel, align: "right" },
    { key: "delta", label: S.columnChange, align: "right" },
    { key: "pct", label: S.columnPct, align: "right" },
    { key: "movement", label: S.columnMovement },
  ]

  const rows: RankingRow[] = (data?.rows ?? []).map((r) => ({
    name: r.account_name,
    cells: {
      type: { text: r.account_type ?? S.noType },
      rep: { text: r.rep_name ?? S.noRep },
      prev: { text: formatINRShort(r.previous_value) },
      cur: { text: formatINRShort(r.current_value) },
      delta: { text: signedAmount(r.delta) },
      pct: { text: pctText(r) },
      movement: {
        text: S.statusLabel[r.status],
        node: <Badge variant="outline">{S.statusLabel[r.status]}</Badge>,
      },
    },
  }))

  return (
    <InsightRankingTable
      title={title ?? S.allTitle}
      why={why ?? S.whyAll}
      span={span}
      columns={columns}
      nameLabel={S.columnAccount}
      showRank={false}
      rows={rows}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // Out-of-scope `user_ids` is a 403 here — "no access", not
          // "failed to load".
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      footer={
        // Gated on `total > 0`, NOT on `page_count > 1`: the page-size
        // dropdown lives in the footer, so hiding it once everything fits one
        // page would strand the user at that size.
        data?.pagination && data.pagination.total > 0 ? (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={paging.page}
            pageSize={paging.pageSize}
            totalPages={data.pagination.page_count}
            total={data.pagination.total}
            isFetching={isFetching}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        ) : undefined
      }
    />
  )
}
