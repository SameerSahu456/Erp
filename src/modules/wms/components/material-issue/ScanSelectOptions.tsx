import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Typography } from "@/components/ui/typography";
import { ASYNC_SELECT_STRINGS } from "@/components/ui/async-select.strings";

interface ScanSelectOptionsProps<T extends { id: string }> {
  isLoading: boolean;
  items: T[];
  search: string;
  showFreeText: boolean;
  labels: {
    emptyText: string;
    loadingText: string;
    freeTextLabel?: (raw: string) => string;
    toLabel: (item: T) => string;
  };
  onPick: (item: T) => void;
  onFreeText: (raw: string) => void;
  /** Infinite-scroll page controls — same contract as `AsyncSelect`. When more
   *  pages exist, a sentinel row at the end of the list loads the next page as
   *  it scrolls into view, so the picker is never capped at page 1 (§16.11). */
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}

/** The result list inside ScanSelect's popover: loading / empty / rows, plus
 *  the optional "use typed value" row and the scroll-to-load-more sentinel. */
export function ScanSelectOptions<T extends { id: string }>({
  isLoading,
  items,
  search,
  showFreeText,
  labels,
  onPick,
  onFreeText,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
}: ScanSelectOptionsProps<T>) {
  const { emptyText, loadingText, freeTextLabel, toLabel } = labels;

  // Scroll-to-load-more: observe a sentinel at the end of the list and pull the
  // next page when it enters the scroll viewport. The CommandList element
  // (`[data-slot="command-list"]`, the `overflow-y-auto` box) is the observer
  // root; resolving it from the sentinel avoids needing a ref on CommandList
  // (which does not forward one). Mirrors the AsyncSelect sentinel contract.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  useEffect(() => {
    if (!isFetchingNextPage) fetchingRef.current = false;
  }, [isFetchingNextPage]);
  useEffect(() => {
    if (!sentinel || !hasNextPage || !fetchNextPage) return;
    const root = sentinel.closest('[data-slot="command-list"]');
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage || fetchingRef.current) return;
        fetchingRef.current = true;
        fetchNextPage();
      },
      {
        root: root instanceof HTMLElement ? root : null,
        rootMargin: "0px 0px 80px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <CommandList className="max-h-60">
        <div className="px-3 py-4">
          <Typography variant="helper" tone="muted">
            {loadingText}
          </Typography>
        </div>
      </CommandList>
    );
  }
  if (items.length === 0 && !showFreeText) {
    return (
      <CommandList className="max-h-60">
        <CommandEmpty>{emptyText}</CommandEmpty>
      </CommandList>
    );
  }
  return (
    <CommandList className="max-h-60">
      {items.map((it) => (
        <CommandItem key={it.id} value={it.id} onSelect={() => onPick(it)}>
          {toLabel(it)}
        </CommandItem>
      ))}
      {showFreeText && (
        <CommandItem
          value={`__free__${search}`}
          onSelect={() => onFreeText(search)}
        >
          <Plus className="size-4" />
          {freeTextLabel ? freeTextLabel(search.trim()) : search.trim()}
        </CommandItem>
      )}
      {hasNextPage && (
        <div ref={setSentinel} className="px-3 py-2 text-center">
          <Typography variant="helper" tone="muted">
            {isFetchingNextPage
              ? ASYNC_SELECT_STRINGS.loadingMore
              : ASYNC_SELECT_STRINGS.scrollForMore}
          </Typography>
        </div>
      )}
    </CommandList>
  );
}
