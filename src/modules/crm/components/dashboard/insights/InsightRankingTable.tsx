import { Typography, typographyVariants } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { InsightEmptyState } from './InsightEmptyState'
import { RATE_TEXT_CLASS, shareBarWidthPct, type RateTone } from './insights.format'
import { INSIGHTS_STRINGS } from './insights.strings'
import { InsightWidget, type Span } from './InsightWidget'

// Faithful port of the reference `RankingTable`: rank number, name (+ optional
// sub-line), then configurable cells that can render as a proportional bar or a
// toned value.
//
// Colours are the reference's exact Tailwind scale classes. That is deliberate
// and allowed: `tokens/colors.css` states the numbered scales are kept off the
// ramp *on purpose* — "numbered names would override Tailwind's default
// violet-N scale that some dashboards use decoratively" — and the WMS module
// already uses `text-emerald-700`/`bg-emerald-500` the same way. §8.5 targets
// raw hex / rgb() / var(--x,#hex) fallbacks, none of which appear here.

// The rank gutter has NO podium treatment: every rank — 1 or 40 — renders in
// the same theme foreground at the same weight. Rows are already ordered, so
// tinting the top 3 (previously bold foreground vs `text-muted-foreground/60`
// below) only made ranks 4+ read as disabled. (Before that it was medal tints
// amber/slate/orange, dropped for the same reason.)

// Toned cell colours come from `insights.format` — the SAME map the summary
// strip's rate tiles use. It used to be a private copy here, which meant one
// percentage could read emerald in a table and amber in a tile.
const CELL_TONE = RATE_TEXT_CLASS

export interface RankingCol {
  key: string
  label: string
  /** Render the cell as a proportional bar (needs `pct` on the cell). */
  bar?: boolean
  align?: 'left' | 'right'
  /** Tailwind width class (`w-[30%]`) pinning this column under `table-fixed`.
   *
   *  OMIT IT unless the equal split is actually wrong. The default — every
   *  column an equal share — is what keeps Category / OEM / Top Accounts in one
   *  rhythm, and a width set for one card's data would desync it from the rest.
   *
   *  Set it where the columns hold *unequally sized* content, which an equal
   *  split serves badly in both directions at once: Top Orders gave a 40-char
   *  account name the same third as "HPE SERVER" and the same third again as
   *  "₹2.89Cr", so names ellipsed while two thirds of the row sat empty.
   *
   *  Percentages, never px (§8.7) — the same card renders at several spans.
   *  Size only the SHORT columns and leave the name column unsized: it absorbs
   *  whatever is left over, so the widths stay a statement about the data
   *  rather than an arithmetic puzzle that must total 100. */
  width?: string
  /** The row's KEY figure (value closed, revenue, total) — rendered in the
   *  shared `table-figure` role, the darkest text on the row. Every other
   *  column stays plain `table-cell`. */
  emphasis?: boolean
}

export interface RankingCell {
  text: string
  pct?: number
  tone?: RateTone
  /** Render this instead of `text`, for a value that is more than one run of
   *  styled characters — the sales leaderboard's two-tone `21/34` ratio, where
   *  the numerator and denominator carry different tones.
   *
   *  `text` stays REQUIRED alongside it: it is the plain-text form of the same
   *  value, and it is what a future CSV/print path reads. A cell that could
   *  supply only a node would make those paths render "[object Object]". */
  node?: React.ReactNode
}

export interface RankingRow {
  name: string
  /** Rank from the SERVER. Supply it whenever the data is server-paginated —
   *  the endpoint already numbers rows across the whole result set, so
   *  re-deriving it from `page * pageSize` is both redundant and a second
   *  source of truth that can disagree with the API. */
  rank?: number
  /** Secondary line under the name (e.g. a rep's job title).
   *
   *  A node rather than a string only because the leaderboard's sub-line is the
   *  rep's role PILLS (`OverflowPillList`) — a plain string cannot carry the
   *  "+N on hover" affordance. Strings keep the exact muted/truncated helper
   *  styling they always had; a node is rendered as-is so the caller owns its
   *  own layout. */
  sub?: React.ReactNode
  cells: Record<string, RankingCell>
}

