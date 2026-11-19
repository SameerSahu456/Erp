import { useMemo, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Typography } from '@/components/ui/typography'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { useDebounce, useInfiniteDropdownLoader } from '@/shared/hooks'
import { UI } from '@/shared/constants'
import { cn } from '@/lib/utils'

import type { FacetValue } from '../../../data/insights/records'
import type { InsightFacetSource } from './insights.facets'
import { INSIGHTS_STRINGS } from './insights.strings'

// ONE facet control, used by BOTH filter bars — static and API-backed facets
// alike (see `insights.facets.ts`).
//
// Keeps the compact facet chrome (label + count badge + chevron) and reuses the
// same async ENGINE as the app's other pickers: the option hooks, `useDebounce`
// + `UI.DEBOUNCE_SEARCH_MS` so search hits the API, and
// `useInfiniteDropdownLoader` — the shared scroll/wheel/IntersectionObserver
// loader that `AsyncMultiSelect` and `AsyncSelect` are themselves built on.
//
// It deliberately does NOT render `AsyncMultiSelect`: that owns its trigger (a
// full-width input showing "N options selected" + a clear-X), so dropping it in
// changed how the filter looked. Reusing the engine rather than the component
// keeps both bars' chrome intact with one shared implementation.
//
// VALUE SHAPE — labels, not ids: `?category=Servers`, because Phase-1 records
// carry names and no entity ids. Phase 2 flips to UUIDs (`category_ids` etc.).

interface InsightFacetProps {
  /** Where the options come from. Page facets pass `INSIGHT_FACETS[field]`; the
   *  Sales Team widget passes `ROLE_FACET`, which is not a page filter. */
  source: InsightFacetSource
  value: FacetValue[]
  onChange: (next: FacetValue[]) => void
  /** Chrome only — height/border for the host bar. */
  className?: string
  align?: 'start' | 'center' | 'end'
  /** Overrides the trigger's text. The default is the facet-pill chrome — the
   *  facet's name plus a count badge. The Sales Team role dropdown instead
   *  reads as a plain select showing the CURRENT SELECTION, matching the
   *  reference's `<select>`. */
  triggerLabel?: (value: FacetValue[]) => string
  /** Pick-one mode: a new pick REPLACES the selection and closes the popover,
   *  and picking the current value clears it. `Month` uses this — it is a
   *  period bucket, and two months at once is not a window this board can ask
   *  either endpoint for. Everything else stays multi-select. */
  single?: boolean
  /** Set false for a short, fixed list. The search box exists to page an API
   *  facet down to something findable; over the handful of months in the period
   *  window it is a control with nothing to do. */
  searchable?: boolean
  /** Label for a leading "clear the filter" row (e.g. "All roles"). Opt-in:
   *  without it the only way out of a `single` selection is re-picking the
   *  selected row, which is invisible to the user. Facets whose empty state is
   *  already obvious can leave it off. */
  allOption?: string
  /** Meta column for the "All" row — the same right-aligned slot the options
   *  fill via `toMeta`, so the totals line up under each other. */
  allOptionMeta?: string
}

