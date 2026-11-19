import { useMemo, useRef, useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { UI } from '@/shared/constants'
import { useDebounce } from '@/shared/hooks'
import { cn } from '@/lib/utils'

import { ALL_PAGE_PARAMS } from '../../../hooks/dashboard/useInsightPaging'

import type { SalesOrderStatus } from '../../../api/dashboard'
import type { FacetValue, RevFilters } from '../../../data/insights/records'
import { FIELD_LABEL } from './facet-options'
import { InsightFacet } from './InsightFacet'
import { INSIGHT_FACETS, type InsightFacetSource } from './insights.facets'
import { INSIGHTS_STRINGS } from './insights.strings'
import type { SummaryTileKey } from './InsightSummaryCard'
import { RECORDS_FILTER_STRINGS as S } from './records-filter.strings'
import { SUMMARY_DRILLDOWN } from './summary-drilldown.config'

// Filter bar mounted above the drill-down table on `/crm/insights/records/:tile`.
//
// FOUR controls in one strip: Search · Status · Account · User. The chrome
// (container border, inner strip, hairline dividers between controls, PILL
// styling) is DELIBERATELY the same as `<InsightsToolbar>` — the shared
// dashboard toolbar — so the two bars sit consistently on top of every insight
// page. This is not `<InsightsToolbar>` itself because Search and Status are
// records-only concerns that don't belong in the shared registry.
//
// Reuses:
//   • Search  — plain `<Input>` styled to match the PILL chrome.
//   • Status  — `<InsightFacet>` fed by `makeStaticAsyncOptions`, same helper
//     the `vertical` and `condition` facets in `INSIGHT_FACETS` use.
//   • Account — `<InsightFacet source={INSIGHT_FACETS.account}>` — zero new
//     picker code, identical infinite-scroll + debounced-search behaviour.
//   • Owner   — `<InsightFacet source={INSIGHT_FACETS.owner}>` — same as
//     Account, uses the dashboard's own scoped user picker.
//
// Status is rendered only on the SO panels (`deal:*`, `sales_order:total`,
// `lead:won`) — the quote and lead-total shapes have no meaningful status the
// user would narrow by, so the divider before it collapses too.

// Chrome constants — copied verbatim from `InsightsToolbar` so the two bars
// cannot drift on hover state, min-width, or the divider height. If the
// dashboard bar's styling changes, mirror it here.
const PILL =
  'h-8 w-auto min-w-[104px] border-transparent bg-transparent px-2 shadow-none hover:bg-background/70'
const DIVIDER = 'h-5 w-px shrink-0 bg-border/60'

// Tiles whose mapped `(type, metric)` reads an SO panel — status filter
// applies only to these. Computed once at module load.
const SO_PANEL_TILES = new Set<SummaryTileKey>(
  Object.entries(SUMMARY_DRILLDOWN)
    .filter(([, cfg]) => {
      if (!cfg) return false
      if (cfg.type === 'sales_order') return true
      if (cfg.type === 'deal') return true
      if (cfg.type === 'lead' && cfg.metric === 'won') return true
      return false
    })
    .map(([key]) => key as SummaryTileKey),
)

const STATUS_ITEMS = [
  { id: 'Approved' satisfies SalesOrderStatus, name: S.status.approved },
  { id: 'PartiallyApproved' satisfies SalesOrderStatus, name: S.status.partiallyApproved },
  { id: 'PartiallyDispatched' satisfies SalesOrderStatus, name: S.status.partiallyDispatched },
  { id: 'Dispatched' satisfies SalesOrderStatus, name: S.status.dispatched },
  { id: 'PartiallyReturned' satisfies SalesOrderStatus, name: S.status.partiallyReturned },
]
const STATUS_LABEL = new Map(STATUS_ITEMS.map((i) => [i.id as string, i.name]))

const STATUS_FACET: InsightFacetSource = {
  label: S.status.label,
  useOptions: makeStaticAsyncOptions(STATUS_ITEMS, (i) => i.name),
  toLabel: (i: { name: string }) => i.name,
}

interface RecordsFilterBarProps {
  /** Records page passes its `tile` — used to look up a per-tile placeholder
   *  and decide whether Status applies. Pages without a tile (tile-drill-down
   *  page) pass `undefined` and provide their own `searchPlaceholder`. */
  tile?: SummaryTileKey | string
  /** Fallback / explicit search-input placeholder. Records page omits this
   *  and lets the tile→placeholder map win; other pages pass it. */
  searchPlaceholder?: string
  q: string | undefined
  onQChange: (next: string) => void
  /** Records-page style Status pill. Omit BOTH props on pages that don't
   *  narrow by SO status; when either is missing the pill and its chip row
   *  don't render. */
  status?: SalesOrderStatus[]
  onStatusChange?: (next: SalesOrderStatus[]) => void
  /** Explicit override for Status pill visibility. When omitted the pill is
   *  shown only on records-page SO tiles (per `SO_PANEL_TILES`). Callers that
   *  know they always want it — like the tile-drill-down page's records body,
   *  which always shows SO rows — pass `true`. */
  showStatus?: boolean
  filters: RevFilters
  onFiltersChange: (next: RevFilters) => void
  /** Additional shared-registry facets to render after Owner. Each key must
   *  exist in `INSIGHT_FACETS` and on `RevFilters` (i.e. it's URL-synced via
   *  `useInsightView`). Rendered in the order listed, with the same PILL
   *  chrome + dividers. Records page leaves this empty; the tile-drill-down
   *  page adds `['condition', 'category', 'oem']`. */
  extraFacetFields?: readonly ExtraFacetField[]
}

/** Shared-registry facet keys that the drill-down bars actually need. Not
 *  every `MultiFilterKey` fits — `month`, `vertical` aren't part of this
 *  surface today, so they're excluded to keep the API narrow. */
export type ExtraFacetField = 'condition' | 'category' | 'oem' | 'vertical'

const EMPTY_EXTRA_FACETS: readonly ExtraFacetField[] = []

export function RecordsFilterBar({
  tile,
  searchPlaceholder,
  q,
  onQChange,
  status,
  onStatusChange,
  showStatus: showStatusProp,
  filters,
  onFiltersChange,
  extraFacetFields = EMPTY_EXTRA_FACETS,
}: RecordsFilterBarProps) {
  // Local input state — seeded once from the URL, then owned by the input.
  // Debounced write to the URL, guarded by a ref so we don't re-fire for the
  // same trimmed value. Same "uncontrolled with a seed" pattern the shared
  // `<InsightFacet>` uses for its own search box.
  const [rawInput, setRawInput] = useState(q ?? '')
  const debounced = useDebounce(rawInput, UI.DEBOUNCE_SEARCH_MS)
  const lastPushedRef = useRef<string>(q ?? '')
  useEffect(() => {
    if (debounced === lastPushedRef.current) return
    lastPushedRef.current = debounced
    onQChange(debounced)
    // `onQChange` closure changes each render — leaving it in deps would fire
    // twice per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Placeholder: caller-supplied wins; otherwise fall back to the per-tile map;
  // otherwise a generic default. Tile-drill-down page uses the explicit prop
  // because it has no `tile` context.
  const placeholder =
    searchPlaceholder ??
    (tile ? S.searchPlaceholderByTile[tile as SummaryTileKey] : undefined) ??
    S.searchPlaceholderDefault
  // Status pill applies only when the caller wires the setter. Callers can
  // force visibility with the explicit `showStatus` prop; otherwise fall back
  // to the tile-based rule (records-page SO tiles only).
  const showStatus =
    onStatusChange !== undefined &&
    (showStatusProp ??
      (tile !== undefined && SO_PANEL_TILES.has(tile as SummaryTileKey)))

  // Status stored as string[]; `<InsightFacet>` speaks FacetValue[]. Convert.
  const statusFacetValues: FacetValue[] = useMemo(
    () =>
      (status ?? []).map((v) => ({
        id: v,
        label: STATUS_LABEL.get(v) ?? v,
      })),
    [status],
  )
  const handleStatusChange = (next: FacetValue[]) =>
    onStatusChange?.(next.map((v) => v.id as SalesOrderStatus))

  // Active "Filtered by" chips: one row per non-empty field. Ordered so the
  // records-specific controls come first (search / status) and the shared
  // registry facets follow — matches the pill order above.
  // Hidden per request: the search box already shows what was typed, so it is
  // not repeated as a "Filtered by" chip. Restore these (and the block below)
  // to bring the Search chip back.
  // const searchChip = q ? [{ id: q, label: q }] : []
  const statusChips = statusFacetValues
  const accountChips = filters.account ?? []
  // Per-tile owner handling: hidden outright (win-rate) or relabelled
  // (so-closed-value → "Created By").
  const showOwner = !(tile && S.noOwnerTiles.includes(tile))
  const ownerLabel = (tile && S.ownerLabelByTile[tile]) || FIELD_LABEL.owner
  const ownerSource: InsightFacetSource = useMemo(
    () => ({ ...INSIGHT_FACETS.owner, label: ownerLabel }),
    [ownerLabel],
  )
  const ownerChips = showOwner ? (filters.owner ?? []) : []
  const activeRows: {
    key: string
    label: string
    values: FacetValue[]
    onRemove: (val: FacetValue) => void
  }[] = []
  // if (searchChip.length) {
  //   activeRows.push({
  //     key: 'q',
  //     label: S.searchChipLabel,
  //     values: searchChip,
  //     onRemove: () => {
  //       setRawInput('')
  //       onQChange('')
  //     },
  //   })
  // }
  if (showStatus && statusChips.length) {
    activeRows.push({
      key: 'status',
      label: S.status.label,
      values: statusChips,
      onRemove: (val) =>
        onStatusChange?.(
          statusChips.filter((v) => v.id !== val.id).map((v) => v.id as SalesOrderStatus),
        ),
    })
  }
  if (accountChips.length) {
    activeRows.push({
      key: 'account',
      label: FIELD_LABEL.account,
      values: accountChips,
      onRemove: (val) => {
        const next = accountChips.filter((v) => v.id !== val.id)
        onFiltersChange({ ...filters, account: next.length ? next : undefined })
      },
    })
  }
  if (ownerChips.length) {
    activeRows.push({
      key: 'owner',
      label: ownerLabel,
      values: ownerChips,
      onRemove: (val) => {
        const next = ownerChips.filter((v) => v.id !== val.id)
        onFiltersChange({ ...filters, owner: next.length ? next : undefined })
      },
    })
  }
  // Extra facets (condition / category / oem) — pill + chip row per key,
  // rendered in the order the caller listed them so the two views (pills and
  // active chips) stay in step.
  for (const key of extraFacetFields) {
    const chips = filters[key] ?? []
    if (!chips.length) continue
    activeRows.push({
      key,
      label: FIELD_LABEL[key],
      values: chips,
      onRemove: (val) => {
        const next = chips.filter((v) => v.id !== val.id)
        onFiltersChange({ ...filters, [key]: next.length ? next : undefined })
      },
    })
  }
  // Month arrives from the dashboard toolbar and has no pill on this page (its
  // options are the dashboard period's buckets), but it NARROWS the list — so it
  // is shown as a removable chip rather than applied invisibly.
  const monthChips = filters.month ?? []
  if (monthChips.length) {
    activeRows.push({
      key: 'month',
      label: FIELD_LABEL.month,
      values: monthChips,
      onRemove: (val) => {
        const next = monthChips.filter((v) => v.id !== val.id)
        onFiltersChange({ ...filters, month: next.length ? next : undefined })
      },
    })
  }
  const activeCount = activeRows.reduce((n, r) => n + r.values.length, 0)

  const [, setParams] = useSearchParams()
  // ONE URL write. The four setters (`onQChange`, `onStatusChange`,
  // `onFiltersChange`, and the tile page's `search`) each rebuild the URL from
  // the `params` captured at render, so firing them back-to-back made the last
  // write resurrect everything the earlier ones had just removed (status chips
  // and the search term came back). Deleting every key off a single copy has
  // no such race. Caller-selected extras are cleared too so one "Clear (N)"
  // wipes every visible chip.
  const clearAll = () => {
    setRawInput('')
    lastPushedRef.current = ''
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const k of ['q', 'search', 'status', 'account', 'owner', 'month', ...extraFacetFields]) {
          next.delete(k)
        }
        for (const p of ALL_PAGE_PARAMS) next.delete(p)
        return next
      },
      { replace: true },
    )
  }

  return (
    // Same TWO-LAYER chrome as `<InsightsToolbar>` — outer white card, inner
    // muted strip. Copying only the inner strip made the bar sit flush against
    // the page background (no visible card), whereas the dashboard bar reads
    // as a distinct surface. Both layers here match the dashboard bar's
    // classNames verbatim.
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 bg-muted/25 px-1.5 py-1">
        {/* Search — styled to sit as a pill among the facets. Inline icon
            inside the input; matching height and hover state. */}
        {/* Same search field as `ListToolbar` (Leads / Deals / …): 14px icon at
            `left-3`, muted at 70%, `pl-9 pr-8`, 13px text, and the same inline
            clear (X). Plain text input — `type="search"` added the browser's
            own cancel button on top of ours. Height stays `h-8` (PILL) so it
            lines up with the facet pills in this strip. */}
        <span className="relative flex min-w-[200px] max-w-sm flex-1 items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70"
          />
          <Input
            aria-label={S.searchAriaLabel}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={placeholder}
            className={cn(PILL, 'w-full pl-9 pr-8 text-[13px]')}
          />
          {rawInput && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setRawInput('')
                onQChange('')
              }}
              aria-label={INSIGHTS_STRINGS.detail.clear}
            >
              <X className="size-3.5" />
            </button>
          )}
        </span>

        {showStatus && (
          <>
            <span className={DIVIDER} aria-hidden />
            <InsightFacet
              source={STATUS_FACET}
              value={statusFacetValues}
              onChange={handleStatusChange}
              className={PILL}
              // Five fixed options — the search box has nothing to do.
              searchable={false}
            />
          </>
        )}

        <span className={DIVIDER} aria-hidden />
        <InsightFacet
          source={INSIGHT_FACETS.account}
          value={filters.account ?? []}
          onChange={(v) =>
            onFiltersChange({ ...filters, account: v.length ? v : undefined })
          }
          className={PILL}
        />

        {showOwner && (
          <>
            <span className={DIVIDER} aria-hidden />
            <InsightFacet
              source={ownerSource}
              value={filters.owner ?? []}
              onChange={(v) =>
                onFiltersChange({ ...filters, owner: v.length ? v : undefined })
              }
              className={PILL}
            />
          </>
        )}

        {/* Caller-listed extras (condition / category / oem). Each pill uses
            the same `<InsightFacet>` + `INSIGHT_FACETS[key]` source the
            dashboard toolbar uses, so behaviour is identical. */}
        {extraFacetFields.map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span className={DIVIDER} aria-hidden />
            <InsightFacet
              source={INSIGHT_FACETS[key]}
              value={filters[key] ?? []}
              onChange={(v) =>
                onFiltersChange({ ...filters, [key]: v.length ? v : undefined })
              }
              className={PILL}
            />
          </span>
        ))}
      </div>

      {/* "Filtered by" — same chip pattern `<InsightsToolbar>` renders below
          its strip. One row per active field: fixed-width label on the left,
          removable chips on the right. Clear button in the header wipes every
          active filter. */}
      {activeRows.length > 0 && (
        <div className="flex flex-col gap-1.5 px-0.5">
          <div className="flex items-center justify-between">
            <Typography variant="helper" tone="muted">
              {INSIGHTS_STRINGS.detail.filteredBy}
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 text-muted-foreground"
              onClick={clearAll}
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
          {activeRows.map((row) => (
            <div key={row.key} className="flex items-start gap-2">
              <Typography variant="helper" tone="muted" asChild>
                <span className="w-20 shrink-0 truncate pt-1">{row.label}</span>
              </Typography>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {row.values.map((val) => (
                  <Typography key={val.id} variant="helper" asChild>
                    <span className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-primary/20 bg-primary/10 py-0.5 pr-0.5 pl-2 font-medium text-primary">
                      <span className="min-w-0 truncate">{val.label}</span>
                      <button
                        type="button"
                        onClick={() => row.onRemove(val)}
                        aria-label={INSIGHTS_STRINGS.detail.removeFilter(row.label, val.label)}
                        className="shrink-0 rounded-sm p-0.5 transition-colors hover:bg-primary/20"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </Typography>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
