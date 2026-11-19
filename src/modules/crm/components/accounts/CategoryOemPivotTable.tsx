import { formatINRShort } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"

import type { CategoryOemPivot } from "../../api/dashboard"
import { PivotMiniScrollbar } from "../shared/PivotMiniScrollbar"
import { usePivotScroll } from "../shared/pivot-scroll"
import { ACCOUNTS_STRINGS } from "./accounts.strings"

// A pure pivot renderer. Positional row/column ordering AS RETURNED by the
// backend is respected exactly — the service pre-sorts rows and columns by
// their totals DESC, so any client-side re-sort would break the axis→cell
// alignment and the total row / total column.
//
// ── Borderless on purpose ─────────────────────────────────────────────────
// No surrounding box, no zebra, no vertical rules: the pivot already sits
// inside `<InsightWidget>`'s card, and a second bordered surface inside that
// one reads as a frame around a frame. Structure comes from row hairlines and
// from the type hierarchy alone — small uppercase muted labels on both axes,
// the data itself a size up and in full-strength foreground. The eye then
// picks out the numbers rather than the chrome.
//
// ── Empty cells carry no ink ──────────────────────────────────────────────
// This matrix is empty by nature (on real data, 48 live cells out of 255).
// Rendering every gap as "₹0" put a full-width money token in ~85% of the
// grid: it buried the handful of numbers that matter AND set each column's
// width, since a column is as wide as its widest cell — which was most of the
// horizontal scroll. A faint em-dash reads as "nothing here" and lets the
// column shrink to the values that ARE present.
//
// ── Sizing ────────────────────────────────────────────────────────────────
// Data sits at `body` / `body-strong` (14px), labels at `badge` (10px). An
// earlier pass used `body-lg` (16px) with `py-3`: it read fine on the 2x2
// reference but every extra pixel of cell padding and glyph width multiplies
// by the column count, and on real data (17 categories x 15 brands) that was
// a large part of the horizontal scroll. 14px keeps the two-level hierarchy
// while costing far less width per column.
//
// ── The frozen category column ────────────────────────────────────────────
// The category name says what a row IS; once it scrolls away every cell in
// that row is an anonymous number. It is `sticky left-0` so the brand columns
// pan underneath it.
//
// Three things must hold or the freeze breaks silently:
//   1. ONE scrolling ancestor — the wrapper below. (Part of why this renders a
//      bare <table>: the shadcn primitive supplies a second one of its own.)
//   2. An OPAQUE background on the frozen cells. A <tr> has no background by
//      default, so without one the scrolled numbers read straight through the
//      category names. `ROW` gives every row a solid fill in BOTH rest and
//      hover states — a half-alpha hover (the shadcn default is
//      `bg-muted/50`) is exactly what made this see-through last time.
//      The cells take it via `bg-inherit`, so the frozen column still
//      highlights with its row instead of being the one cell that never does.
//   3. The edge drawn with an inset BOX-SHADOW, never `border-r`. Tailwind's
//      preflight sets `border-collapse: collapse`, and a collapsed border is
//      painted by the TABLE at the table's coordinates — so it does not travel
//      with a sticky cell and slides out of view on the first scroll. A
//      box-shadow is painted by the element itself and stays pinned.
//
// The shadcn `<Table>` primitive is likewise not used — it is tuned for a
// page-width list (`h-10` rows, `p-2` cells, `text-sm`), every value of which
// multiplies by the column count here, and it ships its own `overflow-x-auto`
// so pairing it with one gives two nested scrollers.

const S = ACCOUNTS_STRINGS.detail.threeSixty

/** Shared cell rhythm. `whitespace-nowrap` so a money token never wraps mid
 *  value; the horizontal scroller is what handles a wide matrix. */
const CELL = "whitespace-nowrap px-2.5 py-2 first:pl-0 last:pr-0"
const NUM = "text-right tabular-nums"

// Weight note: the shared dashboard table roles — category names are
// `table-name`, interior cells plain `table-cell`, and the row / column / grand
// TOTALS `table-figure` (the darkest text), the same pairing as the Sales Team
// table's name and Revenue columns.

/** The category column stays put while the brand columns pan under it.
 *
 *  NO visible edge. It used to draw an inset box-shadow as a divider, but that
 *  put a hard vertical rule down a table that has no other vertical rules, and
 *  it showed even when the table fits and nothing is scrolling — which is most
 *  accounts. The opaque `bg-inherit` fill is what actually does the work: the
 *  scrolled figures pass behind the category names instead of through them.
 *
 *  (If a divider is wanted back, it has to be a box-shadow, never `border-r` —
 *  Tailwind's preflight sets `border-collapse: collapse`, and a collapsed
 *  border is painted by the TABLE at the table's coordinates, so it does not
 *  travel with a sticky cell.) */
const FROZEN = "cpt-pivot-frozen sticky left-0 bg-inherit"

