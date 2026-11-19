import type { UnscrapTarget } from '../../api'

/**
 * The ONLY statuses the backend's scrap endpoint accepts (device-scrap §3).
 *
 * This mirrors `SCRAP_ALLOWED_FROM` in the backend's wms/enums.py, and it is
 * an ALLOWLIST on purpose. It was briefly written as a four-entry denylist
 * (`issued`/`installed`/`scrapped`/`disposed`), which is NOT the complement:
 * that offered Scrap on `damaged`, `reserved`, `in_transit`, `consumed`,
 * `dismantled`, `dispatched`, `pending_return`, `returned_to_vendor` and
 * `lost_in_transit`, every one of which the server refuses with 409
 * DEVICE_NOT_ELIGIBLE. `damaged` alone is ~5,846 live rows, so the most
 * common device in the system would have shown a button that always failed.
 *
 * The two refusals that carry a specific next step still get their own
 * message from the server: `issued` → return it via Material Issue first
 * (D7); `installed` → pull the component out of its parent first (D13).
 */
export const SCRAP_ALLOWED_FROM = new Set(['available', 'in_operations'])

/** True when a unit's stock status is one scrap may act on. */
export const canScrapStatus = (status: string | null | undefined): boolean =>
  !!status && SCRAP_ALLOWED_FROM.has(status)

/** Pipeline stages the backend refuses scrap at — the unit is away at a vendor.
 *  Mirrors `SCRAP_BLOCKED_WORKFLOW_STATUSES` in the backend's wms/enums.py. */
export const SCRAP_BLOCKED_WORKFLOW = new Set(['at_external_vendor'])

// device-scrap D9. A device condemned mid-pipeline NEVER PASSED QC, so
// restoring it straight to sellable would put an unverified machine into
// stock — the backend refuses it. Offering the option anyway teaches the
// wrong model and yields a confusing error, so the list is driven by the
// snapshot taken at scrap time.
//
// Keep in step with `SCRAP_RESTORE_TARGETS` in the backend's wms/enums.py.
export const RESTORE_TARGETS: Record<string, ReadonlyArray<UnscrapTarget>> = {
  available: ['available', 'inspection', 'repair'],
  in_operations: ['inspection', 'repair'],
}

/**
 * The un-scrap targets legal for a specific device right now.
 *
 * `available` is additionally dropped when the unit has no location — sellable
 * means racked (D9), and the backend refuses an un-location'd "available"
 * target. An unknown/null `scrapPriorStatus` (no snapshot recorded) resolves
 * to an empty list — mirrors the backend's `SCRAP_PRIOR_STATUS_UNKNOWN`.
 */
export function computeRestoreTargets(
  scrapPriorStatus: string | null | undefined,
  hasLocation: boolean,
  hasWarehouse = true,
): ReadonlyArray<UnscrapTarget> {
  const raw = RESTORE_TARGETS[scrapPriorStatus ?? ''] ?? []
  return raw.filter((t) => {
    // `available` means racked and sellable, so it needs a location (D9).
    if (t === 'available') return hasLocation
    // A pipeline target OPENS an op, and an op is warehouse-scoped — the
    // backend refuses rather than half-restoring a warehouse-less unit, so
    // don't offer it either.
    return hasWarehouse
  })
}
