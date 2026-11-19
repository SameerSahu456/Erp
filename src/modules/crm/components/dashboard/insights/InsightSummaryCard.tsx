import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import {
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  Maximize2,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { formatINRShort } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { isValidationError } from '@/shared/api/envelope'

import type { SummaryParams, SummaryRatio, SummaryTimeAvg } from '../../../api/dashboard'
import { useSummary } from '../../../hooks/dashboard/useSummary'
import { RATE_BAR_CLASS, RATE_TEXT_CLASS, rateTone } from './insights.format'
import { recordsHref } from './insights.routes'
import { INSIGHTS_STRINGS } from './insights.strings'
import { Ratio } from './Ratio'
import { isDrillable } from './summary-drilldown.config'
import { ShimmerBar } from "./InsightShimmer"

// The 7-tile strip above every insight body: four counts (Leads / Deals /
// Quotes Done / SO Closed Value) and three rates (Quote→SO Win, Deal→Order,
// Lead→Order), each rate with a proportional bar.
//
// Rendered full-width; the tiles are separated by a 1px grid gap over the
// border colour (`gap-px bg-border/40`).
//
// LEADS and DEALS are RATIOS — `closed_leads / total_leads` and
// `deals_closed / total_deals`, the same closed-over-total pair the Sales Team
// card shows per rep, via the shared `<Ratio>`. The digits are display only:
// the WHOLE TILE is the click target, as on every other tile, and it opens the
// CLOSED side — the figure the tile leads with. See
// `summary-drilldown.config.ts` for what each tile maps to on the wire.
//
// TILE SET vs the reference UI: the reference's 6th tile was "Quote Accept
// Rate". `GET /crm/dashboard/summary` returns no `quote_accept_rate` (and no
// accepted-quote count), so that tile had no way to be honest. Its slot is now
// DEAL → ORDER RATE, which the endpoint does return (`deal_to_order_rate`) and
// which nothing rendered. LEAD → ORDER TIME stays defined but hidden —
// `lead_to_order_time` is commented out of the backend's `SummaryResponse`.

// Rate tone + its colour maps live in `insights.format.ts`, shared with the
// Sales Funnel card's per-stage conversion — the same percentage must not read
// as "good" on one card and "warn" on another.
const COUNT_ACCENT: Record<string, string> = {
  info: 'text-sky-600 dark:text-sky-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  primary: 'text-primary',
  violet: 'text-violet-600 dark:text-violet-400',
}

/** Which tile — or which HALF of a ratio tile — was clicked. The key the
 *  drill-down step will fetch against.
 *
 *  `leads` / `deals-closed` are the ratio tiles' TOTAL halves (they predate the
 *  ratios and keep their names so existing `/crm/insights/records/<key>` links
 *  still resolve); `leads-won` / `deals-won` are the closed halves. */
export type SummaryTileKey =
  | 'leads'
  | 'leads-won'
  | 'deals-closed'
  | 'deals-won'
  | 'quotes-done'
  | 'so-closed-value'
  | 'win-rate'
  | 'deal-order-rate'
  | 'lead-order-rate'
  | 'lead-order-time'

/** `Ratio.rate` is a FRACTION (0.4444). The backend sends `0.0` — not null —
 *  when the denominator is zero, so "nothing to divide" is read from the
 *  denominator here: it becomes `null` and the tile prints "—" with no tone,
 *  instead of a red 0.00% (DASH-14). Convert once, here, so the tiles keep
 *  working in 0–100 like before. */
const pct = (r: SummaryRatio) =>
  r.rate === null || r.denominator === 0 ? null : r.rate * 100

/** Shared tile chrome — a `Link` when the tile drills down, an inert `div`
 *  otherwise. Module-level so it is not recreated each render (which would
 *  remount every tile and drop focus). */
// `h-full` makes each tile fill its row: the row height is set by the tallest
// tile (the rate tiles, with their progress bar + sub-line), so without this the
// hover/focus background stops at the content and leaves a white strip under the
// shorter tiles (Leads). See §8.7 sibling — full-bleed interactive surface, not
// a content-height one.
//
// `flex-1` + `min-w-*` is the pair that makes the strip self-adjusting — see
// `TILE_GRID_CLASS`. `flex-1` is `flex: 1 1 0%`, so a tile's width comes purely
// from splitting the line's free space (every tile on a line is equal width) and
// the min-width is what decides where the line breaks. 8.5rem ≈ 136px keeps two
// tiles per row on a 320px phone (matching the old `grid-cols-2`) and lets all
// seven sit on one row from ~960px of card width up.
//
// `min-h-24` (96px) is the height a RATE tile reaches on its own — header +
// value + bar + sub-line + `py-3`. Pinning it here makes the strip's height a
// property of the STRIP rather than of whichever tiles the response happened to
// yield: drop the rate tiles (or the conditional time tile) and the card keeps
// exactly the height it has now instead of collapsing to the shorter count
// tiles. Flex `stretch` only equalises tiles against EACH OTHER — it cannot
// hold a height across a changing tile set, which is what made the card look
// like it shrank.
const TILE_CLASS =
  'flex h-full min-h-24 min-w-[8.5rem] flex-1 flex-col gap-1 bg-card px-4 py-3'

// Every tile's label row, fixed-height. Without the fixed height the row is as
// tall as its contents, and the contents DIFFER: a count tile's row holds a
// `size-3.5` icon (14px) while a rate tile's holds only `badge` text
// (`text-[10px] leading-none` = 10px). That 4px gap cascaded — the rate tiles'
// label, value and sub-line each sat ~4px above their neighbours', so no row of
// the strip lined up across tiles. `h-4` (16px) clears both.
const TILE_HEAD_CLASS = 'flex h-4 items-center justify-between gap-1.5'

// The trailing line of every tile. `mt-auto` pins it to the tile's BOTTOM, so
// the sub-lines share a baseline whether or not the tile carries a progress bar
// above them — and the slack that the flex stretch adds to a short tile lands in
// the middle, where it reads as spacing, instead of hanging under the last line.
const TILE_FOOT_CLASS = 'mt-auto truncate'

/** Not user-facing copy — a tile key. Hoisted so the literal-string lint
 *  rule doesn't read it as hardcoded UI text. */
const TIME_TILE: SummaryTileKey = 'lead-order-time'

/** Content-driven layout — the strip fills its row whatever it is handed.
 *
 *  Replaces `grid auto-rows-fr grid-cols-2 md:grid-cols-4 xl:grid-cols-7`, which
 *  pinned the track count to the tile count of the moment (4 counts + 2 rates +
 *  1 time). Fixed tracks never redistribute: `grid-cols-7` is seven
 *  `minmax(0,1fr)` tracks, so dropping a tile reflows the survivors into the
 *  freed slot but does not widen them — the seventh just sits empty. The old
 *  `md:grid-cols-4` carried that hole permanently: 7 tiles wrap 4 + 3, leaving
 *  the last cell of row two blank at every md–lg width.
 *
 *  FLEX, not `grid-cols-[repeat(auto-fit,…)]`. `auto-fit` fixes the removal case
 *  only while every tile still fits ONE row — it collapses tracks that are empty
 *  in the whole grid, and a track holding a row-one tile is not empty, so a
 *  ragged last row keeps its dead cells (7 tiles over 6 tracks = 6 + 1, with
 *  five blanks beside the orphan). `flex-wrap` + `flex-1` has no tracks at all:
 *  whatever lands on a line splits that line's full width, so the last row
 *  closes up as readily as a full one. That is what makes the tile set genuinely
 *  optional — the time tile is conditional (`{time && …}` below) and the
 *  count/rate lists are built from the response.
 *
 *  Wrap point lives on the tile's `min-w-*`, not here — see `TILE_CLASS`.
 *  `gap-px` over `bg-border/40` still draws the hairlines between tiles. */
const TILE_GRID_CLASS = 'flex flex-wrap gap-px bg-border/40'

/** Skeleton cards reserved while loading. The endpoint returns every field, so
 *  the full set is the honest placeholder — but it is a HINT, not a contract:
 *  the strip above reflows, so a shorter real set closes up on its own. */
const SKELETON_TILES = 7

// Opens the records page in a NEW TAB — the board is a reading surface, and a
// tile is a side-question about one number on it. Drilling in must not take the
// dashboard away: that is the one thing the modal this replaced got right, and
// it is why several tiles can be opened in turn without re-filtering the board
// each time you come back.
//
// A real anchor (not a button + `navigate`) is what makes that honest: the new
// tab is the browser's own, so ctrl/middle-click, "open in new window" and
// copy-link all behave as the user expects. `rel="noopener noreferrer"` because
// any `target="_blank"` link must not hand the opener to the new document.
//
// KNOWN AND ACCEPTED: a new tab starts with no session history, so the browser's
// Back button is inert on the page this opens. Keeping the board behind you is
// the trade being made — the way back is the other tab, not Back. Do not "fix"
// that by dropping `target` without raising it first.
//
// `TILE_CLASS` already carries the `flex h-full` treatment that makes the
// interactive surface fill its grid cell, so it is reused as-is.
function SummaryTile({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <div className={TILE_CLASS}>{children}</div>
  return (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        TILE_CLASS,
        'group text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50',
      )}
    >
      {children}
    </Link>
  )
}

