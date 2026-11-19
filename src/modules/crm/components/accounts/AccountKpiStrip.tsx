import {
  Briefcase,
  CalendarClock,
  ClipboardList,
  IndianRupee,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react'

import { StatsRow } from '@/components/common/display/StatsRow'
import { Card } from '@/components/ui/card'
import { formatINRShort } from '@/lib/currency'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { formatIST_date } from '@/shared/lib/date'

import type { AccountKpisPeriodType } from '../../api/accounts'
import type { DashboardConditionFilter } from '../../api/dashboard'
import { useAccountKpis } from '../../hooks/accounts/useAccountKpis'
import { useSummary } from '../../hooks/dashboard/useSummary'
import { InsightShimmer } from '../dashboard/insights/InsightShimmer'
import { kpiWindowLabel, monthsFilterLabel } from './accountDetailHelpers'
import { ACCOUNTS_STRINGS } from './accounts.strings'

// Five KPI tiles at the top of the Account 360° tab.
//
// TWO sources, deliberately:
//   • DEALS            → `GET /crm/dashboard/summary` narrowed by
//                        `account_ids=[this]` — the SAME endpoint the CRM
//                        dashboard's own tile strip reads, so a deal counted
//                        there is counted identically here.
//   • the other four   → `GET /crm/accounts/{id}/kpis`.
//
// Both respect the tab's Category / OEM facets and its period, so refetching
// the widgets below on a facet change refetches the tiles alongside them.
//
// Deliberately dumb about window computation — the server owns the calendar
// boundaries and echoes `start`/`end` back; the FE only formats what it
// receives (`kpiWindowLabel`).
//
// NOT rendered, on purpose: a deal VALUE on the DEALS tile and a
// period-over-period delta arrow on REVENUE. Neither endpoint returns the
// figure, and `DataCard`'s `trend` prop is only honest when it is fed a real
// one — the CRM dashboard's own arrows are hardcoded placeholders, which is
// exactly the thing not to copy onto a per-account screen.

const S = ACCOUNTS_STRINGS.detail.threeSixty.kpi

interface AccountKpiStripProps {
  accountId: string
  period: AccountKpisPeriodType
  /** Only used when `period === "custom"`. ISO `YYYY-MM-DD`. */
  start?: string
  end?: string
  categoryIds?: string[]
  oemIds?: string[]
  conditions?: DashboardConditionFilter[]
  /** `YYYY-MM` tokens — narrows the Period and Last Order tiles, not Lifetime. */
  months?: string[]
}

export function AccountKpiStrip({
  accountId,
  period,
  start,
  end,
  categoryIds,
  oemIds,
  conditions,
  months,
}: AccountKpiStripProps) {
  const kpis = useAccountKpis(accountId, {
    period,
    start,
    end,
    category_ids: categoryIds,
    oem_ids: oemIds,
    conditions,
    months,
    // No `bypass_visibility` here: `/kpis` ignores it (the path-scoped account
    // check is its only gate), and sending it would give this call a different
    // query key from the one `AccountThreeSixtyTab` makes for the band
    // heading — two identical requests per filter change instead of one.
  })

  // Same slice, expressed in the dashboard endpoint's param names. `period`
  // is the identical five-value union on both sides, so it passes straight
  // through.
  const summary = useSummary({
    period,
    start,
    end,
    account_ids: [accountId],
    category_ids: categoryIds,
    oem_ids: oemIds,
    conditions,
    months,
    // 360°-only strip — see the note on `revenueParams.bypass_visibility` in
    // `AccountThreeSixtyTab`. Without this the middle tile silently narrowed
    // to the caller's slice while the KPI tile above it (path-scoped, no
    // visibility) reported the account whole, and the two disagreed.
    bypass_visibility: true,
  })

  // Either query failing takes the whole strip, rather than zeroing the one
  // tile it feeds. `/dashboard/summary` answers an out-of-scope caller with a
  // 403, and a DEALS tile silently reading "0" would state something false
  // about the account — `LoadErrorState` renders that case as no-access.
  const error = kpis.error ?? summary.error
  if (kpis.isError || summary.isError) {
    return (
      <Card className="p-4">
        <LoadErrorState error={error} fallback={S.loadError} compact />
      </Card>
    )
  }

  // Shimmer the whole strip until BOTH queries land — six cards that fill in
  // one by one, each with "—" and "Loading…", read as broken data.
  if (kpis.isLoading || summary.isLoading) return <InsightShimmer variant="kpi" count={6} />

  const k = kpis.data
  const s = summary.data

  // The window the tiles report on. The KPI response echoes the Period
  // picker's bounds (Monthly → current month); the Month chip is a
  // SEPARATE narrowing applied on top. When a chip is active, the picker
  // label would mislead ("Oct 2026" alongside figures filtered to Jun
  // 2026), so show the chip's month(s) instead — the backend queries
  // key on `months` the same way.
  const windowLabel =
    monthsFilterLabel(months) ?? kpiWindowLabel(period, k?.period.start, k?.period.end)
  const sub = (detail: string) => S.subJoin(windowLabel, detail)

  const daysAgo = k?.last_order.days_ago

  return (
    // `mb-0!`: `.cpt-kpi-grid` ships `margin-bottom: 20px`, which on a tab that
    // already stacks with `space-y-4` makes the gap under the strip 36px while
    // every other gap on the tab is 16px (and 12px between the cards below).
    // The bang is required, not stylistic — `comprint.css` is UNLAYERED and
    // imported after `@import 'tailwindcss'`, so it outranks the whole
    // `utilities` layer and a plain `mb-0` would silently lose.
    <StatsRow
      className="mb-0!"
      stats={[
        {
          label: S.dealsLabel,
          value: s ? s.total_deals.toLocaleString('en-IN') : '—',
          icon: Briefcase,
          accent: 'violet',
          sub: S.subJoin(windowLabel, S.dealsSub(s?.deals_closed ?? 0)),
        },
        {
          label: S.ordersLabel,
          value: k ? k.period.orders.toLocaleString('en-IN') : '—',
          icon: ClipboardList,
          accent: 'teal',
          sub: sub(k ? formatINRShort(k.period.revenue) : ''),
        },
        {
          // Returned Orders: SOs on this account whose status is `Returned`.
          // Sits next to Sales Orders on purpose — the Orders tile deliberately
          // DROPS Returned (counted-order rule, lines pro-rated to zero), so
          // placing Returned immediately after Orders reads as the companion
          // figure to the one above it. Window follows the Period picker
          // (anchored on `returned_at`, not `submitted_at`, since a return
          // lands months after the order was submitted); lifetime count sits
          // in the sub-line.
          label: S.returnedLabel,
          value: k ? k.returned.orders.toLocaleString('en-IN') : '—',
          icon: RotateCcw,
          accent: 'warning',
          sub: k ? sub(S.returnedSub(k.returned.lifetime_orders)) : windowLabel,
        },
        {
          label: S.revenueLabel,
          value: k ? formatINRShort(k.period.revenue) : '—',
          icon: IndianRupee,
          accent: 'success',
          sub: windowLabel,
        },
        {
          label: S.lifetimeLabel,
          value: k ? formatINRShort(k.lifetime.revenue) : '—',
          icon: ShoppingCart,
          accent: 'primary',
          sub: k ? S.lifetimeSub(k.lifetime.orders) : '',
        },
        {
          label: S.lastOrderLabel,
          // An account with no qualifying SO has BOTH fields null, and renders
          // an em-dash — the same "nothing here" mark the pivot uses for an
          // empty cell. A sentence ("No orders yet") in a slot the other four
          // tiles fill with a figure reads as a message about the tile rather
          // than as its value, and it sets the tile's width from prose.
          value:
            daysAgo !== null && daysAgo !== undefined
              ? S.lastOrderDaysAgo(daysAgo)
              : S.emptyValue,
          icon: CalendarClock,
          accent: 'teal',
          sub: k?.last_order.submitted_at ? formatIST_date(k.last_order.submitted_at) : '',
        },
      ]}
    />
  )
}
