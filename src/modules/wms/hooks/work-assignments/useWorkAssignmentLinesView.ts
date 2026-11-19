/** Server-paginated (§16.7) view + selection for a work assignment's lines; ticks persist across pages. */
import { useMemo, useState } from "react";

import { useDebounce } from '@/shared/hooks'
import { useMemoryState } from '@/shared/hooks/useMemoryState'
import { useTabbedListView } from '@/shared/hooks/useTabbedListView'
import { PAGINATION } from '@shared/constants/pagination'
import { UI } from '@shared/constants/ui'
import { toSortParam } from '@shared/lib/sort-param'

import type { WorkAssignmentLineListParams } from "../../api/work-assignments";
import { useWorkAssignmentLines } from "./useWorkAssignments";

/** §16.6 — one page-size per page, derived from the global default. */
const WORK_ASSIGNMENT_LINE_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

/** §1.1.B store key — registered in `useScopedViewReset` (Work Assignments section). */
const WORK_ASSIGNMENT_LINES_VIEW_KEY = 'wms-work-assignment-lines'
const LINE_TABS = ['all'] as const

/** Only a line still in play can be ticked — the same set the backend accepts
 *  for a withdraw, and the set worth reprinting a label for. */
export const isActionableLineState = (raw: unknown): boolean =>
  raw === "outstanding" || raw === "reassigned";

/** `sortFieldMap` maps a table column key → backend sort field; it is owned by
 *  the line column config, so the caller passes it. */
export function useWorkAssignmentLinesView(
  id: string,
  isOpen: boolean,
  sortFieldMap: Record<string, string>,
) {
  // Ticked line ids (persist across pages).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Server-side table view in the shared list-view store (§1.1.B): search,
  // status filter, sort, page and page size survive a device-detail round-trip.
  const lv = useTabbedListView({
    storageKey: WORK_ASSIGNMENT_LINES_VIEW_KEY,
    tabIds: LINE_TABS,
    defaultTab: 'all',
    emptyFilters: () => ({ state: '' }),
    pageSize: WORK_ASSIGNMENT_LINE_PAGE_SIZE,
  })
  // One stored view serves every WA — opening a different one starts clean.
  const [viewOwner, setViewOwner] = useMemoryState(`${WORK_ASSIGNMENT_LINES_VIEW_KEY}:owner`, id)
  if (viewOwner !== id) {
    setViewOwner(id)
    lv.resetAllViews()
  }
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view
  // Status filter — the derived line state; server-side like search/sort.
  const stateFilter = lv.view.filters.state
  // Debounced so it doesn't refetch on every keystroke; the input still updates immediately.
  const debouncedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS)

  const sortParam = toSortParam(sortColumn, sortDirection, sortFieldMap);
  const lineParams: WorkAssignmentLineListParams = {
    q: debouncedSearch || undefined,
    state: stateFilter || undefined,
    sort: sortParam,
    page,
    page_size: pageSize,
  };
  const linesQuery = useWorkAssignmentLines(id, lineParams);
  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);
  const total = linesQuery.data?.total ?? 0;

  // Actionable ids ON THE CURRENT PAGE — the scope of the select-all toggle
  // (server pagination means the table only ever holds one page).
  const pageActionableIds = useMemo(
    () =>
      isOpen
        ? lines
            .filter((l) => isActionableLineState(l.state))
            .map((l) => String(l.id))
        : [],
    [isOpen, lines],
  );
  const allPageSelected =
    pageActionableIds.length > 0 &&
    pageActionableIds.every((lineId) => selectedIds.includes(lineId));

  const toggle = (lineId: string) =>
    setSelectedIds((current) =>
      current.includes(lineId)
        ? current.filter((x) => x !== lineId)
        : [...current, lineId],
    );
  const toggleAllOnPage = () =>
    setSelectedIds((current) =>
      allPageSelected
        ? current.filter((lineId) => !pageActionableIds.includes(lineId))
        : [...new Set([...current, ...pageActionableIds])],
    );
  const clearSelection = () => setSelectedIds([]);

  // Every result-affecting change resets to page 1 (the store does it).
  const setStateFilter = (next: string | undefined) =>
    lv.setFilters({ state: next && next !== '__all__' ? next : '' })

  return {
    linesQuery,
    lines,
    total,
    search,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    stateFilter,
    selectedIds,
    pageActionableIds,
    allPageSelected,
    toggle,
    toggleAllOnPage,
    clearSelection,
    setSearch: lv.setSearch,
    clearFilters: lv.clearFilters,
    setPage: lv.setPage,
    setPageSize: lv.setPageSize,
    setStateFilter,
    setSort: lv.setSort,
  }
}
