import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import type { FacetValue, RevFilters } from '../../../data/insights/records'
import { monthTokenToLabel } from '../../../data/insights/month-facet'
import { FIELD_LABEL } from './facet-options'
import { INSIGHT_FACETS, isRegistryFacet, type InsightFacetSource } from './insights.facets'
import { InsightFacet } from './InsightFacet'
import type { InsightFilterField } from './insights.registry'
import { INSIGHTS_STRINGS } from './insights.strings'

// THE filter toolbar for the insight board — used by BOTH the dashboard and the
// drill-through detail page.
//
// One component on purpose. The detail page used to render a second, unrelated
// bar (`InsightFilterBar`: stacked labels, a chips row, its own Month select),
// so the same filters looked and sat differently either side of a drill-through
// and every facet fix had to be made twice. The dashboard's compact strip is
// the canonical one; the detail page adopts it.
//
// A card holding one grouped control: a sliders icon, then the metric's facets
// separated by hairline dividers, and a Clear button carrying the active count.
//
// FILTERS ONLY. Scope (My/Team) and the period both live in the page header,
// above — they frame the board rather than narrow it, and crowding them in here
// wrapped the facet row onto a second line as soon as a custom range added two
// more controls.
//
// `Rep` only appears when the scope holds more than one owner — filtering by
// rep is meaningless on a single-rep board (My View), so the pages drop it.
//
// Not ported from the reference's toolbar: the saved-Views popover and the tile
// show/hide picker. Both are separate features with their own storage; they are
// not filters, and neither was asked for.

// Chrome only — a compact borderless pill so several facets fit one row. All
// behaviour comes from the shared registry.
const PILL =
  'h-8 w-auto min-w-[104px] border-transparent bg-transparent px-2 shadow-none hover:bg-background/70'

// The point past which the Month list stops being scannable at a glance — a
// window wider than one year, i.e. a multi-year custom range.
const MONTHS_IN_YEAR = 12

// Width reserved at the end of a collapsed line for the "+N" counter, so the
// last chip never collides with it. Wide enough for "+999".
const COUNTER_RESERVE_PX = 56

interface FilteredByRowProps {
  field: InsightFilterField
  values: FacetValue[]
  onRemove: (val: FacetValue) => void
}

/** One field's active values on a SINGLE line: as many chips as physically fit
 *  the row's width (minus a reserve for the counter), then "+N" rendered
 *  IN-FLOW, directly after the last visible chip — never pinned to the card
 *  edge. Clicking +N expands the row to every chip with "Show less" sitting
 *  after the final chip. Width-aware: an invisible measurement copy of the
 *  full chip set (at the row's real width) tells how many land on line one,
 *  and a ResizeObserver keeps the count honest on resize. */