/** Opaque fill for every row the frozen column runs through — see note 2.
 *  Header and totals band use this one: they are chrome, so they take the
 *  fill but NOT a hover state. */
const ROW = "bg-card"

/** Body rows add the hover. `.cpt-pivot-row` (comprint.css) — a real CSS rule
 *  rather than a Tailwind arbitrary value, because the fill has to be OPAQUE
 *  for the frozen column and a `color-mix()` arbitrary value is exactly the
 *  kind of class (commas, parens, nested var()) that silently fails to
 *  generate. The stylesheet also owns the transition, so the hover animates. */
const ROW_HOVER = "cpt-pivot-row"

/** Money for a pivot CELL — every value in at most ~6 characters.
 *
 *  `formatINRShort` abbreviates at ₹1L and ₹1Cr but falls through to the full
 *  comma form below a lakh, so a single "₹89,390" is nearly twice the width of
 *  the "₹7.8L" figures around it — and since a column is as wide as its widest
 *  cell, one such value stretches a whole column of the matrix. Extending the
 *  magnitude suffix down to thousands keeps every cell the same order of width.
 *
 *  Local to the pivot on purpose: `formatINRShort` is shared by the KPI tiles
 *  and the charts, where the exact sub-lakh figure is the point. Here the grid
 *  is scanned for shape, and the precise number is one hover away in the
 *  ranked cards beside it.
 *
 *  Thousands keep ONE decimal — a whole-K round showed ₹1,800 as "₹2K" and
 *  ₹1,300 as "₹1K". Rounding to the nearest ₹100 gives ₹1,890 → "₹1.9K" and
 *  ₹1,989 → "₹2K"; number-to-string drops a ".0" on its own. */
function pivotMoney(value: number): string {
  if (Math.abs(value) >= 100_000) return formatINRShort(value)
  if (Math.abs(value) >= 1_000) return `₹${Math.round(value / 100) / 10}K`
  return `₹${Math.round(value)}`
}

interface CategoryOemPivotTableProps {
  pivot: CategoryOemPivot
  /** Optional label above the matrix. Omitted (empty) by default — the host
   *  card's own title already names the table. */
  sectionLabel?: string
  /** A category row / brand header drills into that value — the same handler
   *  the host card's Top Category / Top Brand tiles use, so a row click means
   *  whatever the tile click means on that mount (filter the board in place,
   *  filter the detail page, filter the 360° tab). Omit it and the matrix is
   *  read-only. The "No OEM" column has no entity to filter by and stays inert. */
  onDrillIn?: (facet: "category" | "oem", value: { id: string; label: string }) => void
}

