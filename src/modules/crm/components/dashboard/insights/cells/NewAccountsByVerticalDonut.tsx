import { Typography } from "@/components/ui/typography"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { NewAccountsParams } from "../../../../api/dashboard"
import { useNewAccounts } from "../../../../hooks/dashboard/useNewAccounts"
import { ACCOUNT_TYPE_ACCENT } from "./rank-columns"
import { INSIGHTS_STRINGS } from "../insights.strings"
import { InsightDonutList } from "../InsightDonutList"
import { InsightWidget, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.newAccounts

// New Accounts by Vertical — the account-type split of this window's new
// logos. The reference's donut; in table view it is the dot + label + count
// + share list, which is `InsightDonutList` with count units.
//
// Reads `summary.by_account_type` off the SAME widget-mode
// `/crm/dashboard/new-accounts` response the dashboard tile uses (identical
// params → one TanStack key → no extra request). The backend counts the
// whole cohort there, never a page, so `share` / `total` computed here are
// over the full set — the same exception the Account Movement Mix donut
// documents.

interface NewAccountsByVerticalDonutProps {
  /** The widget-mode slice — no `page`, same object the dashboard tile sends. */
  params: NewAccountsParams
  span?: Span
  title?: string
  why?: string
}

export function NewAccountsByVerticalDonut({
  params,
  span = 2,
  title,
  why,
}: NewAccountsByVerticalDonutProps) {
  const { data, isLoading, isError, error } = useNewAccounts(params)

  const resolvedTitle = title ?? S.byVerticalTitle
  const resolvedWhy = why ?? S.whyByVertical

  if (isLoading || isError || !data) {
    return (
      <InsightWidget title={resolvedTitle} why={resolvedWhy} span={span}>
        {isError ? (
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : (
          <InsightShimmer />
        )}
      </InsightWidget>
    )
  }

  const entries = Object.entries(data.summary.by_account_type).filter(([, n]) => n > 0)
  const total = entries.reduce((a, [, n]) => a + n, 0)

  return (
    <InsightDonutList
      title={resolvedTitle}
      why={resolvedWhy}
      span={span}
      unit="count"
      total={total}
      data={entries.map(([label, value]) => ({
        label,
        value,
        share: total > 0 ? (value / total) * 100 : 0,
        accent: ACCOUNT_TYPE_ACCENT[label] ?? "slate",
      }))}
    />
  )
}