function FilteredByRow({ field, values, onRemove }: FilteredByRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [fitCount, setFitCount] = useState(values.length)
  const measureRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const measure = () => {
      const chips = Array.from(el.children) as HTMLElement[]
      if (chips.length === 0) {
        setFitCount(0)
        return
      }
      const firstLineTop = chips[0].offsetTop
      // Chips the browser laid out on line one at this width…
      let k = chips.filter((c) => c.offsetTop === firstLineTop).length
      // …and if any overflowed, walk back until the last kept chip leaves
      // room for the "+N" counter (always keep at least one).
      if (k < chips.length) {
        const width = el.clientWidth
        while (k > 1) {
          const last = chips[k - 1]
          if (last.offsetLeft + last.offsetWidth > width - COUNTER_RESERVE_PX) k -= 1
          else break
        }
      }
      setFitCount(k)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [values])

  const hidden = values.length - fitCount
  const shown = expanded ? values : values.slice(0, fitCount)

  const chip = (val: FacetValue) => (
    <Typography key={val.id} variant="helper" asChild>
      <span className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-primary/20 bg-primary/10 py-0.5 pr-0.5 pl-2 font-medium text-primary">
        {/* min-w-0 + truncate so one absurdly long account name shortens
            instead of pushing the card wide (§8.7). */}
        <span className="min-w-0 truncate">{val.label}</span>
        <button
          type="button"
          onClick={() => onRemove(val)}
          aria-label={INSIGHTS_STRINGS.detail.removeFilter(FIELD_LABEL[field], val.label)}
          // A bare glyph was a ~10px target with no hover feedback; give
          // the × its own padded, tinted hit area.
          className="shrink-0 rounded-sm p-0.5 transition-colors hover:bg-primary/20"
        >
          <X className="size-3" />
        </button>
      </span>
    </Typography>
  )

  return (
    <div className="flex items-start gap-2">
      <Typography variant="helper" tone="muted" asChild>
        <span className="w-20 shrink-0 truncate pt-1">{FIELD_LABEL[field]}</span>
      </Typography>
      <div className="relative min-w-0 flex-1">
        {/* Invisible measurement copy — the FULL chip set laid out at the row's
            real width. `visibility: hidden` keeps it out of the tab order and
            `absolute` out of the row's height; it only exists to be measured. */}
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap items-center gap-1"
        >
          {values.map(chip)}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {shown.map(chip)}
          {(hidden > 0 || expanded) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 px-1.5 py-0.5 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              <Typography variant="helper" asChild>
                <span>
                  {expanded
                    ? INSIGHTS_STRINGS.detail.showLess
                    : INSIGHTS_STRINGS.detail.moreCount(hidden)}
                </span>
              </Typography>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface InsightsToolbarProps {
  filters: RevFilters
  onChange: (f: RevFilters) => void
  /** Facets to show. `owner` is dropped for a single-rep scope. */
  fields: InsightFilterField[]
  /** The `YYYY-MM` tokens the board's period window covers, chronological —
   *  the `month` facet's options, which are window-derived rather than
   *  API-backed. Build with `monthTokensForWindow(period, from, to)`. Omit on
   *  boards that don't offer `month`. */
  monthOptions?: string[]
  /** The period selector (`InsightPeriodControl`), rendered inside the filter
   *  row — on the RIGHT, side by side with the facets (justify-between) from
   *  lg up; on its own right-aligned row ABOVE the facets on smaller screens. */
  period?: React.ReactNode
}

export function InsightsToolbar({
  filters,
  onChange,
  fields,
  monthOptions,
  period,
}: InsightsToolbarProps) {
  // Every facet — month included now — is a `FacetValue[]`, so the count is a
  // plain sum of selection lengths.
  const activeCount = fields.reduce((n, k) => n + (filters[k]?.length ?? 0), 0)

  // Month's options are the buckets of the PERIOD WINDOW, and nothing else.
  // `monthOptions` is already that window expanded into `YYYY-MM` tokens by
  // `monthTokensForWindow`, so a custom range spanning 2024–2025 offers all 24
  // of its months — each labelled with its own year ("Mar 2025"), so a
  // cross-year multi-select is unambiguous both on screen and on the wire.
  //
  // They must NOT be narrowed by the other filters, which is what they used to
  // be (`facetOptions(allRecords, filters, 'month')`). Faceting worked by
  // matching the seeded demo records on LABEL, but Category / OEM / Rep /
  // Account are live API facets now: picking "Dell Technologies" or a real rep
  // yields a label no mock record carries, every record drops out, and Month
  // collapsed to "No matches" the moment you drilled in with a filter set.
  // Condition and Type hid the bug — their labels happen to match the mock
  // vocabulary.
  //
  // Nor is narrowing wanted on its own terms: month goes to the wire as the
  // repeated `months` param while the facets go as their own, and the BACKEND
  // intersects them. The client has no business pre-narrowing one by the other.
  //
  // Window order, not `.sort()` — a lexical sort of "Jan 2026" would list
  // Apr, Aug, Dec… Each option carries the wire token as its id and the display
  // "Jan 2026" as its name, so a pick sends the right `months` param while the
  // chip still reads a human month.
  const monthSource: InsightFacetSource | null = useMemo(() => {
    if (!monthOptions) return null
    const items = monthOptions.map((id) => ({ id, name: monthTokenToLabel(id) }))
    return {
      label: INSIGHTS_STRINGS.facets.month,
      useOptions: makeStaticAsyncOptions(items, (i) => i.name),
      toLabel: (i: { name: string }) => i.name,
    }
  }, [monthOptions])

  // The chips read LABELS ("Dell"); the facets and the query carry ids. Every
  // facet — month included — is now a `FacetValue[]`, so there is no special
  // case here.
  const valuesOf = (f: InsightFilterField): FacetValue[] => filters[f] ?? []

  const active = fields.filter((f) => valuesOf(f).length > 0)

  const removeValue = (f: InsightFilterField, val: FacetValue) => {
    const next = valuesOf(f).filter((x) => x.id !== val.id)
    onChange({ ...filters, [f]: next.length ? next : undefined })
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5">
      {/* Responsive layout: SIDE BY SIDE from lg up — facets left, period right,
          justify-between. STACKED below lg — the period row on TOP
          (col-reverse; the period is the LAST DOM child so the lg row keeps it
          on the right), then the facets covering the full width underneath,
          spread across the line rather than packed left. */}
      {/* `lg:items-start`, NOT items-center: when many active facets wrap the
          left group onto a second line, centering sank the period cluster into
          the middle of the two lines — the date input floated down. Top-aligned,
          it stays level with the FIRST facet row (both are h-8 controls). */}
      <div className="flex flex-col-reverse gap-1 rounded-lg border border-border/50 bg-muted/25 px-1.5 py-1 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1 max-lg:justify-between">
          {fields.map((key, i) => {
            // Month renders through the SAME facet component as everything else —
            // it just sources its options from the period window. It used to be
            // a bare <Select>, which brought its own height, chevron and
            // clear-X and so sat visibly apart from the pills either side of it.
            //
            // Search is on only once the window outgrows a year. Over twelve
            // months it is a control with nothing to do; over a multi-year
            // custom range it is the difference between picking "Mar 2024" and
            // scrolling for it.
            const control =
              key === 'month' ? (
                monthSource ? (
                  <InsightFacet
                    source={monthSource}
                    value={filters.month ?? []}
                    onChange={(v) => onChange({ ...filters, month: v.length ? v : undefined })}
                    className={PILL}
                    searchable={(monthOptions?.length ?? 0) > MONTHS_IN_YEAR}
                  />
                ) : null
              ) : isRegistryFacet(key) ? (
                <InsightFacet
                  source={INSIGHT_FACETS[key]}
                  value={filters[key] ?? []}
                  onChange={(v) => onChange({ ...filters, [key]: v.length ? v : undefined })}
                  className={PILL}
                />
              ) : null

            if (!control) return null

            return (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && <span className="h-5 w-px shrink-0 bg-border/60" aria-hidden />}
                {control}
              </span>
            )
          })}
        </div>
        {/* The period alone on the right (Clear lives on the "Filtered by:"
            line below). `justify-end` keeps it right-aligned when it becomes
            the TOP row of the stacked (below-lg) layout. */}
        <div className="flex items-center justify-end gap-1 lg:shrink-0">{period}</div>
      </div>

      {/* "Filtered by:" — the active slice spelled out, each value removable.
          The pills above show only a COUNT badge ("Condition ②"), so without
          this row the board states how many filters are on but never which:
          you'd have to open each dropdown to find out what you're looking at.

          Values are GROUPED under their field, so the field name is written
          once. Repeating it per chip ("Condition: New", "Condition: Refurbished")
          put the least informative word first on every chip and buried the part
          that actually differs. */}
      {active.length > 0 && (
        <div className="flex flex-col gap-1.5 px-0.5">
          {/* Label left, Clear right — Clear sits on the "Filtered by:" line
              (justify-between), next to the chips it wipes, not up in the
              facet/period row. */}
          <div className="flex items-center justify-between">
            <Typography variant="helper" tone="muted">
              {INSIGHTS_STRINGS.detail.filteredBy}
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 text-muted-foreground"
              onClick={() => onChange({})}
            >
              <X className="size-3.5" />
              <Typography variant="helper" asChild>
                <span>
                  {activeCount > 1
                    ? INSIGHTS_STRINGS.detail.clearCount(activeCount)
                    : INSIGHTS_STRINGS.detail.clear}
                </span>
              </Typography>
            </Button>
          </div>
          {/* One ROW per field: a fixed label column, then a wrapping column of
              chips. The values used to sit in the same single-line flex row as
              every other field, so a wide selection (87 categories) squeezed
              every chip to zero width — labels vanished, only the × glyphs were
              left, and the row still blew past the card. Chips now wrap under
              their own field and keep their intrinsic width. */}
          {active.map((f) => (
            <FilteredByRow
              key={f}
              field={f}
              values={valuesOf(f)}
              onRemove={(val) => removeValue(f, val)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
