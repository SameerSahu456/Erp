/** Copy for <RackBinLocationPicker />.
 *
 * Lives here rather than in material-issue.strings because the picker is now
 * shared (MI pull-out + component return, and the spare return). The wording is
 * already flow-agnostic — it describes the warehouse model, not the action —
 * so one set serves every caller.
 */
export const LOCATION_PICKER_STRINGS = {
  rackLabel: "Rack / Pallet",
  rackPlaceholder: "Pick a rack or pallet",
  rackSearchPlaceholder: "Search racks…",
  rackPalletTag: "pallet",
  binLabel: "Bin",
  binPlaceholder: "Pick a bin in this rack",
  binSearchPlaceholder: "Search bins…",
  locationEmpty: "No storage locations in this warehouse.",
  /** Suffix on a rack/pallet/bin that has no free slot — shown greyed-out so the
   *  operator sees it exists but is at capacity. */
  fullTag: "Full",
  /** Occupancy suffix on a bin/pallet option — how much capacity is used.
   *  Bounded → "3/5"; uncapped → "3 in use". */
  occupancy: (used: number, capacity: number | null) =>
    capacity == null ? `${used} in use` : `${used}/${capacity}`,
} as const;