interface InsightRankingTableProps {
  title: string
  why?: string
  span?: Span
  columns: RankingCol[]
  rows: RankingRow[]
  /** Header over the name column. Defaults to the shared `ranking.name`
   *  ("Name") — override only where the rows are all one concrete entity and
   *  the generic word undersells the column (Top Orders → "Account Name").
   *  Kept a prop rather than a per-caller edit to `ranking.name`, which is
   *  shared by every ranking table in the board. */
  nameLabel?: string
  onRowClick?: (name: string) => void
  /** Fallback numbering for rows that carry no server `rank` (the seeded
   *  cells). Server-paginated tables should set `rank` per row instead. */
  rankOffset?: number
  /** Drop the rank gutter entirely. Default `true` — every RANKED table (top
   *  accounts, category, OEM, top orders, monthly breakdown) wants it.
   *
   *  Set `false` for a table whose rows are a fixed SET rather than an ordering:
   *  the Sales Funnel's Leads / Deals rows are two different populations, so
   *  numbering them "#1, #2" would invent a ranking that does not exist and read
   *  as "Leads beat Deals". The rest of the chrome — `table-fixed` widths, the
   *  header, striping, truncation, toned and bar cells — is exactly what such a
   *  table wants, which is why this is a flag rather than a second component. */
  showRank?: boolean
  /** Rendered below the table — the pagination footer for a paged table. */
  footer?: React.ReactNode
  /** Card-click drill-through, forwarded to `InsightWidget`. */
  detailHref?: string
  /** Rendered ABOVE the table, inside the widget — a search box or similar.
   *  Kept outside `state` so it stays interactive while a page is loading;
   *  a search input that vanishes mid-query is unusable. */
  toolbar?: React.ReactNode
  /** Replaces the table body while a page is in flight. */
  state?: React.ReactNode
}

