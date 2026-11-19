import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SalesOrderStatus } from '../../api/dashboard'
import { ALL_PAGE_PARAMS } from './useInsightPaging'

// URL-synced state for the two records-page filters — `q` (search) and
// `status` — that live on `/crm/insights/records/:tile`, above the drill-down
// table. Kept OUT of `parseInsightParams` (`insight-view.params.ts`) because
// that parser is shared with every insight board and neither `q` nor `status`
// is used there.
//
// Repair-not-reject per §11.1: an invalid `q` or unknown `status` value in the
// URL is silently dropped rather than 422-ing the whole page. Setter writes
// back with `replace: true` so the history stack doesn't fill up per
// keystroke.

/** Two-char minimum after strip — matches the backend validator
 *  (`RecordsQuery._validate_q`) so we never fire a request the server will
 *  422. */
const Q_MIN_LEN = 2
const Q_MAX_LEN = 100

const KNOWN_STATUSES: readonly SalesOrderStatus[] = [
  'Approved',
  'PartiallyApproved',
  'PartiallyDispatched',
  'Dispatched',
  'PartiallyReturned',
]
const isKnownStatus = (v: string): v is SalesOrderStatus =>
  (KNOWN_STATUSES as readonly string[]).includes(v)

export interface RecordsPageFiltersState {
  q: string | undefined
  status: SalesOrderStatus[] | undefined
  setQ: (next: string) => void
  setStatus: (next: SalesOrderStatus[]) => void
}

export function useRecordsPageFilters(): RecordsPageFiltersState {
  const [params, setParams] = useSearchParams()

  const rawQ = params.get('q')?.trim() ?? ''
  const q = rawQ.length >= Q_MIN_LEN && rawQ.length <= Q_MAX_LEN ? rawQ : undefined

  const rawStatuses = params.getAll('status').filter(isKnownStatus)
  const status = rawStatuses.length ? Array.from(new Set(rawStatuses)) : undefined

  const patch = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params)
      mutate(next)
      // Any filter change invalidates the current page index — same reset the
      // paging hook does when the slice changes elsewhere.
      for (const p of ALL_PAGE_PARAMS) next.delete(p)
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const setQ = useCallback(
    (nextRaw: string) => {
      const trimmed = nextRaw.trim()
      patch((p) => {
        if (trimmed.length >= Q_MIN_LEN && trimmed.length <= Q_MAX_LEN) p.set('q', trimmed)
        else p.delete('q')
      })
    },
    [patch],
  )

  const setStatus = useCallback(
    (nextStatuses: SalesOrderStatus[]) => {
      patch((p) => {
        p.delete('status')
        for (const s of nextStatuses) if (isKnownStatus(s)) p.append('status', s)
      })
    },
    [patch],
  )

  return { q, status, setQ, setStatus }
}
