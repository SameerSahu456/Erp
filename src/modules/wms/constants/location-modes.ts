// Business labels for the rack storage modes (backend: `can_store_stock` boolean).
export const RACK_MODES = [
  {
    value: "with_bins" as const,
    label: "Holds bins",
    helper: "Add bins inside this rack. Slots are counted per bin.",
  },
  {
    value: "direct_storage" as const,
    label: "Stores items directly",
    helper: "Set the number of storage slots on the rack itself.",
  },
] as const;

// Capacity-mode pickers — bin and direct-storage rack both have these.
export const CAPACITY_MODES = [
  { value: "single" as const, label: "Single slot" },
  { value: "multiple" as const, label: "Multiple slots" },
] as const;

export type CapacityMode = (typeof CAPACITY_MODES)[number]["value"];

// Capacity bound — mirrors DB CHECK. Lower bound only; the 100-unit ceiling
// was dropped (migration wms_uncap_cap_01) because real bulk bins hold more.
export const CAPACITY_MIN = 1;