export function InsightRankingTable({
  title,
  why,
  span = 6,
  columns,
  rows,
  nameLabel = INSIGHTS_STRINGS.ranking.name,
  onRowClick,
  rankOffset = 0,
  showRank = true,
  footer,
  state,
  toolbar,
  detailHref,
}: InsightRankingTableProps) {
  // Empty replaces the table only after the request settles — a loading/error
  // state keeps its own message instead of looking like "no rows".
  const isEmpty = !state && rows.length === 0

  return (
    <InsightWidget
      title={title}
      why={why}
      span={span}
      detailHref={detailHref}
    >
      {toolbar}
      {state ? (
        state
      ) : isEmpty ? (
        <InsightEmptyState />
      ) : (
        // `variant="table-cell"` — the dashboard's one table body size (13px,
        // dark), shared with every widget table so neighbours read alike;
        // routed through Typography rather than an inline class (§8.4).
        <Typography variant="table-cell" asChild>
          <div className="overflow-x-auto">
            {/* `table-fixed` is the fix, and it changes NOTHING about alignment.
             *
             * The default (auto layout) sizes each column to its CONTENT and
             * dumps all the leftover width on Name — which is why Name→Value ran
             * ~800px while Value→Share was ~25px, and why the same component
             * looked different at span=6 (Top Accounts) vs span=3 (Category /
             * OEM). Fixed layout ignores content and splits the width by the
             * declared widths instead: one narrow rank gutter, then every
             * remaining column an EQUAL share. Same rhythm in all three cards.
             *
             * It is also what makes `truncate` work at all — an auto column just
             * grows to fit, so the ellipsis never appears. */}
            <table className="w-full table-fixed">
              <thead className="bg-card">
                <tr className="border-b border-border/50 text-left">
                  {/* A gutter, not a column: two digits is all it ever holds, so
                   *  it is excluded from the equal split. Omitted for unranked
                   *  tables — see `showRank`. */}
                  {showRank && (
                    <th className="w-9 py-1.5 pr-2.5 font-medium">
                      <Typography variant="table-header">{INSIGHTS_STRINGS.ranking.rank}</Typography>
                    </th>
                  )}
                  {/* No widths from here on — under `table-fixed` the unsized
                   *  columns divide what's left EQUALLY, so Name and every data
                   *  column sit at the same pitch. */}
                  <th className="py-1.5 pr-2.5 font-medium">
                    <Typography variant="table-header" className="block truncate">
                      {nameLabel}
                    </Typography>
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      // Alignment untouched: right where the caller asks, left
                      // otherwise — so each header still sits over its own data.
                      //
                      // `c.width` lands on the HEADER cell only. Under
                      // `table-fixed` the first row fixes every column, so one
                      // class here sizes the whole column and the <td>s below
                      // stay free of layout concerns.
                      // `last:pr-0`: the widget body already insets the table
                      // by `p-3.5`. Without it the trailing column adds its own
                      // 10px on top, so the right gutter came out 24px against
                      // the left's 14px — the first cell has no `pl` at all, so
                      // only this edge was doubled. Header and body BOTH carry
                      // it, or the last column's text stops lining up with its
                      // own header.
                      className={cn(
                        'px-2.5 py-1.5 font-medium last:pr-0',
                        c.align === 'right' && 'text-right',
                        c.width,
                      )}
                    >
                      <Typography variant="table-header" className="block truncate">
                        {c.label}
                      </Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  // Server rank wins; the offset is only for seeded rows.
                  const rank = r.rank ?? rankOffset + i + 1
                  return (
                  <tr
                    key={`${r.name}-${i}`}
                    // stopPropagation is load-bearing: a <tr> is not in the
                    // card's ignore-list, so without it the click ALSO bubbles
                    // to the card's `detailHref` and navigates a second time —
                    // to the same page without the row's filter, which lands
                    // last and wins. Same reason `SalesTeamWidget.openRep` does
                    // it.
                    onClick={
                      onRowClick
                        ? (e) => {
                            e.stopPropagation()
                            onRowClick(r.name)
                          }
                        : undefined
                    }
                    className={cn(
                      'border-b border-border/25 transition-colors last:border-0 odd:bg-muted/20 hover:bg-primary/5',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {showRank && (
                      <Typography variant="table-name" numeric asChild>
                        <td className="py-1.5 pr-2.5">{rank}</td>
                      </Typography>
                    )}
                    {/* `truncate` only bites because the column now has a
                     *  definite width — under auto layout it was a no-op. The
                     *  full text stays reachable on hover. */}
                    <td className="py-1.5 pr-2.5">
                      <Typography variant="table-name" asChild>
                        <div className="truncate" title={r.name}>
                          {r.name}
                        </div>
                      </Typography>
                      {typeof r.sub === 'string' ? (
                        <Typography variant="table-secondary" className="block truncate">
                          {r.sub}
                        </Typography>
                      ) : (
                        // `min-w-0` so a node sub-line (pills) shrinks inside
                        // the fixed-width name column instead of pushing the
                        // table wide (§8.7).
                        r.sub && <div className="mt-0.5 min-w-0">{r.sub}</div>
                      )}
                    </td>
                    {columns.map((c) => {
                      const cell = r.cells[c.key]
                      return (
                        <td
                          key={c.key}
                          className={cn(
                            'px-2.5 py-1.5 tabular-nums last:pr-0',
                            c.align === 'right' && 'text-right',
                          )}
                        >
                          {c.bar && cell?.pct != null ? (
                            // `justify-end` on a right-aligned column: `text-right`
                            // on the <td> does nothing to a flex child, so the
                            // bar + percentage hugged the LEFT edge of the cell
                            // while the "Share" header sat right-aligned ~200px
                            // away — the header no longer stood over its own data.
                            // Every other column is short text and was unaffected.
                            <div
                              className={cn(
                                'flex items-center gap-2',
                                c.align === 'right' && 'justify-end',
                              )}
                            >
                              {/* The track FLEXES instead of a hard `w-16`: an
                               *  equal split hands this column ~86px in a span=3
                               *  card, where 64px of bar + the percentage would
                               *  spill out. `max-w-16` keeps its full size
                               *  wherever there is room. */}
                              <div className="h-1.5 min-w-0 max-w-16 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500 ease-out"
                                  // 2px floor on a non-zero share. The track is
                                  // only 64px, so 0.3% is 0.19px — the browser
                                  // drew nothing and every sub-1% row looked
                                  // equally empty. Above the floor the width is
                                  // the true share, so proportions still read.
                                  style={{
                                    width: `${shareBarWidthPct(cell.pct)}%`,
                                    minWidth: cell.pct > 0 ? '2px' : undefined,
                                  }}
                                />
                              </div>
                              <Typography variant="table-secondary" asChild>
                                {/* The percentage is the point — the bar gives way
                                 *  before this does. */}
                                <span className="shrink-0">{cell.text}</span>
                              </Typography>
                            </div>
                          ) : (
                            // A long value ellipses rather than wrapping to two
                            // lines and knocking the row height out of step.
                            //
                            // No `title`: these cells hold short formatted
                            // numbers ("₹0", "3", "▲ +0.0%") that are fully
                            // visible, so the native tooltip only ever repeated
                            // what was already on screen — a dark chip floating
                            // over the card on any accidental hover. The NAME
                            // column keeps its `title` because names really do
                            // truncate. A data value that truncates is a column
                            // width bug (§8.7), not something a tooltip fixes.
                            <span
                              className={cn(
                                'block truncate whitespace-nowrap',
                                c.emphasis && typographyVariants({ variant: 'table-figure' }),
                                cell?.tone && CELL_TONE[cell.tone],
                              )}
                            >
                              {/* `node` wins when present — a multi-tone value
                               *  (the leaderboard's `21/34`) cannot be expressed
                               *  as one styled string. Everything else is text. */}
                              {cell?.node ?? cell?.text ?? '—'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Typography>
      )}
      {/* `mt-auto` keeps the pager as the closing block whenever the card has
          extra space. It is a no-op when the card is content-height. */}
      {footer && <div className="mt-auto">{footer}</div>}
    </InsightWidget>
  )
}
