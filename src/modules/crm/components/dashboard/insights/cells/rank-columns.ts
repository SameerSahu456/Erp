import type { ChartAccent } from '@/components/common/display/chartTheme'
import { formatINRShort } from '@/lib/currency'

import type { RankRow } from '../../../../data/insights/records'
// Share column hidden (product request) — commented out, not deleted.
// import { formatSharePct } from '../insights.format'
import { INSIGHTS_STRINGS } from '../insights.strings'
import type { RankingCol, RankingRow } from '../InsightRankingTable'

// Column spec + row mapping shared by every ranked breakdown cell — the
// reference's `VALUE_COLS` / `rankRows`.

const S = INSIGHTS_STRINGS.breakdowns

// Share column hidden (product request) — commented out, not deleted.
// Restoring it also means re-adding `shareCol` in RevenueBySourceTable and the
// index shift there (VALUE_COLS[1] becomes share again, count moves to [2]).
export const VALUE_COLS: RankingCol[] = [
  { key: 'value', label: S.columnValueClosed, align: 'right', emphasis: true },
  // { key: 'share', label: S.columnShare, bar: true },
  { key: 'count', label: S.columnOrders, align: 'right' },
]

// Avg Order Value by category. TWO columns, not `VALUE_COLS`' three: the
// endpoint returns `avg_order` + `orders` and no `share` field, so there is
// nothing to fill a share bar with. Deriving one from `totals.total_value`
// would be inventing a metric the API does not report.
export const AOV_COLS: RankingCol[] = [
  { key: 'value', label: S.columnAvgOrder, align: 'right', emphasis: true },
  { key: 'count', label: S.columnOrders, align: 'right' },
]

export const rankRows = (rows: RankRow[]): RankingRow[] =>
  rows.map((r) => ({
    name: r.label,
    cells: {
      value: { text: formatINRShort(r.value) },
      // share: { text: formatSharePct(r.pct), pct: r.pct },
      count: { text: String(r.count) },
    },
  }))

/** Condition → chart accent, exactly as the reference maps it. */
/** Channel-split palette, keyed by the display name the API sends. */
export const ACCOUNT_TYPE_ACCENT: Record<string, ChartAccent> = {
  'End Customer': 'emerald',
  'Channel Partner': 'violet',
  'Cloud / Data Center': 'sky',
  'End User': 'rose',
}

export const CONDITION_ACCENT: Record<string, ChartAccent> = {
  New: 'emerald',
  Refurbished: 'amber',
  'New Pull': 'sky',
  // Freeform SO lines (`no_condition` on the wire). Neutral on purpose: it is
  // an absence of data, not a fourth condition, so it should not read as one.
  'No Condition': 'slate',
}
