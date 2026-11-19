import { AlertTriangle } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type {
  InactiveAccountRow,
  InactiveAccountsParams,
  InactiveAccountsSummary,
} from "../../../../api/dashboard"
import { useInactiveAccounts } from "../../../../hooks/dashboard/useInactiveAccounts"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { Span } from "../InsightWidget"
import { InsightWidget } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.inactiveAccounts

// Inactive Accounts tile — `GET /crm/dashboard/inactive-accounts`.
//
// Headline: big count on the left + "OF N BUYERS · X%" caption below it;
// threshold label + revenue-at-risk sub-line on the right. Below: top-5
// longest-dormant rows (name left; "last May · 4 mo" right).
//
// Window follows the board's period: a preset is a rolling day window
// ending today; a custom range or month selection is the selected window
// itself. The window label and the row labels are server-formatted so the
// FE never recomputes date math.
//
// Scope + account-level facets (`type` / `user_ids` / `account_ids`) are
// wired through `toInactiveAccountsParams`; product facets do not apply.

export function InactiveAccountsTile({
  params,
  span = 3,
  title,
  why,
  detailHref,
}: {
  params: InactiveAccountsParams
  span?: Span
  title?: string
  why?: string
  detailHref?: string
}) {
  const { data, isLoading, isError, error } = useInactiveAccounts(params)

  return (
    <InsightWidget span={span} title={title ?? S.title} why={why ?? S.why} detailHref={detailHref}>
      {isError ? (
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isLoading || !data ? (
        <InsightShimmer />
      ) : (
        <InactiveAccountsContent data={data} />
      )}
    </InsightWidget>
  )
}

function InactiveAccountsContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof useInactiveAccounts>["data"]>
}) {
  const { summary, current_window, rows } = data

  // Risk tone: visible warning when any buyers are inactive; muted when none.
  const hasInactive = summary.inactive_count > 0
  const toneClass = hasInactive
    ? "text-destructive"
    : "text-muted-foreground"
  const headerToneClass = hasInactive
    ? "text-destructive"
    : "text-foreground"

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Top strip: large count + "OF N BUYERS · X%" on the left; threshold
          + revenue-at-risk on the right. */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Typography variant="kpi-value" tone="inherit" className={`min-w-0 ${headerToneClass}`}>
            {summary.inactive_count}
          </Typography>
          <Typography variant="helper" tone="muted" className="min-w-0 uppercase tracking-wide">
            {S.captionOfBuyers(summary.total_buyers, summary.inactive_pct)}
          </Typography>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Typography
            variant="helper"
            tone="inherit"
            className={`flex shrink-0 items-center gap-1 tabular-nums ${toneClass}`}
          >
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{S.windowLine(current_window.label)}</span>
          </Typography>
          <Typography variant="helper" tone="muted" className="min-w-0 tabular-nums">
            {S.revenueAtRiskLine(formatINRShort(summary.total_revenue_at_risk))}
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
            <InactiveAccountRowView key={row.account_id} row={row} unit={summary.idle_unit} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InactiveAccountRowView({
  row,
  unit,
}: {
  row: InactiveAccountRow
  unit: InactiveAccountsSummary["idle_unit"]
}) {
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
        {S.rowSubline(row.last_order_label, S.idleIn(row.idle_units, unit))}
      </Typography>
    </li>
  )
}