export function InsightFacet({
  source: facet,
  value,
  onChange,
  className,
  align = 'start',
  triggerLabel,
  single = false,
  searchable = true,
  allOption,
  allOptionMeta,
}: InsightFacetProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState('')
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Gate on `open` so six facets don't fire six queries on every page load.
  const query = facet.useOptions(search, { enabled: open })
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p: { items: unknown[] }) => p.items),
    [data?.pages],
  )

  // Callback-ref state (not useRef) so the loader's effects re-run once the
  // portaled popover content actually mounts — a plain ref freezes on null.
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: items.length,
  })

  const count = value.length
  // Match on id: two entities can share a display name, and the API filters by
  // id anyway.
  const selected = useMemo(() => new Set(value.map((v) => v.id)), [value])
  const toggle = (next: FacetValue) => {
    const isOn = selected.has(next.id)
    if (single) {
      onChange(isOn ? [] : [next])
      // Nothing more to pick — leaving it open reads as "choose several".
      setOpen(false)
      return
    }
    onChange(isOn ? value.filter((v) => v.id !== next.id) : [...value, next])
  }

  const S = INSIGHTS_STRINGS.facets

  // "All" is a way OUT of a selection — with no options to choose from and
  // nothing chosen, it filters nothing and the dropdown reads as a one-item
  // menu that does nothing. Keep it only while a selection exists (it is then
  // the sole way back to the unfiltered view); otherwise the empty message
  // stands alone and says what is actually true: there is nothing to pick.
  const showAllOption = allOption !== undefined && (items.length > 0 || count > 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={count ? `${facet.label}: ${S.selected(count)}` : S.all(facet.label)}
            className={cn(
              'flex h-8 items-center gap-1 rounded-md border border-border px-2 transition-colors hover:bg-muted/60',
              count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <Typography variant="helper" asChild>
          <span className="truncate">{triggerLabel ? triggerLabel(value) : facet.label}</span>
        </Typography>
        {/* The count rides as a badge only in the pill chrome — a select-style
            trigger already says what is picked. */}
        {!triggerLabel && count > 0 && (
          <Typography variant="badge" asChild>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-primary-foreground">
              {count}
            </span>
          </Typography>
        )}
        {/* Flip the chevron up while the popover is open (down when closed),
            like a native select. */}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 opacity-50 transition-transform',
            open && 'rotate-180',
          )}
        />
      </PopoverTrigger>

      {/* `z-40`: this dropdown is `position: fixed`, so when the page scrolls it
          travels with its trigger. At the default `z-50` it painted OVER the
          sticky app header (also `z-50`, and the popup is mounted later);
          one layer lower it slides under the header like the rest of the page. */}
      <PopoverContent align={align} className="w-56 p-0" positionerClassName="z-40">
        {searchable && (
          <div className="relative border-b border-border p-2">
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder={S.searchPlaceholder}
              maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
              aria-label={S.searchPlaceholder}
              className="h-8 pr-8"
              autoFocus
            />
            {rawSearch && (
              <button
                type="button"
                aria-label={S.clearSearch}
                // Keep focus in the input when clearing.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRawSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <div
          ref={setScrollerNode}
          onScroll={onScroll}
          onWheel={onWheel}
          className="max-h-64 overflow-y-auto overflow-x-hidden p-1"
        >
          {isLoading && items.length === 0 ? (
            <Typography variant="helper" tone="muted" asChild>
              <p className="px-2 py-6 text-center">{S.loading}</p>
            </Typography>
          ) : isError ? (
            // A 403 must read as "you don't have permission", not "failed to
            // load" — LoadErrorState renders NoAccess for a forbidden error.
            <LoadErrorState error={error} fallback={S.loadError} compact />
          ) : items.length === 0 && !showAllOption ? (
            <Typography variant="helper" tone="muted" asChild>
              <p className="px-2 py-6 text-center">{S.noMatches}</p>
            </Typography>
          ) : (
            <>
              {/* The explicit "clear" row. A `single` facet otherwise only
                  clears by re-picking the row that is already selected, which
                  nothing on screen tells you — so once a role was chosen the
                  unfiltered view looked unreachable.
                  Its meta is the TOTAL number of rows the report holds — one
                  row per user — so the column reads consistently top to
                  bottom: every line says "how many users this pick gives
                  you". */}
              {showAllOption && (
                <button
                  type="button"
                  role={single ? 'option' : 'checkbox'}
                  aria-selected={single ? count === 0 : undefined}
                  aria-checked={single ? undefined : count === 0}
                  onClick={() => {
                    onChange([])
                    if (single) setOpen(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  {!single && <span className="mt-px size-4 shrink-0" />}
                  <Typography variant="helper" className="min-w-0 flex-1">
                    {allOption}
                  </Typography>
                  {allOptionMeta !== undefined && (
                    <Typography variant="helper" tone="muted" asChild>
                      <span className="mt-px shrink-0 tabular-nums">{allOptionMeta}</span>
                    </Typography>
                  )}
                  {single && (
                    <Check
                      className={cn(
                        'mt-0.5 size-3.5 shrink-0 text-primary',
                        count > 0 && 'invisible',
                      )}
                    />
                  )}
                </button>
              )}
              {items.length === 0 && showAllOption && (
                <Typography variant="helper" tone="muted" asChild>
                  <p className="px-2 py-4 text-center">{S.noMatches}</p>
                </Typography>
              )}
              {items.map((item: { id: string }) => {
                const label = facet.toLabel(item)
                const meta = facet.toMeta?.(item)
                const id = facet.toId ? facet.toId(item) : item.id
                const isSelected = selected.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    role={single ? 'option' : 'checkbox'}
                    aria-selected={single ? isSelected : undefined}
                    aria-checked={single ? undefined : isSelected}
                    onClick={() => toggle({ id, label })}
                    // `items-start`, not `items-center`: the label WRAPS, and a
                    // centred row would float the tick and the meta column
                    // between the lines instead of sitting on the first one.
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    {/* A pick-one facet gets NO box. A checkbox — or even a
                        radio — drawn beside every option is a promise you can
                        tick several, which is exactly the wrong thing to say
                        about Month. Single-select follows the app's own
                        `SelectItem`: a trailing check on the chosen row, and
                        nothing on the rest. */}
                    {!single && (
                      <span
                        className={cn(
                          // `mt-px` keeps the box on the first text line now the
                          // row is top-aligned for wrapping.
                          'mt-px flex size-4 shrink-0 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>
                    )}
                    {/* The name WRAPS onto as many lines as it needs instead of
                        truncating — a clipped `business_development_exe…` hides
                        which role it is. `min-w-0` is still required or the flex
                        child keeps its content width and the popover blows out
                        sideways rather than wrapping (§8.7); `break-words`
                        handles snake_case names, which have no spaces to wrap
                        at. */}
                    <Typography
                      variant="helper"
                      className="min-w-0 flex-1 whitespace-normal break-words"
                    >
                      {label}
                    </Typography>
                    {/* Trailing meta — its OWN column, pinned right and
                        `shrink-0`, so it never wraps down with the name. It is
                        the count the list exists to show; folding it into the
                        label string made it the first thing a long name pushed
                        onto the next line. */}
                    {meta !== undefined && (
                      <Typography variant="helper" tone="muted" asChild>
                        <span className="mt-px shrink-0 tabular-nums">{meta}</span>
                      </Typography>
                    )}
                    {single && (
                      // `invisible` rather than unmounted: the row keeps its
                      // width, so labels don't shift as the pick moves.
                      <Check
                        className={cn(
                          // `mt-0.5` for the same first-line alignment reason as
                          // the checkbox above.
                          'mt-0.5 size-3.5 shrink-0 text-primary',
                          !isSelected && 'invisible',
                        )}
                      />
                    )}
                  </button>
                )
              })}
              {/* Sentinel — the loader observes this to pull the next page. */}
              <div ref={setSentinelNode} className="h-px" />
              {isFetchingNextPage && (
                <Typography variant="helper" tone="muted" asChild>
                  <p className="px-2 py-2 text-center">{S.loadingMore}</p>
                </Typography>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
