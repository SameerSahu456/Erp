// User-facing copy for the WMS › devices › Spares Requested card.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the card title,
// the empty line, the requester / part-name fallbacks, and the fulfilled /
// returned count lines live here as one typed `as const` object instead of
// being hardcoded ("naked") in the component. Mirrors the sibling
// checklist-runs-card.strings.ts / device-info-card.strings.ts pattern.
//
// NOT included (correctly sourced elsewhere): the STAGE_ICON map (icon
// components, not copy) and the SPARE_STATUS_LABELS / SPARE_STATUS_VARIANT enum
// maps (label maps in ./helpers), className / tone props, and pure separator
// glyphs (· —). The STAGE_LABEL enum→label map now lives below as its own export.
export const SPARES_REQUESTED_CARD_STRINGS = {
  cardTitle: 'Spares requested',
  raise: 'Raise Spare Request',
  empty: 'No spare parts have been requested for this device.',
  loadError: 'Couldn’t load the spare requests. Refresh to try again.',
  /** Fallback when the spare's part name is missing. */
  partFallback: 'Spare part',
  fulfilledLine: (fulfilled: number, requested: number) =>
    `${fulfilled} of ${requested} fulfilled`,
  /** Trailing note when some fulfilled units have been returned to stock. */
  returnedLine: (returned: number, onDevice: number) =>
    `· ${returned} returned to stock · ${onDevice} on the device`,
  /** Label before the serial(s) of the unit(s) issued against the request. */
  issuedLabel: 'Issued:',
  /** Label before the operator's reason on a returned spare. */
  returnReasonLabel: 'Return reason',
  /** Expand / collapse a long return note. */
  showMore: 'Show more',
  showLess: 'Show less',
} as const

/** Operation-stage → display label for the meta line (§16.12 bucket 2). */
export const SPARES_REQUESTED_STAGE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  repair: 'Repair',
  qc: 'QC',
  paint: 'Paint',
}
