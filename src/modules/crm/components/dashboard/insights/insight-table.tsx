import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { ShimmerBar } from "./InsightShimmer"

// Shared table chrome for the insight drill-through surfaces — the records page
// (`/crm/insights/records/:tile`) and the KPI-tile account breakdown
// (`/crm/insights/tile/:reportType/:slot`).
//
// Extracted from `RecordsTable`, which owned these privately. Both pages are
// reached the same way (a tile, opened in a new tab) and read as the same
// surface, so a second hand-rolled `<table>` beside this one would drift on the
// first styling change — which is exactly what happened before this module
// existed: the tile page shipped right-aligned numeric columns while the
// records table is deliberately left-aligned throughout.
//
// The rules these encode:
//  * Text columns left-aligned; VALUE and COUNT columns right-aligned on
//    tabular figures, matching Top Orders (`TopOrdersTable`) and the periodic
//    breakdowns, which both mark their numeric columns `align: 'right'`. These
//    two pages used to be the only tables in the product left-aligning money.
//  * Identifiers never truncate (`nowrap`); free text does (`max-w` + truncate,
//    §8.7) so a long name cannot widen the row.
//  * Currency is abbreviated (₹1.2Cr) exactly as the summary tiles show it.

// ── Table chrome: the APP's shared table CSS, not a local copy ───────────────
//
// `cpt-tbl` + `cpt-compact` are the same pair every CRM list page hands to
// `CrmDataTable` (Accounts, Leads, Deals, Quotes — see `LeadsListView` et al),
// defined once in `styles/comprint.css`. Adopting them here rather than
// re-declaring sizes in Tailwind is what makes these two drill-through pages
// read as the same product as the list pages they sit beside.
//
// It replaced a local set that had drifted well off the house style: headers at
// 10px/500 with `tracking-wide` against the app's 11px/550 at `0.06em`, body
// text at 14px against 12.5px, and `px-3 first:pl-0 last:pr-0` — which pulled
// the first and last columns flush to the card edge while every other table in
// the app pads all cells equally, so the first column started on a different
// vertical than the rest of the product.
//
// Cell padding, font sizes, header casing/tracking, row hairlines and the hover
// tint all now come from the stylesheet. Keep it that way: a size added back
// here is a size that stops tracking the list pages.

/** OUTER wrapper. `.cpt-compact` is an ancestor selector — it sizes both
 *  `.cpt-tbl` and `.cpt-table-wrap` below it, so it has to sit outside both. */
export const TABLE_WRAP_CLASS = 'cpt-compact'

/** The card SURFACE, and the reason these pages no longer use `<Card>`.
 *
 *  `.cpt-table-wrap` is what holds the table on every CRM list page: card
 *  background, 1px border, 14px radius, `overflow: hidden`, and the three-layer
 *  shadow — with NO padding, because `.cpt-tbl` cells own the inset.
 *
 *  `<Card>` looked equivalent and was not. It ships `py-4` AND `gap-4`, so it
 *  added 16px above the header row, 16px below the pager, and a third 16px
 *  between the table and the pager that no list page has — which is exactly the
 *  spacing that read as inconsistent. It also rounds to 12px against the list
 *  pages' 14px, carries a different shadow, and sets `text-[13px]`, overriding
 *  the 12.5px compact body size. */
export const TABLE_SURFACE_CLASS = 'cpt-table-wrap'
export const TABLE_CLASS = 'cpt-tbl'
/** Sticky header on the page's CARD surface. `.cpt-tbl thead th` already sets
 *  `position: sticky; top: 0`, its own background and the bottom hairline. */
export const THEAD_CLASS = ''
export const HEAD_ROW_CLASS = ''
/** Rows are NOT clickable on either surface — no `cursor-pointer`, so nothing
 *  promises a whole-row target that doesn't exist. The hover tint comes from
 *  `.cpt-tbl tbody tr:hover`: it tracks the eye across a wide row, which is a
 *  reading aid, not an affordance. */
export const BODY_ROW_CLASS = ''

/** Right-aligns a numeric column, header and cells together.
 *
 *  `.cpt-tbl .right` (comprint.css) is the app's own numeric-column class — it
 *  sets `text-align: right` AND `font-variant-numeric: tabular-nums`, and pads
 *  the last column so digits don't sit flush against the card edge. Using it
 *  rather than a Tailwind `text-right` is what keeps these columns identical to
 *  Top Orders and the periodic breakdowns, which right-align the same way. */
