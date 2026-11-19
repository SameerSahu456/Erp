import * as React from "react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Typography } from "@/components/ui/typography";
import { useInfiniteDropdownLoader } from "@/shared/hooks";

import {
  useCategory,
  useCategoryOptions,
} from "../../hooks/categories/useCategories";
import { categoryLabel } from "../../lib/category-label";
import { CATEGORIES_STRINGS } from "./categories.strings";

interface CategoryOptionsComboboxProps {
  value: string | null;
  onValueChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Visual width is controlled by the parent — we set `w-full` here so the
   *  trigger fills its grid cell on the quote form. */
  className?: string;
  /** Lets callers override the trigger button classes (e.g. height) so the
   *  combobox can match form-row siblings (`h-9` etc.). */
  triggerClassName?: string;
  /** When set, renders an explicit "All (any category)" item at the top of
   *  the dropdown that clears the selection to ``null``. Used by pickers
   *  where the wildcard is a first-class choice (bifurcation lines) so a
   *  stray click lands on an unambiguous option rather than a real
   *  category. Default: not rendered (back-compat with every other caller
   *  that doesn't model a wildcard). */
  wildcardLabel?: string;
}

// API-backed combobox for category pickers. Per Coding-guideline §16.11:
//   - source is paginated via `useCategoryOptions` (standard page + search)
//   - search hits the backend (debounced inside the hook)
//   - scroll-to-load-more via IntersectionObserver
//   - selected-but-unloaded ids are hydrated by `useCategory(value)` and
//     pinned to the top so the trigger always shows the right name
//
// Mirrors the shape of `ParentAccountSelect` so future categorical pickers
// can copy the same scaffolding without inventing a new pattern.
export function CategoryOptionsCombobox({
  value,
  onValueChange,
  placeholder = "Select a category…",
  disabled,
  className,
  triggerClassName,
  wildcardLabel,
}: CategoryOptionsComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [rawSearch, setRawSearch] = React.useState("");

  const query = useCategoryOptions(rawSearch, { enabled: open });
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query;

  const rawItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  );

  // Hydrate the selected category if it isn't already in the loaded pages
  // (e.g. it lives on page 5, or the dropdown isn't open yet).
  const valueAlreadyInList = !!value && rawItems.some((i) => i.id === value);
  const valueDetailQuery = useCategory(
    value && !valueAlreadyInList ? value : "",
  );

  const items = React.useMemo(() => {
    const seen = new Set<string>();
    const out: typeof rawItems = [];
    if (value && !valueAlreadyInList && valueDetailQuery.data) {
      out.push(valueDetailQuery.data);
      seen.add(valueDetailQuery.data.id);
    }
    for (const item of rawItems) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  }, [value, valueAlreadyInList, valueDetailQuery.data, rawItems]);

  const selected = items.find((i) => i.id === value) ?? null;
  // When the picker exposes an explicit wildcard, show its label as the
  // trigger text whenever ``value === null`` so the user sees "All" instead
  // of a muted placeholder — makes the state unambiguous and tells them a
  // real wildcard is in effect, not an unfilled field.
  const triggerLabel = selected
    ? categoryLabel(selected)
    : value
      ? CATEGORIES_STRINGS.combobox.triggerLoading
      : (wildcardLabel ?? null);

  // Callback-ref + state so the load-more effects re-run once the popover's
  // portaled content actually mounts. Plain `useRef` froze the effect with
  // `null` refs from the first render — Popover portals its content, so on
  // first paint the scroller doesn't exist yet, the observer never attaches,
  // and "Scroll for more" stays inert. This is the same fix that lives in
  // `AsyncMultiSelect`; see its comment block for the full failure mode.
  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(
    null,
  );
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(
    null,
  );
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: items.length,
  });

  function pick(id: string) {
    onValueChange(id);
    setOpen(false);
    setRawSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange(null);
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <div className={cn("relative w-full", className)}>
        <Typography asChild variant="body" tone="inherit">
          <PopoverTrigger
            data-slot="input"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card shadow-xs",
              "cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              "pl-3 pr-7",
              triggerClassName,
            )}
            title={triggerLabel || placeholder}
          >
            {triggerLabel ? (
              <span className="min-w-0 flex-1 truncate text-left text-foreground">
                {triggerLabel}
              </span>
            ) : (
              <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                {placeholder}
              </span>
            )}
          </PopoverTrigger>
        </Typography>
        {/* Selected → clear (X); nothing selected → dropdown chevron. */}
        {value && !disabled ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={CATEGORIES_STRINGS.combobox.clearAriaLabel}
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground opacity-50" />
        )}
      </div>
      <PopoverContent
        className="w-[320px] min-w-[var(--anchor-width)] max-w-[calc(100vw-1.5rem)] p-0"
        align="start"
      >
        <div className="border-b border-border p-2">
          <Typography asChild variant="body" tone="inherit">
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder={CATEGORIES_STRINGS.combobox.searchPlaceholder}
              className="h-8"
              autoFocus
            />
          </Typography>
        </div>
        <div
          ref={setScrollerNode}
          onScroll={onScroll}
          onWheel={onWheel}
          className="max-h-64 overflow-y-auto p-1"
        >
          {isLoading && items.length === 0 ? (
            <Typography asChild variant="helper" align="center">
              <div className="px-2 py-6">
                {CATEGORIES_STRINGS.combobox.loading}
              </div>
            </Typography>
          ) : isError ? (
            <Typography asChild variant="helper" tone="danger" align="center">
              <div className="px-2 py-6">
                {CATEGORIES_STRINGS.combobox.loadError}
              </div>
            </Typography>
          ) : items.length === 0 ? (
            <Typography asChild variant="helper" align="center">
              <div className="px-2 py-6">
                {rawSearch
                  ? CATEGORIES_STRINGS.combobox.noMatches
                  : CATEGORIES_STRINGS.combobox.noCategories}
              </div>
            </Typography>
          ) : (
            <>
              {/* Explicit wildcard row — only when the caller opts in via
                  ``wildcardLabel``. Clears the selection back to ``null``
                  so a stray click lands on an unambiguous option rather
                  than a real category. */}
              {wildcardLabel ? (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(null);
                    setOpen(false);
                    setRawSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                    value === null &&
                      "bg-accent font-medium text-accent-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 italic text-muted-foreground">
                    {wildcardLabel}
                  </span>
                </button>
              ) : null}
              {items.map((item) => {
                const isSelected = value === item.id;
                return (
                  <Typography
                    key={item.id}
                    asChild
                    variant="body"
                    tone="inherit"
                  >
                    <button
                      type="button"
                      onClick={() => pick(item.id)}
                      className={cn(
                        "flex w-full items-center rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                        // Selection shown by a tinted background, not a check icon.
                        isSelected &&
                          "bg-accent font-medium text-accent-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        {categoryLabel(item)}
                      </span>
                    </button>
                  </Typography>
                );
              })}
              {hasNextPage && (
                <Typography asChild variant="caption" align="center">
                  <div ref={setSentinelNode} className="px-2 py-2">
                    {isFetchingNextPage
                      ? CATEGORIES_STRINGS.combobox.loadingMore
                      : CATEGORIES_STRINGS.combobox.scrollForMore}
                  </div>
                </Typography>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