export function CategoryOemPivotTable({
  pivot,
  sectionLabel = S.pivotSectionLabel,
  onDrillIn,
}: CategoryOemPivotTableProps) {
  const { ref: scrollRef, edges, thumb, measure } = usePivotScroll<HTMLDivElement>()

  return (
    <div className="min-w-0 space-y-2">
      {/* Section label — the dashboard `eyebrow` (dark, 650), a step ABOVE the
          `table-header` axis labels below it: it heads the block, the axis
          labels sit inside it. A span, not the variant's default <h2>, so it
          doesn't outrank the card's own title in the heading outline. */}
      {sectionLabel ? (
        <Typography variant="eyebrow" asChild>
          <span className="block">{sectionLabel}</span>
        </Typography>
      ) : null}

      {/* The single scroll container.
          `min-w-0` lets it actually become narrower than its content — without
          it a flex/grid ancestor holds it at content width and the scroller
          never engages (§8.7).
          `no-scrollbar` (styles/index.css) hides the full-width native bar,
          not the scrolling: trackpad, shift-wheel and keyboard still pan the
          matrix. The slim <MiniScrollbar> below stands in for it. */}
      <div className="cpt-pivot-scroll min-w-0">
        <div
          ref={scrollRef}
          onScroll={measure}
          className="cpt-pivot-snap no-scrollbar min-w-0 overflow-x-auto"
          // Snap points land just right of the frozen category column, so the
          // first visible brand column is always whole — never "PPLE" / "8Cr".
          style={{ scrollPaddingLeft: thumb.inset }}
        >
          {/* `data-scrolled` drives the frozen column's edge (comprint.css):
              it appears only once columns have actually slid underneath it,
              so a table that fits shows no vertical rule at all. */}
          <table className="cpt-pivot w-full" data-scrolled={edges.left}>
            <thead>
              <tr className={cn(ROW, "border-b border-border")}>
                <th className={cn(CELL, FROZEN, "z-20 text-left font-normal")}>
                  <Label>{S.pivotCornerHeader}</Label>
                </th>
                {pivot.columns.map((col) => {
                  const oemId = col.oem_id
                  // stopPropagation on both handlers below is load-bearing: a
                  // <th>/<tr> is not in the host card's click ignore-list, so
                  // without it the click bubbles to `InsightWidget` and its own
                  // unfiltered `detailHref` navigation overwrites this one.
                  const drill =
                    onDrillIn && oemId
                      ? (e: React.MouseEvent) => {
                          e.stopPropagation()
                          onDrillIn("oem", { id: oemId, label: col.oem_name })
                        }
                      : undefined
                  return (
                    <th
                      key={oemKey(col.oem_id)}
                      onClick={drill}
                      className={cn(CELL, NUM, "font-normal", drill && "cursor-pointer hover:bg-accent/60")}
                    >
                      <Label>{col.oem_name}</Label>
                    </th>
                  )
                })}
                {/* Same label treatment as every other header — one colour per
                    role across the dashboard. The totals below it carry the
                    emphasis instead. */}
                <th className={cn(CELL, NUM, "font-normal")}>
                  <Label>{S.pivotRowTotal}</Label>
                </th>
              </tr>
            </thead>

            <tbody>
              {pivot.rows.map((row, i) => (
                <tr
                  key={row.category_id}
                  onClick={
                    onDrillIn
                      ? (e) => {
                          e.stopPropagation()
                          onDrillIn("category", { id: row.category_id, label: row.category_name })
                        }
                      : undefined
                  }
                  className={cn(ROW_HOVER, "border-b border-border/50", onDrillIn && "cursor-pointer")}
                >
                  <td className={cn(CELL, FROZEN, "z-10")}>
                    <Typography variant="table-name" asChild>
                      <span className="block max-w-[13rem] truncate" title={row.category_name}>
                        {row.category_name}
                      </span>
                    </Typography>
                  </td>
                  {pivot.columns.map((col, j) => {
                    // Zero cells arrive as `value_closed: 0`, so this is a value
                    // check, not a null check.
                    const value = pivot.cells[i]?.[j]?.value_closed ?? 0
                    return (
                      <td key={oemKey(col.oem_id)} className={cn(CELL, NUM)}>
                        {value === 0 ? (
                          <Typography variant="table-cell" tone="muted" className="opacity-45">
                            {S.pivotZeroCell}
                          </Typography>
                        ) : (
                          <Typography variant="table-cell" numeric>
                            {pivotMoney(value)}
                          </Typography>
                        )}
                      </td>
                    )
                  })}
                  <td className={cn(CELL, NUM)}>
                    <Typography variant="table-figure">
                      {pivotMoney(row.total.value_closed)}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* A <tfoot>, not one more <tr>: this band summarises the rows rather
                than being another row of data, and the element says so to
                assistive tech as well as to the eye. Its LABEL stays a muted
                micro-label — it is an axis label like the headers, not a category
                — while its figures match the data rows' weight. */}
            <tfoot>
              {/* No `border-b` here. `TablePagination` below draws its own
                  `border-t`, and the two together rendered as a double rule with
                  a 12px gap under the totals band. The pager's rule closes the
                  table. */}
              <tr className={ROW}>
                <td className={cn(CELL, FROZEN, "z-10")}>
                  <Label>{S.pivotColumnTotal}</Label>
                </td>
                {pivot.columns.map((col) => (
                  <td key={oemKey(col.oem_id)} className={cn(CELL, NUM)}>
                    <Typography variant="table-figure">
                      {pivotMoney(col.total.value_closed)}
                    </Typography>
                  </td>
                ))}
                <td className={cn(CELL, NUM)}>
                  <Typography variant="table-figure">
                    {pivotMoney(pivot.grand_total.value_closed)}
                  </Typography>
                </td>
              </tr>
            </tfoot>
            </table>
          </div>
          {/* Trailing fade — "there is more this way". Sits OUTSIDE the
              scroller so it stays pinned to the card edge instead of
              scrolling away with the content; `pointer-events: none` keeps
              it from swallowing clicks or wheel events. */}
          <span className="cpt-pivot-fade cpt-pivot-fade-right" data-on={edges.right} />
          {/* The frozen column's divider — ONE line spanning the whole table,
              not a per-cell edge, so it never breaks at the row hairlines. */}
          <span
            className="cpt-pivot-divider"
            data-on={edges.left}
            style={{ left: thumb.inset - 1 }}
          />
        </div>

      {/* Only when the matrix actually overflows. */}
      {thumb.size < 1 ? (
        <PivotMiniScrollbar scrollRef={scrollRef} thumb={thumb} />
      ) : null}
    </div>
  )
}

/** Axis label — the dashboard `table-header` role, used on both the column
 *  heads and the totals row, so every label on the pivot reads at one level and
 *  the data reads at another. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="table-header" className="block truncate">
      {children}
    </Typography>
  )
}

/**
 * Column key that survives the "No OEM" bucket. `null` cannot be a React key,
 * so we swap it for a sentinel — the pivot only ever has one such column, so
 * a collision-free constant is enough.
 */
function oemKey(oemId: string | null): string {
  return oemId ?? "__no_oem__"
}
