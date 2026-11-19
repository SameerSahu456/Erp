import { useMemoryState } from "./useMemoryState";

export type SortDir = "asc" | "desc" | null;

/** One tab's complete list view: free-text search, a page-specific `filters`
 *  bag, sort, page, and page size. Everything a list page needs to remember. */
export type ListView<F> = {
  search: string;
  filters: F;
  sortColumn: string | null;
  sortDirection: SortDir;
  page: number;
  pageSize: number;
};

/** The stored record: the free-text `search` is kept PER TAB, while the rest of
 *  the view (filters / sort / page / page size) is one value SHARED by every
 *  tab. One in-memory entry (`:views`) holds the whole thing, so the existing
 *  `useScopedViewReset` wiring clears it on section-leave with no extra key. */
type StoredView<F, TId extends string> = {
  /** Per-tab search term; a tab with no entry reads as "". */
  searchByTab: Partial<Record<TId, string>>;
  filters: F;
  sortColumn: string | null;
  sortDirection: SortDir;
  page: number;
  pageSize: number;
};

/**
 * Tabbed list-view state for WMS list pages.
 *
 *  - Search is PER TAB: typing on one tab never shows on another, and each tab
 *    remembers its own term when you switch away and back. The rest of the view
 *    (filters / sort / page / page size) is GLOBAL across tabs, so a filter set
 *    on any tab stays applied when you switch — the tab only chooses the status
 *    bucket, and switching it keeps the filters and resets to page 1.
 *  - State lives in an in-memory store (see `useMemoryState`): it survives
 *    list ↔ detail navigation but a browser refresh resets it to defaults.
 *  - Leaving the section entirely clears it — wire the page's URL prefix +
 *    `${storageKey}:views` / `${storageKey}:tab` keys into `useScopedViewReset`.
 *
 * Single-list pages (no tabs) pass a one-element `tabIds` (e.g. `['all']`); the
 * hook still gives them in-memory, section-scoped view persistence.
 *
 * The page keeps ownership of its query params and count queries — it reads
 * `view` (the ACTIVE tab's view) and calls the setters below from the BMT
 * callbacks. `viewByTab[id]` reports each tab's OWN search alongside the shared
 * filters/sort/page, so a page building per-tab badge counts reads the right
 * (per-tab) search for each bucket.
 */
export function useTabbedListView<F extends object, TId extends string>(config: {
  /** Stable key, e.g. `"wms-spares"`. Storage keys derive from it. */
  storageKey: string;
  tabIds: readonly TId[];
  defaultTab: TId;
  /** Factory (not a value) so a fresh filters object is minted on reset. */
  emptyFilters: () => F;
  pageSize: number;
}) {
  const { storageKey, tabIds, defaultTab, emptyFilters, pageSize } = config;

  const emptyStored = (): StoredView<F, TId> => ({
    searchByTab: {},
    filters: emptyFilters(),
    sortColumn: null,
    sortDirection: null,
    page: 1,
    pageSize,
  });

  const [rawTab, setRawTab] = useMemoryState<TId>(`${storageKey}:tab`, defaultTab);
  // Guard a stale stored tab (ids can change between deploys).
  const activeTab = tabIds.includes(rawTab) ? rawTab : defaultTab;

  // One in-memory entry holds the per-tab searches + the shared rest. Key kept
  // as `:views` so the section-leave reset wiring (`useScopedViewReset`) clears
  // it unchanged.
  const [stored, setStored] = useMemoryState<StoredView<F, TId>>(
    `${storageKey}:views`,
    emptyStored,
  );

  const searchFor = (id: TId) => stored.searchByTab?.[id] ?? "";

  // The view for one tab: that tab's own search + the shared filters/sort/page.
  const viewFor = (id: TId): ListView<F> => ({
    search: searchFor(id),
    filters: stored.filters,
    sortColumn: stored.sortColumn,
    sortDirection: stored.sortDirection,
    page: stored.page,
    pageSize: stored.pageSize,
  });

  const view = viewFor(activeTab);

  // `search` (if present) routes to the ACTIVE tab's slot; everything else is
  // the shared view. Lets existing callers keep passing `{ search, page }`.
  const patchView = (patch: Partial<ListView<F>>) => {
    const { search, ...rest } = patch;
    setStored((prev) => {
      const next: StoredView<F, TId> = { ...prev, ...rest };
      if (search !== undefined) {
        next.searchByTab = { ...prev.searchByTab, [activeTab]: search };
      }
      return next;
    });
  };

  // Every result-affecting change resets to page 1.
  const setSearch = (q: string) => patchView({ search: q, page: 1 });
  const setFilters = (f: Partial<F>) =>
    setStored((prev) => ({ ...prev, filters: { ...prev.filters, ...f }, page: 1 }));
  const setSort = (col: string | null, dir: SortDir) =>
    patchView({ sortColumn: col, sortDirection: dir, page: 1 });
  const setPage = (p: number) => patchView({ page: p });
  const setPageSize = (s: number) => patchView({ pageSize: s, page: 1 });
  // Clear acts on the CURRENT view: the active tab's search + the shared
  // filters. Other tabs keep their own search (per-tab independence).
  const clearFilters = () =>
    setStored((prev) => ({
      ...prev,
      searchByTab: { ...prev.searchByTab, [activeTab]: "" },
      filters: emptyFilters(),
      page: 1,
    }));

  // Switching tabs changes the status bucket → start at page 1, keep the shared
  // filters. The active tab's search follows automatically (it's keyed by tab).
  const setActiveTab = (id: TId) => {
    setRawTab(id);
    patchView({ page: 1 });
  };

  // Reset the page (e.g. a navbar warehouse switch changes the dataset).
  const resetAllPages = () => patchView({ page: 1 });

  // A global context switch (navbar warehouse change) makes the whole dataset
  // new, so start clean: wipe every tab's search + the shared view back to
  // defaults AND return to the default tab.
  const resetAllViews = () => {
    setStored(emptyStored());
    setRawTab(defaultTab);
  };

  // Each tab reports its OWN search with the shared filters/sort/page, so a
  // caller reading `viewByTab[someTab]` sees that tab's search for its counts.
  const viewByTab = Object.fromEntries(tabIds.map((id) => [id, viewFor(id)])) as Record<
    string,
    ListView<F>
  >;

  return {
    activeTab,
    setActiveTab,
    view,
    viewByTab,
    patchView,
    setSearch,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
    resetAllPages,
    resetAllViews,
  };
}
