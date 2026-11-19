import * as React from "react"
import { CheckIcon, ChevronDownIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounce, useInfiniteDropdownLoader, useOpenSnapshot } from "@/shared/hooks"
import { UI } from "@/shared/constants"
import { HoverTip } from "@/components/common/display/HoverTip"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

export interface AsyncOption {
  id: string
  label: string
}

interface AsyncQueryShape<TItem extends { id: string }> {
  data?: { pages: Array<{ items: TItem[] }> }
  isLoading: boolean
  isError: boolean
  /** The thrown error — lets a 403 render the friendly "no access" row
   *  instead of a generic red "failed to load". Optional for back-compat. */
  error?: unknown
  hasNextPage?: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

interface AsyncMultiSelectProps<TItem extends { id: string }> {
  /** Currently selected options. Stored as `{id, label}` so chips render even
   *  when the row isn't on the loaded page (per Coding-guideline §16.11 #5). */
  value: AsyncOption[]
  onValueChange: (next: AsyncOption[]) => void
  /** Hook factory: `(debouncedSearch, opts?) => useInfiniteQuery(...)`. The hook
   *  MUST return TanStack's infinite-query shape; the bucket dimension (search)
   *  is already a structural part of the queryKey per §16.8. The optional
   *  second argument is forwarded only when `loadOnOpen` is set — hooks whose
   *  signatures don't accept it will simply ignore the extra arg. */
  useOptions: (
    search: string,
    options?: { enabled?: boolean },
  ) => AsyncQueryShape<TItem>
  /** Map each loaded row → its display label. */
  toLabel: (item: TItem) => string
  placeholder?: string
  /** Filter name for the hover tooltip: "Name" when empty, "Name: N selected" otherwise. */
  tooltipLabel?: string
  /** OPT-IN. Use the browser's native `title` hover (and no wrapper element)
   *  instead of the styled `HoverTip`, for toolbars that keep the original
   *  plain-hover look, e.g. PM Approvals. */
  nativeTitle?: boolean
  /** When true, the underlying query is gated on `enabled: open`, so the first
   *  network call only fires when the user opens the popover. Use for pickers
   *  whose data isn't needed until interaction (e.g. categories on a form that
   *  the user may never touch). Selected chips render from `value` regardless. */
  loadOnOpen?: boolean
  /**
   * How a selected `value` row is matched against a loaded option.
   * - `"id"` (default): match `value[].id` to `item.id`. Use when the field
   *   round-trips real entity ids (e.g. leads/deals categories return
   *   `{id, name}`, so the form hydrates `{id: uuid, label: name}`).
   * - `"label"`: match `value[].label` to `toLabel(item)`. Use when the field
   *   stores free-form name strings with no id (e.g. account
   *   `categories_interested` / `categories_bought` come back as bare names,
   *   so the form hydrates `{id: name, label: name}` and the option's uuid id
   *   can never match). Without this, the previously-selected rows never show
   *   as checked and toggling re-adds duplicates.
   */
  matchBy?: "id" | "label"
  /** Fired whenever a new options page resolves, with the full set of loaded
   *  rows so far. Lets a caller react to rows as they stream in — e.g. a
   *  manage-membership dialog that auto-checks rows already belonging to the
   *  set (driving a delta-based diff) instead of pre-fetching the whole
   *  membership list. MUST be memoized (useCallback) — it's an effect dep.
   *  Optional and fully backward-compatible; omit it for plain pickers. */
  onItemsLoaded?: (items: TItem[]) => void
  /** Overrides the trigger's summary text (the default is
   *  `"N options selected"`). Use when the selection count from `value` would
   *  mislead — e.g. a delta-membership picker whose `value` only holds the
   *  loaded/seeded rows, so the true total comes from a separate source (an API
   *  `total`). When omitted, the default count is shown. An empty string falls
   *  back to the placeholder. */
  summary?: string
  /** Show the clear-all "X" in the trigger once something is selected
   *  (default `true`). Set `false` for delta-membership pickers where clearing
   *  `value` would only drop the currently-loaded rows — not the full set — and
   *  so reads as a misleading "remove everything". */
  clearable?: boolean
  /** Forwarded to the trigger so a `<Label htmlFor>` can point at it. */
  id?: string
  /** Overrides the dropdown panel width (default: the trigger's width). Pair
   *  with `wrapLabels` for narrow triggers whose option names are long. */
  contentClassName?: string
  /** Wrap long option labels onto multiple lines instead of truncating them. */
  wrapLabels?: boolean
  /**
   * Hook that turns ids into display names — for fields that hold ONLY ids
   * (their `value[].label` is just the id). Called with the selected ids that
   * are not on a loaded page, so those rows can still be pinned to the top with
   * a real name. Without it, such rows are left out of the pinned block rather
   * than showing a raw id.
   */
  useResolveLabels?: (ids: string[]) => Record<string, string>
}

const useNoLabels = (): Record<string, string> => ({})

export function AsyncMultiSelect<TItem extends { id: string }>({
  value,
  onValueChange,
  useOptions,
  toLabel,
  placeholder = "Select...",
  tooltipLabel,
  nativeTitle = false,
  loadOnOpen = false,
  matchBy = "id",
  onItemsLoaded,
  summary,
  clearable = true,
  id,
  contentClassName,
  wrapLabels = false,
  useResolveLabels = useNoLabels,
}: AsyncMultiSelectProps<TItem>) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  const query = useOptions(search, loadOnOpen ? { enabled: open } : undefined)
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  // Pages can repeat a row (paging shifts while the list changes). Rows are keyed
  // by id, so a repeated id would leave ghost DOM rows that never unmount —
  // de-dupe like AsyncSelect does.
  const allItems = React.useMemo(() => {
    const seen = new Set<string>()
    return (data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((item) => !seen.has(item.id) && !!seen.add(item.id))
  }, [data?.pages])
  const items = allItems

  // Notify the caller as rows stream in (delta-membership pickers seed their
  // checked state from this). Idempotent on the caller's side — fires with the
  // full loaded set each time the pages change.
  React.useEffect(() => {
    if (onItemsLoaded && allItems.length) onItemsLoaded(allItems)
  }, [allItems, onItemsLoaded])

  // Callback-ref + state so the hook's effects re-run once the popover's
  // portaled content actually mounts. Plain `useRef` froze the effect
  // with `null` refs from the first render, leaving "Scroll for more"
  // visible but inert.
  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: allItems.length,
  })

  // Identity key for matching a selected `value` row to a loaded option.
  // `"label"` keys off the display name (fields that store bare names with no
  // usable id); `"id"` keys off the entity id (the default).
  const valueKey = React.useCallback(
    (v: AsyncOption) => (matchBy === "label" ? v.label : v.id),
    [matchBy],
  )
  const itemKey = React.useCallback(
    (item: TItem) => (matchBy === "label" ? toLabel(item) : item.id),
    [matchBy, toLabel],
  )

  const selectedKeys = React.useMemo(
    () => new Set(value.map(valueKey)),
    [value, valueKey],
  )

  function toggle(option: AsyncOption) {
    const key = valueKey(option)
    if (selectedKeys.has(key)) {
      onValueChange(value.filter((v) => valueKey(v) !== key))
    } else {
      onValueChange([...value, { id: option.id, label: option.label }])
    }
  }

  // Selected rows float to the top so the user sees what is already chosen.
  // Taken from the selection as of OPEN (not live) so a row doesn't jump while
  // being ticked. They come from `value` itself rather than the loaded pages —
  // the list is paginated, so a selected option may sit on a page that hasn't
  // loaded yet; the paged list below skips them to avoid duplicates. While
  // searching, the pinned rows are narrowed client-side by label.
  const pinned = useOpenSnapshot(open, value)
  const loadedLabelByKey = React.useMemo(
    () => new Map(items.map((item) => [itemKey(item), toLabel(item)] as const)),
    [items, itemKey, toLabel],
  )
  // Selected rows not on a loaded page: look up their real names (id-only
  // fields). Gated on `open` so closed filters make no requests.
  const unloadedIds = React.useMemo(
    () => pinned.filter((v) => !loadedLabelByKey.has(valueKey(v))).map((v) => v.id),
    [pinned, loadedLabelByKey, valueKey],
  )
  const resolvedLabels = useResolveLabels(open ? unloadedIds : [])
  const rows = React.useMemo(() => {
    const needle = search.toLowerCase()
    const pinnedKeys = new Set(pinned.map(valueKey))
    const head: AsyncOption[] = []
    const seenIds = new Set<string>()
    for (const v of pinned) {
      if (seenIds.has(v.id)) continue
      seenIds.add(v.id)
      // Prefer the loaded option's own label, then a looked-up name, then the
      // stored one. A label that is still just the id is a placeholder — skip
      // the row instead of showing a raw id.
      const label =
        loadedLabelByKey.get(valueKey(v)) ?? resolvedLabels[v.id] ?? v.label
      if (label === v.id && label === v.label && !loadedLabelByKey.has(valueKey(v))) continue
      if (needle && !label.toLowerCase().includes(needle)) continue
      head.push({ id: v.id, label })
    }
    const tail = items
      .filter((item) => !pinnedKeys.has(itemKey(item)) && !seenIds.has(item.id))
      .map((item) => ({ id: item.id, label: toLabel(item) }))
    return [...head, ...tail]
  }, [pinned, items, search, valueKey, itemKey, toLabel, loadedLabelByKey, resolvedLabels])

  const selectionSummary =
    summary !== undefined && summary !== ""
      ? summary
      : value.length === 0
        ? placeholder
        : `${value.length} option${value.length === 1 ? "" : "s"} selected`

  // Once anything is selected, the input shows a clear-"X" in place of the
  // dropdown chevron. The clear button is a sibling of the trigger (not nested)
  // because nesting a <button> inside the trigger <button> trips a hydration
  // error — same approach as PopoverSelectTrigger. Suppressed when `clearable`
  // is false (e.g. delta-membership pickers where clearing `value` would only
  // drop the loaded rows, not the whole set — misleading).
  const showClear = clearable && value.length > 0

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange([])
  }

  const tipText = tooltipLabel
    ? value.length > 0
      ? `${tooltipLabel}: ${value.length} selected`
      : tooltipLabel
    : summary !== undefined && summary !== ""
      ? summary
      : value.length
        ? value.map((item) => item.label).join(", ")
        : placeholder

  const trigger = (
      <div className="relative w-full">
        <PopoverTrigger
          id={id}
          data-slot="input"
          className={cn(
            // `group/async-multi-select-trigger` lets the chevron child
            // rotate on open via Base UI's `data-popup-open` / `data-open`
            // attribute — same Tailwind pattern as SelectTrigger,
            // AsyncSelect, and CategoryPicker.
            "group/async-multi-select-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card pl-[10px] text-[13.5px] shadow-xs",
            "cursor-pointer transition-colors",
            showClear ? "pr-9" : "pr-[10px]",
            // Mute only a true placeholder — a `summary` override is real
            // content, not a placeholder, so it stays full-strength.
            !value.length &&
              !(summary !== undefined && summary !== "") &&
              "text-muted-foreground",
          )}
          title={nativeTitle ? tipText : undefined}
        >
          <span className="min-w-0 flex-1 truncate text-left">{selectionSummary}</span>
          {!showClear && (
            <ChevronDownIcon className="size-4 shrink-0 opacity-50 ml-2 transition-transform duration-200 group-data-popup-open/async-multi-select-trigger:rotate-180 group-data-open/async-multi-select-trigger:rotate-180" />
          )}
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {nativeTitle ? trigger : <HoverTip text={tipText}>{trigger}</HoverTip>}
      <PopoverContent className={cn("w-[var(--anchor-width)] p-0", contentClassName)} align="start">
        <div className="relative border-b border-border p-2">
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Search..."
            maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
            className="h-8 pr-8 text-sm"
            autoFocus
          />
          {rawSearch && (
            <button
              type="button"
              aria-label="Clear search"
              // Keep focus in the input when clearing.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setRawSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div
          ref={setScrollerNode}
          onScroll={onScroll}
          onWheel={onWheel}
          className="max-h-64 overflow-y-auto p-1"
        >
          {isLoading && rows.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : isError ? (
            <LoadErrorState error={error} fallback="Failed to load options" compact />
          ) : rows.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No matches
            </div>
          ) : (
            <>
              {rows.map((row) => {
                const isSelected = selectedKeys.has(valueKey(row))
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggle(row)}
                    className={cn(
                      "flex w-full gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      wrapLabels ? "items-start" : "items-center",
                      "hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                    <span className={wrapLabels ? "min-w-0 break-words" : "truncate"} title={row.label}>
                      {row.label}
                    </span>
                  </button>
                )
              })}
              {hasNextPage && (
                <div
                  ref={setSentinelNode}
                  className="px-2 py-2 text-center text-[11px] text-muted-foreground"
                >
                  {isFetchingNextPage ? "Loading more…" : "Scroll for more"}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
