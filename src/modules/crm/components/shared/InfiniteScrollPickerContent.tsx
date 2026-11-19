import * as React from "react"
import { UI } from "@/shared/constants"
import { X as XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { PopoverContent } from "@/components/ui/popover"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import { useInfiniteDropdownLoader } from "@/shared/hooks"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface PickerSearch {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

interface PickerQueryState {
  isLoading: boolean
  isError: boolean
  /** The thrown error — lets a 403 render the friendly "no access" row
   *  instead of a generic red "failed to load". Optional for back-compat. */
  error?: unknown
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown | Promise<unknown>
}

interface InfiniteScrollPickerContentProps<T extends { id: string }> {
  search: PickerSearch
  query: PickerQueryState
  items: T[]
  /** Renders one option row. Keys are handled by the wrapper. */
  renderItem: (item: T) => React.ReactNode
  /** Fixed content inside the scroller, above the list (e.g. a "None" row). */
  beforeList?: React.ReactNode
  emptyText?: string
  errorText?: string
  /** Optional action rendered below the scroll list (e.g. "Add new"). */
  footer?: React.ReactNode
  /** Override the popover width. Defaults to the trigger width. Pass a wider
   *  (capped) width when the trigger is a narrow toolbar chip but the option
   *  labels need room — always keep a max so the panel can't overflow (§8.7). */
  contentClassName?: string
}

// Shared popover body for the CRM API-backed pickers (account, contact, owner,
// assignee, …): the search input + scroll container + loading/error/empty
// states + the IntersectionObserver "load more" sentinel, all wired to
// `useInfiniteDropdownLoader` per §16.11. Each picker supplies its own query
// hook, item rows (`renderItem`), and selected-item pinning; this owns the
// scaffolding that used to be copy-pasted into every picker.
export function InfiniteScrollPickerContent<T extends { id: string }>({
  search,
  query,
  items,
  renderItem,
  beforeList,
  emptyText = CRM_SHARED_STRINGS.picker.noMatches,
  errorText = CRM_SHARED_STRINGS.picker.loadError,
  footer,
  contentClassName,
}: InfiniteScrollPickerContentProps<T>) {
  const { isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    query

  // Callback-ref state — refs alone don't trigger re-renders, so effects
  // can't react when the popover content re-mounts after close + reopen.
  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null)

  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    // This body only exists in the tree while the popover is open.
    open: true,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: items.length,
  })

  return (
    <PopoverContent
      className={cn("w-[var(--anchor-width)] p-0", contentClassName)}
      align="start"
    >
      <div className="relative border-b border-border p-2">
        <Input
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder}
          maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
          className="h-8 pr-8 text-sm"
          autoFocus
        />
        {search.value && (
          <button
            type="button"
            aria-label={CRM_SHARED_STRINGS.picker.clearSearch}
            // Keep focus in the input when clearing.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => search.onChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      <div
        ref={setScrollerNode}
        onScroll={onScroll}
        onWheel={onWheel}
        className="max-h-64 overflow-y-auto p-1"
      >
        {beforeList}
        {isLoading && items.length === 0 ? (
          <Typography variant="helper" align="center" asChild>
            <div className="px-2 py-6">{CRM_SHARED_STRINGS.picker.loading}</div>
          </Typography>
        ) : isError ? (
          <LoadErrorState error={error} fallback={errorText} compact />
        ) : items.length === 0 ? (
          <Typography variant="helper" align="center" asChild>
            <div className="px-2 py-6">{emptyText}</div>
          </Typography>
        ) : (
          <>
            {items.map((item) => (
              <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
            ))}
            {hasNextPage && (
              <Typography variant="caption" align="center" asChild>
                <div ref={setSentinelNode} className="px-2 py-2">
                  {isFetchingNextPage
                    ? CRM_SHARED_STRINGS.picker.loadingMore
                    : CRM_SHARED_STRINGS.picker.scrollForMore}
                </div>
              </Typography>
            )}
          </>
        )}
      </div>
      {footer}
    </PopoverContent>
  )
}
