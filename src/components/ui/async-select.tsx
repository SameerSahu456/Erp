import * as React from "react"
import { ChevronDownIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"

/**
 * Adapts a fixed array into the same shape `AsyncSelect` expects from a
 * `useInfiniteQuery` hook. Use this to give static-enum dropdowns
 * (Status, Condition, Tier, Type, Warehouse, …) the same searchable UI
 * as the API-backed pickers without spinning up a backend round-trip.
 *
 *   const STATUS = [{ id: "active", name: "Active" }, ...]
 *   const useStatusOptions = makeStaticAsyncOptions(STATUS, (s) => s.name)
 *   <AsyncSelect useOptions={useStatusOptions} ... />
 *
 * `items` MAY be built from server data (e.g. a role facet that rides along on
 * a widget response) — it does not have to be a module-level constant. That is
 * why it is a dependency of the memo below: the caller rebuilds the hook when
 * its array changes, but a React hook slot keeps its memo across that swap, so
 * keying only on `search` would keep serving the list captured on FIRST render
 * (usually the empty pre-response array) until the user typed a search term.
 */
export function makeStaticAsyncOptions<T extends { id: string }>(
  items: T[],
  filterText: (item: T) => string,
) {
  return function useStaticAsyncOptions(
    search: string,
  ) {
    return React.useMemo(() => {
      const q = search.trim().toLowerCase()
      const filtered = q
        ? items.filter((i) => filterText(i).toLowerCase().includes(q))
        : items
      return {
        data: { pages: [{ items: filtered }] },
        isLoading: false,
        isError: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: () => {},
      }
      // `items` MUST be a dep, for two reasons that are really the same one:
      // the factory is re-invoked with server data, and AsyncSelect reuses the
      // same hook slot when the `useOptions` prop swaps (e.g. PO picker →
      // return picker at the same JSX position). Keying only on `search` would
      // keep serving the array captured on the first render — the empty
      // pre-response list, or the previous picker's (stale POs in the Sale
      // Return dropdown).
      //
      // The exhaustive-deps rule reads `items` as a stable outer-scope value
      // and so does not require it; the disable below is what stops a future
      // "unnecessary dependency" cleanup from removing it.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, items])
  }
}

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { selectedFirst, useDebounce, useOpenSnapshot } from "@/shared/hooks"
import { UI } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { Typography } from "@/components/ui/typography"

import { ASYNC_SELECT_STRINGS as S } from "./async-select.strings"

/**
 * Single-select infinite-scroll dropdown — the canonical implementation of
 * Coding-guideline §16.11 (API-backed dropdowns are dynamic). Pair with a
 * `useInfiniteQuery`-shaped hook; the component handles debounced search,
 * IntersectionObserver-driven page-loading, and label persistence (the chip
 * label is stored on the value so it renders even after the row scrolls
 * off the loaded pages).
 *
 * Usage:
 *   const useCatOptions = (search: string) => useCategoriesInfinite(search)
 *   <AsyncSelect
 *     value={categoryId ? { id: categoryId, label: categoryName } : null}
 *     onValueChange={(v) => setCategoryId(v?.id ?? "")}
 *     useOptions={useCatOptions}
 *     toLabel={(c) => c.name}
 *     placeholder="All categories"
 *     allOption="All categories"  // optional sentinel that maps to null
 *   />
 */

export interface AsyncSelectOption {
  id: string
  label: string
}

export interface AsyncQueryShape<TItem extends { id: string }> {
  data?: { pages: Array<{ items: TItem[] }> }
  isLoading: boolean
  isError: boolean
  /** The thrown error — lets a 403 render the friendly "no access" row
   *  instead of a generic red "failed to load". Optional for back-compat. */
  error?: unknown
  hasNextPage?: boolean
  isFetchingNextPage: boolean
  fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown> | void
}

interface AsyncSelectProps<TItem extends { id: string }> {
  /** Currently selected option, or null when nothing is picked. The `label`
   * is stored on the value so the trigger renders even when the row isn't
   * on the loaded pages (per §16.11 #5). */
  value: AsyncSelectOption | null
  onValueChange: (next: AsyncSelectOption | null) => void
  /** Hook factory: `(debouncedSearch, opts?) => useInfiniteQuery(...)`. The
   *  optional second arg is forwarded only when `loadOnOpen` is set; hooks
   *  whose signatures don't accept it ignore the extra argument. */
  useOptions: (
    search: string,
    options?: { enabled?: boolean },
  ) => AsyncQueryShape<TItem>
  /** Map each loaded row → its display label. */
  toLabel: (item: TItem) => string
  /** Placeholder when nothing is selected. */
  placeholder?: string
  /** Optional first row that maps to `null` (e.g. "All categories"). When
   * picked, the component fires `onValueChange(null)`. */
  allOption?: string
  /** Search-input placeholder. */
  searchPlaceholder?: string
  /** Toggle search input inside the dropdown list. */
  searchable?: boolean
  /** Visual className passed through to the trigger. */
  className?: string
  /** Show clear "X" button in trigger when selected. */
  clearable?: boolean
  /** Trigger chevron icon style. Defaults to `"down"`; `"none"` hides it. */
  chevron?: "up-down" | "down" | "none"
  /** Disable the picker (e.g. dependent on a parent selection). */
  disabled?: boolean
  /** Focus the trigger on mount — for the first field of a form (§3). Plain
   *  passthrough to the trigger button; defaults to false so every existing
   *  caller is unaffected. */
  autoFocus?: boolean
  /** Forwarded to the trigger button so paired `<Label htmlFor>` works. */
  id?: string
  /** Fires alongside `onValueChange` and forwards the full picked row, so
   *  callers that need fields beyond `{id, label}` (e.g. price, condition)
   *  don't have to re-look-up from cached pages. */
  onItemPick?: (item: TItem) => void
  /** When true, the underlying query is gated on `enabled: open`, so the
   *  first network call only fires when the user opens the popover. Selected
   *  chip renders from `value` regardless. */
  loadOnOpen?: boolean
  /** Optional custom row renderer. Receives the full row plus selection state
   *  so callers can render two-line layouts (e.g. SKU + name) without having
   *  to fork AsyncSelect. The check-icon column and click target are still
   *  managed by AsyncSelect; `renderItem` only controls the right-hand cell. */
  renderItem?: (item: TItem, opts: { isSelected: boolean }) => React.ReactNode
  /** Optional secondary line under each option — e.g. a part's description —
   *  shown muted and cut to one line (full text on hover). Works with or
   *  without `renderItem`. Rows that return nothing stay single-line. */
  getDescription?: (item: TItem) => string | null | undefined
  /** Optional trailing action rendered at the right edge of each option row,
   *  as a SIBLING of the (selecting) row button — not nested inside it, so the
   *  action can be its own interactive control without nesting <button>s or
   *  triggering the row's pick. Use for a per-option "Edit" affordance. The
   *  returned node is responsible for its own click handling (and should call
   *  `e.stopPropagation()`); it never fires the row's `onValueChange`. */
  itemAction?: (item: TItem) => React.ReactNode
  /** Optional custom renderer for the SELECTED value inside the trigger.
   *  Receives the picked option ({id, label}) and returns the JSX that
   *  fills the trigger's main slot. When not provided the trigger renders
   *  `<span>{label}</span>`. Useful for showing a small status chip
   *  alongside the label (e.g. a GST badge on the HSN picker). The
   *  chevron / clear-X column is rendered separately and unaffected. */
  renderValue?: (value: AsyncSelectOption) => React.ReactNode
  /** Optional pinned footer rendered at the bottom of the dropdown, below the
   *  (scrollable) option list and always visible. Receives a `close()` helper
   *  so an action (e.g. "Add new…") can dismiss the popover before opening a
   *  dialog. Not rendered when omitted — fully backward-compatible. */
  footer?: (helpers: { close: () => void }) => React.ReactNode
  /** Optional set of item ids to float to the top of the loaded list (their
   *  relative order is preserved, as is the order of the rest). Use to surface
   *  "preferred" rows — e.g. variants already on a PO — without changing the
   *  underlying query. */
  prioritizeIds?: readonly string[]
  /** Optional per-item disable predicate. A row for which it returns true renders
   *  dimmed + non-selectable — it still shows (so the operator sees the option
   *  exists) but can't be picked. Use for options the backend won't accept, e.g.
   *  a full rack/bin. Opt-in; callers that don't pass it are unaffected. */
  isItemDisabled?: (item: TItem) => boolean
  /** Copy for an empty result (no search typed). Defaults to "No options". */
  emptyText?: string
  /** Optional: Enter in the search box hands the typed text to the caller and
   *  closes the list — for pickers that also accept free text (e.g. a part
   *  typed by name). Without it Enter does nothing, as before. */
  onSearchEnter?: (text: string) => void
  /** Copy while the first page loads. Defaults to "Loading…". */
  loadingText?: string
}

export function AsyncSelect<TItem extends { id: string }>({
  value,
  onValueChange,
  useOptions,
  toLabel,
  placeholder = S.placeholder,
  allOption,
  searchPlaceholder = S.searchPlaceholder,
  searchable = true,
  className,
  clearable = true,
  chevron = "down",
  disabled = false,
  autoFocus = false,
  id,
  onItemPick,
  loadOnOpen = false,
  renderItem,
  getDescription,
  renderValue,
  footer,
  itemAction,
  prioritizeIds,
  isItemDisabled,
  emptyText = S.noOptions,
  onSearchEnter,
  loadingText = S.loading,
}: AsyncSelectProps<TItem>) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  const search = useDebounce((searchable ? rawSearch : "").trim(), UI.DEBOUNCE_SEARCH_MS)

  // Focus the search box on open WITHOUT the browser's default
  // scroll-into-view. Plain `autoFocus` runs a scrolling `.focus()`, which
  // can nudge the page when the popup mounts. Stable callback ref → fires
  // once when the input mounts.
  const focusSearchNoScroll = React.useCallback(
    (node: HTMLInputElement | null) => node?.focus({ preventScroll: true }),
    [],
  )

  const query = useOptions(search, loadOnOpen ? { enabled: open } : undefined)
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } = query
  const fetchingNextRef = React.useRef(false)

  const openValue = useOpenSnapshot(open, value)
  const selectedId = openValue?.id ?? null
  const items = React.useMemo(() => {
    const seen = new Set<string>()
    const unique: TItem[] = []
    for (const item of (data?.pages ?? []).flatMap((page) => page.items)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      unique.push(item)
    }
    let ordered = unique
    if (prioritizeIds && prioritizeIds.length > 0) {
      const pinned = new Set(prioritizeIds)
      // Stable partition: pinned ids first, everything else in original order.
      ordered = [...unique.filter((i) => pinned.has(i.id)), ...unique.filter((i) => !pinned.has(i.id))]
    }
    // The current selection floats to the very top, as of when the list opened
    // (not live — picking closes the list anyway). Only when that row is on a
    // loaded page; the list is paginated.
    return selectedId ? selectedFirst(ordered, (i) => i.id, new Set([selectedId])) : ordered
  }, [data?.pages, prioritizeIds, selectedId])

  // Callback-ref + state so the effect re-runs once the popover's portaled
  // content actually mounts. Plain `useRef` would leave the effect frozen
  // with `null` refs from the first render — the bug that caused "Scroll
  // for more" to show but never fire.
  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null)

  const requestNextPage = React.useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || fetchingNextRef.current) return
    fetchingNextRef.current = true
    const result = fetchNextPage({ cancelRefetch: false })
    if (result && typeof result === "object" && "finally" in result) {
      void (result as Promise<unknown>).finally(() => {
        fetchingNextRef.current = false
      })
    } else {
      fetchingNextRef.current = false
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // Scroll-driven pagination. We bind via the React JSX onScroll prop on
  // the scroller div (see below) rather than `addEventListener` — the
  // JSX-prop binding tracks the freshly mounted node automatically every
  // time Radix unmounts + remounts the popover content. The
  // `addEventListener` variant raced with Radix's enter animation: after
  // close + reopen the listener was sometimes bound to the previous
  // (now-detached) node, so further scrolls never fired requestNextPage
  // and the user saw a permanent "Scroll for more" hint.
  const handleScrollerScroll = React.useCallback<
    React.UIEventHandler<HTMLDivElement>
  >(
    (e) => {
      if (!hasNextPage) return
      const el = e.currentTarget
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < 80) requestNextPage()
    },
    [hasNextPage, requestNextPage],
  )

  React.useEffect(() => {
    if (!open || !scrollerNode || !sentinelNode || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) requestNextPage()
        }
      },
      { root: scrollerNode, rootMargin: "0px 0px 80px 0px", threshold: 0.01 },
    )
    observer.observe(sentinelNode)
    return () => observer.disconnect()
  }, [open, scrollerNode, sentinelNode, hasNextPage, isFetchingNextPage, fetchNextPage, requestNextPage])

  // "Do we already need more?" auto-fetch — covers two real-world bugs:
  //   • Cached first page already fits in the scroller (no scroll event
  //     possible, no IntersectionObserver fire) but more pages exist.
  //   • Close + reopen after selecting an option: Radix unmounts +
  //     remounts the popover content; sometimes the IntersectionObserver
  //     attaches AFTER the enter-animation has settled, missing the
  //     sentinel that's already in view.
  //
  // We re-measure on every layout commit while the popover is open, using
  // useLayoutEffect so the measurement reflects the freshly committed DOM
  // (post-render, pre-paint). Two rAF layers absorb Radix's transition
  // timing so the measurement runs after the popover has finished its
  // mount animation.
  const loadedCount = (data?.pages ?? []).reduce(
    (sum, p) => sum + p.items.length,
    0,
  )
  React.useLayoutEffect(() => {
    if (!open || !scrollerNode || !hasNextPage || isFetchingNextPage) return
    let cancelled = false
    function check() {
      if (cancelled || !scrollerNode || !hasNextPage || isFetchingNextPage)
        return
      const distance =
        scrollerNode.scrollHeight -
        scrollerNode.scrollTop -
        scrollerNode.clientHeight
      // `< 80` plus `scrollHeight <= clientHeight` (content fits without a
      // scrollbar) both qualify as "need more".
      if (
        scrollerNode.scrollHeight <= scrollerNode.clientHeight ||
        distance < 80
      ) {
        requestNextPage()
      }
    }
    // Double rAF — first frame commits the popover transform, second frame
    // gives layout a chance to measure the final scrollHeight. Eliminates
    // the close→reopen flake where measuring on the same frame as mount
    // returned a 0 scrollHeight.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(check)
      return () => cancelAnimationFrame(raf2)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
    }
  }, [open, scrollerNode, hasNextPage, isFetchingNextPage, loadedCount, requestNextPage])

  // Wheel fallback — user spins the wheel inside the scroller but the
  // content already fits, so the browser emits no scroll event. We treat
  // a downward wheel while at the bottom as "load more please".
  const handleScrollerWheel = React.useCallback<
    React.WheelEventHandler<HTMLDivElement>
  >(
    (e) => {
      if (!hasNextPage || isFetchingNextPage) return
      if (e.deltaY <= 0) return
      const el = e.currentTarget
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < 80) requestNextPage()
    },
    [hasNextPage, isFetchingNextPage, requestNextPage],
  )

  // Reset the search field every time the popup closes — opening fresh shows
  // the unfiltered first page rather than a stale query.
  React.useEffect(() => {
    if (!open) setRawSearch("")
  }, [open])

  function pick(item: TItem) {
    onValueChange({ id: item.id, label: toLabel(item) })
    onItemPick?.(item)
    setOpen(false)
  }
  function pickAll() {
    onValueChange(null)
    setOpen(false)
  }

  const triggerLabel = value?.label ?? placeholder

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger
        id={id}
        data-slot="async-select-trigger"
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          // `group/async-select-trigger` lets the chevron child rotate
          // based on Base UI's `data-popup-open` attribute (see chevron
          // below). Same pattern as SelectTrigger and CategoryPicker.
          "group/async-select-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card px-[10px] text-[13.5px] shadow-xs",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && "cursor-pointer",
          !value && "text-muted-foreground",
          // Mirror the Select trigger's open-state polish (slate border) so
          // AsyncSelect feels native to the rest of the form chrome.
          open && "border-primary",
          className,
        )}
        title={triggerLabel}
      >
        <span className="min-w-0 flex-1 text-left">
          {value && renderValue ? (
            renderValue(value)
          ) : (
            <span className="block truncate">{triggerLabel}</span>
          )}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {/* The clear-× and the dropdown chevron are MUTUALLY EXCLUSIVE:
              when a value is selected (and the field is clearable) only the ×
              shows; clearing it brings the chevron back. Without a selection,
              only the chevron shows. */}
          {clearable && value && !disabled ? (
            <span
              role="button"
              aria-label="Clear selection"
              tabIndex={-1}
              className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
              // Base UI's PopoverTrigger opens on `pointerdown`, which fires
              // BEFORE `click`. An onClick that only stops `click` lands too
              // late — the popup has already opened and repositioned the
              // trigger, so the clear never runs and the value stays. Swallow
              // pointer/mouse down here so the × clears instead of opening the
              // listbox. Mirrors CategoryPicker + Select's clear affordance.
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onValueChange(null)
              }}
            >
              <XIcon className="size-3" />
            </span>
          ) : chevron === "none" ? null : chevron === "down" ? (
            // Chevron flips 180° when the popover is open so the arrow
            // always points toward the listbox the user is about to act
            // on. Driven by Base UI's `data-popup-open` / `data-open`
            // on the trigger — same Tailwind pattern as SelectTrigger
            // and CategoryPicker, no React state needed here.
            <ChevronDownIcon className="size-4 opacity-50 transition-transform duration-200 group-data-popup-open/async-select-trigger:rotate-180 group-data-open/async-select-trigger:rotate-180" />
          ) : (
            // The up-down style is intentionally direction-agnostic
            // (it advertises "sortable / either way"); leaving it
            // unrotated keeps that meaning intact.
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] min-w-[var(--anchor-width)] max-w-[calc(100vw-1.5rem)] p-0"
        align="start"
      >
        {searchable && (
          <div className="relative border-b border-border p-2">
            <Input
              ref={focusSearchNoScroll}
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              onKeyDown={(e) => {
                const text = rawSearch.trim()
                if (e.key !== "Enter" || !onSearchEnter || !text) return
                e.preventDefault()
                onSearchEnter(text)
                setOpen(false)
              }}
              placeholder={searchPlaceholder}
              maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
              className="h-8 pr-8 text-sm"
            />
            {rawSearch && (
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setRawSearch("")}
                aria-label="Clear search"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div
          ref={setScrollerNode}
          onScroll={handleScrollerScroll}
          onWheel={handleScrollerWheel}
          className="max-h-64 overflow-y-auto p-1"
        >
          {/* "All ..." sentinel row — only shown on an unfiltered list so
              search results aren't cluttered by a meta-row. */}
          {allOption && !search && (
            <button
              type="button"
              onClick={pickAll}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                // Selection shown by a tinted background, not a check icon.
                value === null && "bg-accent font-medium text-accent-foreground",
              )}
            >
              <span className="truncate">{allOption}</span>
            </button>
          )}

          {isLoading && items.length === 0 ? (
            <Typography variant="helper" tone="muted" align="center" asChild>
              <div className="px-2 py-6">{loadingText}</div>
            </Typography>
          ) : isError ? (
            <LoadErrorState error={error} fallback={S.loadFailed} compact />
          ) : items.length === 0 ? (
            <Typography variant="helper" tone="muted" align="center" asChild>
              <div className="px-2 py-6">{search ? S.noMatches : emptyText}</div>
            </Typography>
          ) : (
            <>
              {/* The list is paginated: when the chosen option sits on a page that
                  has not loaded, show it first from its stored label so the
                  selection is always visible; infinite scroll continues beneath. */}
              {openValue &&
                !items.some((i) => i.id === openValue.id) &&
                (!search || openValue.label.toLowerCase().includes(search.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center rounded-sm bg-accent px-2 py-1.5 text-left text-sm font-medium text-accent-foreground"
                  >
                    <span className="truncate">{openValue.label}</span>
                  </button>
                )}
              {items.map((item) => {
                const isSelected = value?.id === item.id
                const itemDisabled = isItemDisabled?.(item) ?? false
                // With a trailing action the row is a flex container holding the
                // (selecting) button plus a sibling action slot; without one it
                // stays a single full-width button as before.
                const pickButton = (
                  <button
                    type="button"
                    disabled={itemDisabled}
                    aria-disabled={itemDisabled || undefined}
                    onClick={() => {
                      if (!itemDisabled) pick(item)
                    }}
                    className={cn(
                      "flex items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                      itemAction ? "min-w-0 flex-1" : "w-full",
                      // Selection shown by a tinted background, not a check
                      // icon — the icon column wasted horizontal space.
                      isSelected && "bg-accent font-medium text-accent-foreground",
                      // A backend-rejected option (e.g. a full rack/bin): dimmed,
                      // no hover affordance, not clickable.
                      itemDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                    )}
                  >
                    <OptionContent
                      main={
                        renderItem ? (
                          <span className="min-w-0 flex-1">{renderItem(item, { isSelected })}</span>
                        ) : (
                          <span className="truncate">{toLabel(item)}</span>
                        )
                      }
                      description={getDescription?.(item)}
                    />
                  </button>
                )
                if (!itemAction) return <React.Fragment key={item.id}>{pickButton}</React.Fragment>
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center rounded-sm pr-1 hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                  >
                    {pickButton}
                    <span className="shrink-0">{itemAction(item)}</span>
                  </div>
                )
              })}
              {hasNextPage && (
                <div
                  ref={setSentinelNode}
                  className="px-2 py-2 text-center text-[11px] text-muted-foreground"
                >
                  {isFetchingNextPage ? S.loadingMore : S.scrollForMore}
                </div>
              )}
            </>
          )}
        </div>
        {footer && (
          <div className="border-t border-border p-1">
            {footer({ close: () => setOpen(false) })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** One option's content: the main label plus an optional muted description
 *  line, truncated to one line with the full text in a tooltip. */
function OptionContent({
  main,
  description,
}: {
  main: React.ReactNode
  description: string | null | undefined
}) {
  const text = description?.trim()
  if (!text) return <>{main}</>
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex min-w-0 items-center">{main}</span>
      <Typography variant="caption" tone="muted" truncate asChild>
        {/* A span: block elements are not allowed inside the option <button>. */}
        <span title={text}>{text}</span>
      </Typography>
    </span>
  )
}
