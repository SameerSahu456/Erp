import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { NewAccountRow, NewAccountsParams } from "../../../../api/dashboard"
import { useNewAccounts } from "../../../../hooks/dashboard/useNewAccounts"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { Span } from "../InsightWidget"
import { InsightWidget } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.newAccounts

// New Accounts tile — `GET /crm/dashboard/new-accounts`.
//
// Headline: big count + signed `+N vs prev-window` delta badge + revenue
// contributed. Below: top-5 ranked rows (name on left; month-first-ordered
// + "₹X first · N ord" on the right).
//
// Scope is server-resolved. Out-of-scope `user_ids` → 403, routed through
// `LoadErrorState` so it reads as "no access" rather than "failed to load".
// Drill-through target (`/crm/insights/new-accounts`) is Phase 3 work;
// `detailHref` passes through so the tile is ready to link out the moment
// that view lands.

export function NewAccountsTile({
  params,
  span = 3,
  title,
  why,
  detailHref,
}: {
  params: NewAccountsParams
  span?: Span
  title?: string
  why?: string
  detailHref?: string
}) {
  const { data, isLoading, isError, error } = useNewAccounts(params)

  return (
    <InsightWidget span={span} title={title ?? S.title} why={why ?? S.why} detailHref={detailHref}>
      {isError ? (
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isLoading || !data ? (
        <InsightShimmer />
      ) : (
        <NewAccountsContent data={data} />
      )}
    </InsightWidget>
  )
}

function NewAccountsContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof useNewAccounts>["data"]>
}) {
  const { summary, current_window, previous_window, rows } = data

  // Signed badge: positive = more new buyers than last period (green), zero
  // = flat (muted), negative = fewer (red). Icon follows the sign so the
  // glyph and the colour agree.
  const deltaSign = summary.delta_count > 0 ? "+" : summary.delta_count < 0 ? "-" : ""
  const deltaToneClass =
    summary.delta_count > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : summary.delta_count < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"
  const DeltaIcon = summary.delta_count >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Top strip: large count on the left; signed delta badge + revenue
          sub-line on the right. */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Typography variant="kpi-value" tone="inherit" className="min-w-0">
            {summary.new_count_current}
          </Typography>
          <Typography variant="helper" tone="muted" className="min-w-0 uppercase tracking-wide">
            {S.captionNewIn(current_window.label)}
          </Typography>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Typography
            variant="helper"
            tone="inherit"
            className={`flex shrink-0 items-center gap-1 tabular-nums ${deltaToneClass}`}
          >
            <DeltaIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>
              {S.deltaBadge(deltaSign, Math.abs(summary.delta_count), previous_window.label)}
            </span>
          </Typography>
          <Typography variant="helper" tone="muted" className="min-w-0 tabular-nums">
            {S.revenueLine(formatINRShort(summary.total_revenue_current))}
          </Typography>
        </div>
      </div>

      {rows.length === 0 ? (
        <Typography variant="helper" tone="muted" asChild>
          <p className="py-3">{S.emptyState}</p>
        </Typography>
      ) : (
        <ul className="flex min-w-0 flex-col gap-1.5">
          {rows.map((row) => (
            <NewAccountRowView key={row.account_id} row={row} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NewAccountRowView({ row }: { row: NewAccountRow }) {
  // Rule B row (approved in the window, nothing ordered yet): the three
  // `first_order_*` fields are null together, so one check covers them.
  const subline =
    row.first_order_month == null || row.first_order_value == null
      ? S.noOrderYet
      : S.rowSubline(
          row.first_order_month,
          formatINRShort(row.first_order_value),
          row.order_count_in_window,
        )
  return (
    <li className="flex min-w-0 items-start gap-3">
      <Typography variant="table-cell" className="min-w-0 flex-1 truncate font-medium">
        {row.account_name}
      </Typography>
      <Typography
        variant="helper"
        tone="muted"
        className="shrink-0 text-right tabular-nums"
      >
        {subline}
      </Typography>
    </li>
  )
}