export const NUM_COL = 'right'

/** Column header. Casing, size, weight, tracking, colour and padding are all
 *  `.cpt-tbl thead th` — no local type here, so it cannot drift from the list
 *  pages again. Pass `align="right"` for a value/count column so the header
 *  sits over its digits. */
export function Th({
  label,
  className,
  align,
}: {
  label: string
  className?: string
  align?: 'left' | 'right'
}) {
  return <th className={cn(align === 'right' && NUM_COL, className)}>{label}</th>
}

/** Entity-reference cell — the record's NAME (never its UUID), linked to the
 *  detail page. Shown in full: identifiers are bounded-length and must never
 *  truncate.
 *
 *  Opens in a NEW TAB, matching how the tile opened the page it sits on: the
 *  list is a reading surface answering "what is behind that number", and
 *  inspecting one row must not take the list away — the user typically opens
 *  several in turn and expects the list still there behind them.
 *
 *  A real anchor (not a click handler) is what makes that honest: the new tab is
 *  the browser's own, so ctrl/middle-click, "open in new window" and copy-link
 *  all behave as expected. `rel="noopener noreferrer"` because any
 *  `target="_blank"` link must not hand the opener to the new document.
 *
 *  KNOWN AND ACCEPTED: a new tab starts with no session history, so the
 *  browser's Back button is inert on the page this opens. Keeping the list
 *  behind you is the trade being made — the way back is the other tab, not
 *  Back. Do not "fix" that by dropping `target` without raising it first. */
// Cells carry NO font-size of their own — `.cpt-tbl` owns type and padding, the
// same way `CrmTableGrid` renders bare `<td>`s and lets the stylesheet size
// them. Only colour, weight and wrapping are set here, all via semantic tokens
// (§8.5). Re-introducing a `Typography` variant would re-introduce a size and
// put these pages back out of step with the list pages.
export function RefTd({ text, href }: { text: string; href: string }) {
  return (
    <td>
      <Link
        to={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium whitespace-nowrap text-primary hover:underline"
      >
        {text}
      </Link>
    </td>
  )
}

/** Secondary text cell — muted, truncating (max-width + truncate; §8.7). */
export function TextTd({ text, nowrap }: { text: string; nowrap?: boolean }) {
  return (
    <td className="max-w-[13rem]">
      <span
        className={cn(
          'block text-muted-foreground',
          nowrap ? 'whitespace-nowrap' : 'truncate',
        )}
      >
        {text}
      </span>
    </td>
  )
}

/** Numeric cell — currency abbreviated (₹1.2Cr / ₹45L) like the summary tiles,
 *  emphasised and RIGHT-aligned so digits line up on the decimal the way they
 *  do on Top Orders and the periodic breakdowns. (`.right` brings tabular
 *  figures with it, so the local `tabular-nums` is gone.) */
export function NumTd({ text }: { text: string }) {
  return (
    <td className={NUM_COL}>
      <span className="font-medium whitespace-nowrap">{text}</span>
    </td>
  )
}

/** Escape hatch for a cell that renders a component rather than a value — the
 *  Closed By column's `OverflowPillList`. Keeps the gutters and row rhythm
 *  identical to the text cells beside it. */
export function NodeTd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={className}>{children}</td>
}

// ── Shared panel states ───────────────────────────────────────────────────
//
// The loading and error panels BOTH drill-through surfaces render. They live
// here for the same reason the cells do: the two pages read as one surface, so
// a locally hand-rolled skeleton drifts on the first spacing change.
//
// They also have to live outside a page file. The layout lint rule (§10) flags
// any padded root returned from a page module — correctly, since it cannot tell
// a page root from an inner panel — and these are inner panels with genuine
// padding of their own.

/** Six full-width bars — the row rhythm of the table they stand in for, so
 *  nothing shifts when the real rows land. */
export function TableLoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <ShimmerBar key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

/** Centred error panel. Routes through `LoadErrorState`, NOT a bare message: an
 *  out-of-scope `user_ids` on an inherited slice is a 403, which must read as
 *  "no access" rather than "failed to load". */
export function TableErrorPanel({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center p-5">
      <LoadErrorState error={error} fallback={fallback} compact />
    </div>
  )
}
