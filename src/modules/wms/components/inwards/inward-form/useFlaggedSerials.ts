import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { normalizeSerial } from '../inward-lines/model'

/** Serials rejected at finalize as already in stock (passed via router state).
 *  Keyed by normalised value so the flag clears once the serial is edited. */
export function useFlaggedSerials() {
  const location = useLocation()
  const flagSerials = (location.state as { flagSerials?: string[] } | null)?.flagSerials ?? []
  const flagSerialsKey = flagSerials.join(',')
  return useMemo(
    () => new Set(flagSerials.map(normalizeSerial)),
    // location.state is stable across renders; recompute only if the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flagSerialsKey],
  )
}
