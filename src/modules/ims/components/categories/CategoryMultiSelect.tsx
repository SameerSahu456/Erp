import { AsyncMultiSelect, type AsyncOption } from "@/components/ui/async-multi-select"

import { useCategoryOptions } from "../../hooks/categories/useCategories"
import { categoryLabel } from "../../lib/category-label"

interface CategoryMultiSelectProps {
  /** Selected categories as `{ id, label }` rows (the IMS category uuid + name). */
  value: AsyncOption[]
  onValueChange: (next: AsyncOption[]) => void
  placeholder?: string
}

/**
 * The single category multi-select used everywhere categories are picked:
 * lead/deal "Categories", account "Categories Interested" / "Categories Bought",
 * and the Closed-Won "Categories Interested".
 *
 * It always:
 *  - matches selection by the category **id** (`matchBy="id"`), so picking one
 *    category never drags in its same-named siblings, and
 *  - displays the parent-prefixed `categoryLabel` ("Parent / Name"), so two
 *    sub-categories that share a leaf name stay visually distinct.
 *
 * The old per-call config (`matchBy="label"` + bare `name`) caused exactly the
 * "duplicate names + selecting one selects all" bug, because same-named
 * categories collided on a single label key. Don't reintroduce per-call
 * `toLabel` / `matchBy` overrides — route every category picker through here.
 */
export function CategoryMultiSelect({
  value,
  onValueChange,
  placeholder = "Select categories...",
}: CategoryMultiSelectProps) {
  return (
    <AsyncMultiSelect
      value={value}
      onValueChange={onValueChange}
      useOptions={useCategoryOptions}
      toLabel={categoryLabel}
      placeholder={placeholder}
      loadOnOpen
      matchBy="id"
    />
  )
}
