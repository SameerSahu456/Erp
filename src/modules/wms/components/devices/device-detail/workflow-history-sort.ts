// Timeline order is a per-viewer preference in localStorage; guarded so blocked storage falls back to newest-first.
export type SortOrder = 'newest' | 'oldest'
const SORT_STORAGE_KEY = 'wms:workflow-history:sort'

export function readStoredSort(): SortOrder {
  try {
    return localStorage.getItem(SORT_STORAGE_KEY) === 'oldest' ? 'oldest' : 'newest'
  } catch {
    return 'newest'
  }
}

export function writeStoredSort(order: SortOrder): void {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, order)
  } catch {
    // Ignore — the toggle still works for this session via React state.
  }
}
