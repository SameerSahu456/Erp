import { ChevronRight } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { formatINRShort } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { SalesTeamRevenueRow } from '../../../api/dashboard'
import { INSIGHTS_STRINGS } from './insights.strings'
import { Ratio } from './Ratio'

// The Sales Team widget's table — the reference's markup, on live rows.
//
// Presentational only: it takes the API rows it is given and reports a click.
// Fetching, filters and paging belong to `SalesTeamWidget`.

const S = INSIGHTS_STRINGS.salesTeam
const R = INSIGHTS_STRINGS.ratio

// Proportional widths (not `w-auto` on Name) so the four metric columns are
// evenly spaced across the row instead of Name swallowing all the slack and
// crushing the numbers into a cluster on the right. Name truncates with an
// ellipsis when a name is too long.
//
// Lead and Deal are the WIDEST metric columns (19% each) because they carry a
// pair, not a number: `21/34` is roughly twice the glyphs of `21`. At the old
// even 16% split the denominator wrapped or pushed the row sideways on a
// narrow card. SO stays narrow (11%) — it is a bare count — and Name gives up
// the difference, which it can afford since it already truncates.
//
// `cell` carries each column's horizontal padding + alignment and is applied to
// BOTH the header and the body cells, so a header sits in the same box as the
// numbers beneath it and their right edges line up (previously the header had
// no padding while the body did, so every count header was offset by a few px).
const COLUMNS = [
  { key: 'name', label: S.columnName, width: 'w-[35%]', cell: 'pr-2' },
  // SO widened from 11% now it carries an `approved/submitted` pair like Lead
  // and Deal; the three ratio columns share the space evenly.
  { key: 'lead', label: S.columnLead, width: 'w-[16%]', cell: 'px-1 text-right' },
  { key: 'deal', label: S.columnDeal, width: 'w-[17%]', cell: 'px-1 text-right' },
  { key: 'so', label: S.columnSo, width: 'w-[16%]', cell: 'px-1 text-right' },
  { key: 'revenue', label: S.columnRevenue, width: 'w-[16%]', cell: 'pl-2 text-right' },
] as const

interface SalesTeamTableProps {
  rows: SalesTeamRevenueRow[]
  onRowClick: (e: React.MouseEvent, row: SalesTeamRevenueRow) => void
}

export function SalesTeamTable({ rows, onRowClick }: SalesTeamTableProps) {
  return (
    // No height cap: the card grows to fit every rep. `table-fixed` + the
    // fixed-percentage Name column keep long names truncating (…) rather than
    // widening the row, so there is no sideways scroll either (§8.7).
    // `variant="table-cell"` is the dashboard's one table body size (13px,
    // dark) — the same as every other widget table, via Typography rather than
    // an inline class (§8.4). It was `helper` (12px, muted), which made this
    // table read smaller and fainter than Revenue by Account beside it.
    <Typography variant="table-cell" asChild>
      <div className="overflow-x-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-card">
            <tr className="border-b border-border/50 text-left">
              {COLUMNS.map((h) => (
                <th key={h.key} className={cn('py-1.5 font-medium', h.width, h.cell)}>
                  <Typography variant="table-header">{h.label}</Typography>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.user_id}
                onClick={(e) => onRowClick(e, r)}
                className="group cursor-pointer border-b border-border/25 last:border-0 odd:bg-muted/20 hover:bg-primary/5"
              >
                {/* Shared dashboard roles: `table-name` for the label,
                    `table-figure` for the row's key figure (Revenue). */}
                <Typography variant="table-name" asChild>
                  <td className="truncate py-1 pr-2" title={r.name}>
                    {r.name}
                  </td>
                </Typography>
                {/* Closed over owned — the same `<Ratio>` the roll-up tiles
                    above the table use, so the two can't drift apart. */}
                <td className="px-1 py-1 text-right">
                  <Ratio count={r.lead_count} total={r.lead_total} unit={R.unitLeads} />
                </td>
                <td className="px-1 py-1 text-right">
                  <Ratio count={r.deal_count} total={r.deal_total} unit={R.unitDeals} />
                </td>
                {/* Approved over submitted (`so_count / so_total`) — the same
                    `<Ratio>` as Lead and Deal, so all three read alike. */}
                <td className="px-1 py-1 text-right">
                  <Ratio count={r.so_count} total={r.so_total} unit={R.unitSos} />
                </td>
                {/* `truncate`, not just `nowrap`: a crore-scale figure is wider
                    than this fixed column and was being CLIPPED mid-digit
                    (§8.7). It now ellipsises, full value on hover. */}
                <Typography variant="table-figure" asChild>
                <td
                  className="truncate py-1 pl-2 text-right"
                  title={formatINRShort(r.achieved)}
                >
                  {/* `achieved` is a JSON number (`DecimalAsFloat` server-side),
                      handed to the shared formatter rather than templated. */}
                  {formatINRShort(r.achieved)}
                  <ChevronRight className="ml-0.5 inline size-3 text-transparent group-hover:text-muted-foreground/60" />
                </td>
                </Typography>
              </tr>
            ))}
            {/* No empty row here: `SalesTeamWidget` renders `InsightEmptyState`
                INSTEAD of this table when there are no rows, so the empty case
                fills the card rather than sitting as one short `<td>` under a
                header with nothing beneath it. */}
          </tbody>
        </table>
      </div>
    </Typography>
  )
}
