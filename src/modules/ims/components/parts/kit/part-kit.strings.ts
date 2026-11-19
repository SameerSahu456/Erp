/** Part kit template copy (return-by-count §9). */
export const PART_KIT_STRINGS = {
  tab: "Kit",
  title: "What ships with each unit",
  description:
    "Items packed with every rental unit of this model. The warehouse ticks them at dispatch and checks them on return; a missing or broken one is charged.",
  empty: "No kit items. Add the charger, bag or anything else that goes out with the unit.",
  stockItem: "Stock item",
  stockPlaceholder: "Search a variant (optional)",
  freeText: "Or describe it",
  freeTextPlaceholder: "e.g. Carry bag",
  add: "Add item",
  remove: (label: string) => `Remove ${label}`,
  moveUp: "Move up",
  moveDown: "Move down",
  save: "Save kit",
  incomplete: "Each item needs a stock item or a description.",
  saved: "Kit saved",
  stockTracked: "Stock item",
} as const
