import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ALL_PAGE_PARAMS } from './useInsightPaging'

// URL-synced state for the `?search=` param on the tile-drill-down page's
// account body. Sibling of `useRecordsPageFilters` but for a different URL
// key (`search` vs `q`), a different min-length (matches the backend's
// `/dashboard/revenue/by-source` `min_length=1`), and no status pair.
//
// Kept OUT of `parseInsightParams` because — like `q` — `search` is
// page-specific and would push records/tile semantics onto every other insight
// board. Repair-not-reject per §11.1: an out-of-range value is silently
// dropped rather than 422-ing the whole page.

const SEARCH_MIN_LEN = 1
const SEARCH_MAX_LEN = 200

export interface TileSearchFilterState {
  q: string | undefined
  setQ: (next: string) => void
}

export function useTileSearchFilter(): TileSearchFilterState {
  const [params, setParams] = useSearchParams()

  const rawQ = params.get('search')?.trim() ?? ''
  const q =
    rawQ.length >= SEARCH_MIN_LEN && rawQ.length <= SEARCH_MAX_LEN ? rawQ : undefined

  const setQ = useCallback(
    (nextRaw: string) => {
      const trimmed = nextRaw.trim()
      const next = new URLSearchParams(params)
      if (trimmed.length >= SEARCH_MIN_LEN && trimmed.length <= SEARCH_MAX_LEN) {
        next.set('search', trimmed)
      } else {
        next.delete('search')
      }
      // Filter change invalidates the current page index — same reset the
      // paging hook does when the slice changes elsewhere.
      for (const p of ALL_PAGE_PARAMS) next.delete(p)
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  return { q, setQ }
}