interface InsightSummaryCardProps {
  params: SummaryParams
  /** Whether any facet is active — drives the "Filtered view" badge. */
  filtered: boolean
}

export function InsightSummaryCard({ params, filtered }: InsightSummaryCardProps) {
  const S = INSIGHTS_STRINGS.summary
  // Ratio wording is shared with the Sales Team card — see the `ratio` block.
  const R = INSIGHTS_STRINGS.ratio
  const { data, isLoading, isError, error } = useSummary(params)
  // The strip renders on BOTH `/crm` and `/crm/insights/:metric`, so the records
  // link must carry the URL the user is actually on — for the slice AND for the
  // back target it stamps into `?from`.
  const location = useLocation()

  // A drillable tile links to its records page; the rest render as inert
  // `<div>`s (see `SummaryTile`) — no link, no hover affordance, no `Maximize2`.
  const hrefFor = (tile: SummaryTileKey): string | undefined =>
    isDrillable(tile) ? recordsHref(tile, location) : undefined

  // ── Fields the RUNNING backend may not ship yet ────────────────────────
  //
  // `closed_leads` / `total_leads` / `total_deals` / `deal_to_order_rate` are
  // REQUIRED in the generated type, and absent from any backend build older
  // than the one that added them. The generated type describes the contract,
  // not the process actually answering on `VITE_API_BASE_URL` — and a UAT box
  // one deploy behind is the normal case, not an edge one.
  //
  // This was not a hypothetical: `pct(data.deal_to_order_rate)` read `.rate`
  // off `undefined` and the ErrorBoundary blanked the whole dashboard, because
  // one tile out of seven had no data. Each of these now degrades on its own —
  // the ratio tiles fall back to the bare count they showed before, and the
  // rate tile drops out of a strip that is built to reflow.
  //
  // Read through `?? undefined` so the optionality is visible at the use site
  // rather than hidden behind the type's promise.
  const closedLeads: number | undefined = data?.closed_leads ?? undefined
  const totalLeads: number | undefined = data?.total_leads ?? undefined
  const totalDeals: number | undefined = data?.total_deals ?? undefined
  const dealRate: SummaryRatio | undefined = data?.deal_to_order_rate ?? undefined
  const hasLeadRatio = closedLeads !== undefined && totalLeads !== undefined
  const hasDealRatio = totalDeals !== undefined
  // A backend one build behind omits the count/value fields — fall back to the
  // original captions rather than render `undefined/…`.
  const hasSoRatio = (data?.so_closed_count ?? undefined) !== undefined
  const hasQuotesValue = (data?.quotes_value ?? undefined) !== undefined

  // The WHOLE tile is the click target — one link per tile, as it has always
  // been. A ratio tile shows two figures but drills into ONE record set: the
  // CLOSED side, which is the figure the tile leads with.
  const counts: {
    key: SummaryTileKey
    label: string
    value: ReactNode
    sub: ReactNode
    icon: LucideIcon
    accent: string
    /** Whole-tile drill-through. Undefined on the ratio tiles. */
    self?: string
  }[] = data
    ? [
        {
          key: 'leads',
          label: S.leads,
          // Whole-tile drill-through into the WON side — `lead:won`. See the
          // `leads-won` entry in summary-drilldown.config.ts for what that
          // panel contains (lead-sourced orders) and how it differs from the
          // tile's own `closed_leads` figure.
          self: hrefFor('leads-won'),
          // `closed_leads`, NOT `lead_to_order_rate.numerator` — the backend
          // documents these as different populations: this counts LEADS that
          // reached closed_won, the rate's numerator counts ORDERS sourced from
          // leads. A lead with two orders is 1 here and 2 there.
          value: hasLeadRatio ? (
            <Ratio
              count={closedLeads!}
              total={totalLeads!}
              unit={R.unitLeads}
              size="kpi"
              grouped
            />
          ) : (
            data.leads.toLocaleString('en-IN')
          ),
          sub: hasLeadRatio ? S.wonOfTotalSub : S.leadsSub,
          icon: Users,
          // No `accent`: the value is a two-tone <Ratio> now, so the accent
          // would only ever paint the icon. Kept muted rather than left
          // pointing at a colour nothing else on the tile uses.
          accent: 'info',
        },
        {
          key: 'deals-closed',
          label: S.deals,
          // The CLOSED side — `deal:won`, whose row count equals `deals_closed`
          // (verified live). The old `deals-closed` key stays registered so
          // existing `/records/deals-closed` links keep resolving, but it is no
          // longer what this tile opens: it maps to `deal:total`, which the
          // backend still answers with the closed orders anyway.
          self: hrefFor('deals-won'),
          value: hasDealRatio ? (
            <Ratio
              count={data.deals_closed}
              total={totalDeals!}
              unit={R.unitDeals}
              size="kpi"
              grouped
            />
          ) : (
            data.deals_closed.toLocaleString('en-IN')
          ),
          sub: hasDealRatio ? S.wonOfTotalSub : S.dealsClosedSub,
          icon: CheckCircle2,
          accent: 'success',
        },
        {
          key: 'quotes-done',
          label: S.quotesDone,
          self: hrefFor('quotes-done'),
          // Value is the headline; the foot line carries the quote count
          // (and the won count) — same shape as the SO Closed Value tile.
          value: hasQuotesValue ? formatINRShort(data.quotes_value) : data.quotes_done.toLocaleString('en-IN'),
          // The endpoint returns won quotes, not accepted ones — the win
          // ratio's numerator is the only accepted-ish count available.
          sub: hasQuotesValue
            ? S.quotesCountWonSub(data.quotes_done, data.quote_to_so_win_rate.numerator)
            : S.quotesWonSub(data.quote_to_so_win_rate.numerator),
          icon: FileText,
          accent: 'primary',
        },
        {
          key: 'so-closed-value',
          label: S.soClosedValue,
          self: hrefFor('so-closed-value'),
          // Revenue is the headline; the foot line carries the `approved/total`
          // order pair, as the Leads and Deals tiles carry theirs.
          value: formatINRShort(data.so_closed_value),
          sub: hasSoRatio ? (
            <Ratio
              count={data.so_closed_count}
              total={data.so_total_count ?? data.so_closed_count}
              unit={R.unitSos}
              size="table"
              grouped
            />
          ) : (
            S.soClosedValueSub
          ),
          icon: IndianRupee,
          accent: 'violet',
        },
      ]
    : []

  // `rate: null` means "no denominator", NOT "zero percent" — it must render
  // muted with an empty bar, never in danger red, which would read as a bad
  // result rather than absent data.
  const rates: {
    key: SummaryTileKey
    label: string
    value: string
    sub: string
    rate: number | null
  }[] = data
    ? [
        {
          key: 'win-rate',
          label: S.winRate,
          value: fmtPct(pct(data.quote_to_so_win_rate), S.noValue),
          sub: S.ofQuotes(
            data.quote_to_so_win_rate.numerator,
            data.quote_to_so_win_rate.denominator,
          ),
          rate: pct(data.quote_to_so_win_rate),
        },
        // Between Quote→SO and Lead→Order, matching the reference's order.
        // Dropped entirely — not rendered as "—" — when the running backend
        // does not send `deal_to_order_rate`: the strip is `flex-wrap` +
        // `flex-1`, so the survivors close the gap (see `TILE_GRID_CLASS`), and
        // a permanently blank tile would read as "0% conversion" rather than
        // "this build has no such metric".
        ...(dealRate
          ? [
              {
                key: 'deal-order-rate' as SummaryTileKey,
                label: S.dealOrderRate,
                value: fmtPct(pct(dealRate), S.noValue),
                sub: S.ofDeals(dealRate.numerator, dealRate.denominator),
                rate: pct(dealRate),
              },
            ]
          : []),
        {
          key: 'lead-order-rate',
          label: S.leadOrderRate,
          value: fmtPct(pct(data.lead_to_order_rate), S.noValue),
          sub: S.ofLeads(data.lead_to_order_rate.numerator, data.lead_to_order_rate.denominator),
          rate: pct(data.lead_to_order_rate),
        },
      ]
    : []

  // Read off-schema: `lead_to_order_time` is commented out of the backend's
  // `SummaryResponse`, so the generated type no longer carries it and the time
  // tile below stays hidden. Left as a lookup rather than deleted so the tile
  // comes back on its own the day the backend re-enables the field.
  const time: SummaryTimeAvg | undefined = (
    data as { lead_to_order_time?: SummaryTimeAvg } | undefined
  )?.lead_to_order_time

  return (
    <Card
      size="sm"
      // `size="sm"` injects `data-[size=sm]:gap-3` and `data-[size=sm]:py-3`,
      // whose data-attribute selector outranks a plain `gap-0` / `py-0` — so
      // the card kept a 12px header↔grid gap AND 12px top/bottom padding, which
      // showed as empty space around a tile on hover. Override with the SAME
      // variant so tailwind-merge drops the sm ones: tiles now bleed to the
      // card edges and the hover highlight fills each tile completely.
      className="col-span-full gap-0 py-0 data-[size=sm]:gap-0 data-[size=sm]:py-0 overflow-hidden rounded-2xl border-border/50 shadow-[0_1px_2px_-1px_rgb(var(--shadow-rgb)/0.08),0_2px_6px_-2px_rgb(var(--shadow-rgb)/0.06)]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/40 bg-gradient-to-b from-muted/25 to-transparent px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/30" />
          <Typography variant="card-title" className="truncate">
            {S.title}
          </Typography>
        </div>
        {filtered && (
          <Typography variant="helper" asChild>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {S.filteredView}
            </span>
          </Typography>
        )}
      </header>

      {isError ? (
        <div className="px-4 py-3">
          {/* A 422 means the SLICE was rejected, not that this endpoint is
              unwell — and every cell below shares these exact params, so they
              are all about to fail identically. Say it ONCE here, in the user's
              vocabulary, rather than letting the backend's validator text
              ("end must be greater than or equal to start") surface a dozen
              times down the page.

              Unreachable from a hand-edited URL now that `parseInsightParams`
              repairs the slice before it is sent — this is the backstop for a
              slice the client could not have known was bad. Every OTHER failure
              (403 → NoAccess, 5xx → this endpoint is down) is genuinely
              per-cell and keeps the standard error slot. */}
          {isValidationError(error) ? (
            <Typography variant="helper" tone="danger">
              {INSIGHTS_STRINGS.viewRepair.sliceRejected}
            </Typography>
          ) : (
            <LoadErrorState error={error} fallback={S.loadError} compact />
          )}
        </div>
      ) : (
        /* Layout is content-driven — see `TILE_GRID_CLASS` / `TILE_CLASS`.
           `gap-px` over the border colour draws the hairlines between tiles, and
           flex's default `align-items: stretch` gives every tile on a line the
           line's full height, so the hover highlight fills the tile rather than
           stopping at the shorter ones' content (Leads beside the rate tiles).
           This is what the grid needed `auto-rows-fr` + `h-full` to fake. */
        <div className={TILE_GRID_CLASS}>
          {isLoading || !data ? (
            /* Fixed-height skeletons — the strip must not reflow when data lands. */
            Array.from({ length: SKELETON_TILES }, (_, i) => (
              <div key={i} className={TILE_CLASS}>
                <ShimmerBar className="h-3 w-20" />
                <ShimmerBar className="h-6 w-16" />
                <ShimmerBar className="h-3 w-24" />
              </div>
            ))
          ) : (
            <>
              {counts.map((c) => {
                const Icon = c.icon
                return (
                  <SummaryTile key={c.key} href={c.self}>
                    <div className={TILE_HEAD_CLASS}>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Icon
                          className={cn('size-3.5 shrink-0', COUNT_ACCENT[c.accent])}
                          strokeWidth={2}
                        />
                        <Typography variant="kpi-label" className="truncate">
                          {c.label}
                        </Typography>
                      </span>
                      {c.self && (
                        <Maximize2 className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                      )}
                    </div>
                    {/* A ratio value brings its own Typography (two tones, and
                        its own links); a plain count still needs the stat face
                        put on it here. */}
                    {typeof c.value === 'string' ? (
                      <Typography variant="kpi-value-sm" className="truncate">
                        {c.value}
                      </Typography>
                    ) : (
                      <div className="truncate">{c.value}</div>
                    )}
                    <Typography variant="helper" className={TILE_FOOT_CLASS}>
                      {c.sub}
                    </Typography>
                  </SummaryTile>
                )
              })}

              {rates.map((r) => {
                const tone = r.rate === null ? null : rateTone(r.rate)
                return (
                  <SummaryTile key={r.key} href={hrefFor(r.key)}>
                    <div className={TILE_HEAD_CLASS}>
                      <Typography variant="kpi-label" className="truncate">
                        {r.label}
                      </Typography>
                      {hrefFor(r.key) && (
                        <Maximize2 className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                      )}
                    </div>
                    <Typography
                      variant="kpi-value-sm"
                      tone={tone === null ? 'muted' : 'inherit'}
                      className={cn('truncate tabular-nums', tone && RATE_TEXT_CLASS[tone])}
                    >
                      {r.value}
                    </Typography>
                    {/* Bar + sub-line travel TOGETHER to the tile's bottom —
                        `mt-auto` on the group, not on the caption, or the bar
                        would float up under the value and break the pairing. */}
                    <div className="mt-auto flex flex-col gap-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        {tone !== null && (
                          <div
                            className={cn('h-full rounded-full', RATE_BAR_CLASS[tone])}
                            /* A rate can exceed 100% (orders needn't descend from
                               leads in the same window) — cap the BAR, not the value. */
                            style={{ width: `${Math.min(r.rate ?? 0, 100)}%` }}
                          />
                        )}
                      </div>
                      <Typography variant="helper" className="truncate">
                        {r.sub}
                      </Typography>
                    </div>
                  </SummaryTile>
                )
              })}

              {/* A duration, not a rate — no 0–100 bar, so it carries an icon
                  like the count tiles instead. */}
              {time && (
                <SummaryTile href={hrefFor(TIME_TILE)}>
                  <div className={TILE_HEAD_CLASS}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" strokeWidth={2} />
                      <Typography variant="kpi-label" className="truncate">
                        {S.leadOrderTime}
                      </Typography>
                    </span>
                    {hrefFor(TIME_TILE) && (
                      <Maximize2 className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                    )}
                  </div>
                  <Typography variant="kpi-value-sm" className="truncate">
                    {time.avg_days === null ? S.noValue : S.days(time.avg_days)}
                  </Typography>
                  <Typography variant="helper" className={TILE_FOOT_CLASS}>
                    {S.avgAcross(time.n)}
                  </Typography>
                </SummaryTile>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

/** `77.50%`, or the placeholder when the denominator was zero. */
function fmtPct(value: number | null, placeholder: string) {
  return value === null ? placeholder : `${value.toFixed(2)}%`
}
