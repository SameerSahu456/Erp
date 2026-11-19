// Remembers the leads/deals board view mode (kanban vs list) so the user's
// last choice survives navigating away and back — and a browser refresh.
//
// The URL `?view=` param still drives the *current* page (shareable links,
// browser back/forward). But a fresh SPA navigation to `/crm/leads` lands
// without that param, and `useClearFiltersOnReload` strips it on refresh —
// in both cases the board used to snap back to kanban. Falling back to this
// stored preference keeps the user in the view they picked.

export type BoardViewMode = "kanban" | "list"

const STORAGE_PREFIX = "crm:board-view:"

// Read the remembered view for a board (`"leads"` / `"deals"`). Returns null
// when nothing valid is stored so the caller can apply its own default.
export function readBoardViewPreference(board: string): BoardViewMode | null {
  if (typeof localStorage === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + board)
    return stored === "list" || stored === "kanban" ? stored : null
  } catch {
    // Private mode / disabled storage — fall back to the caller's default.
    return null
  }
}

export function writeBoardViewPreference(board: string, value: BoardViewMode): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(STORAGE_PREFIX + board, value)
  } catch {
    // Quota / private mode — the URL `?view=` param still holds the current view.
  }
}
