import { useMemo } from "react"

import {
  useReplacementEligibleUnitComponents,
  type DispatchedUnitComponentWire,
} from "@modules/crm"
import { partOptionDescription, useVariantsListInfinite } from "@modules/ims"

/** One option of the part / replacement-part pickers. */
export interface PartOption {
  id: string
  label: string
  /** Shown as a muted line under the option. */
  description?: string | null
}

/** Option id for a part typed in rather than picked (it carries the text). */
export const TYPED_PREFIX = "typed:"
/** Option ids for the replacement-part defaults (component spec D14). */
export const SAME_PART = "same-part"
export const ENGINEER_DECIDES = "engineer-decides"
/** In house, the part alone comes in: fix it and send the same part back (D15). */
export const REPAIR_PART = "repair-part"

const componentLabel = (c: DispatchedUnitComponentWire): string =>
  [c.part_name ?? c.description, c.variant_name, c.internal_serial ?? c.part_number]
    .filter(Boolean)
    .join(" · ")

const loaded = (items: PartOption[]) => ({
  data: { pages: [{ items }] },
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: () => {},
})

/** The "Part" picker: the parts recorded inside the device, plus — once
 *  something is typed — "Use “<text>”" for a part that is not listed. Parts
 *  another line of this device already took are left out. */
export function useDevicePartOptions(
  salesOrderId: string,
  driId: string,
  takenIds: string[],
  typedLabel: (text: string) => string,
) {
  const contents = useReplacementEligibleUnitComponents(salesOrderId, driId)
  const recorded = useMemo(
    () =>
      (contents.data ?? [])
        .filter((c) => !c.already_under_replacement && !takenIds.includes(c.component_id))
        .map((c) => {
          const label = componentLabel(c)
          // Search also hits the component's description, which the label
          // only shows when the part name is missing.
          const searchText = `${label} ${c.description ?? ""}`.toLowerCase()
          return { id: c.component_id, label, description: c.description, searchText }
        }),
    [contents.data, takenIds],
  )
  return useMemo(
    () =>
      function useOptions(search: string) {
        const q = search.trim()
        const matches = q
          ? recorded.filter((o) => o.searchText.includes(q.toLowerCase()))
          : recorded
        const options = matches.map(({ id, label, description }) => ({ id, label, description }))
        const typed = q ? [{ id: `${TYPED_PREFIX}${q}`, label: typedLabel(q) }] : []
        return loaded([...options, ...typed])
      },
    [recorded, typedLabel],
  )
}

/** The "Replacement part" picker: its fixed choices first (Same part or
 *  Engineer decides, and Repair this part when the part alone comes in), then
 *  the catalogue as it is searched. */
export function useReplacementPartOptions(leadingOptions: PartOption[]) {
  return useMemo(
    () =>
      function useOptions(search: string, options?: { enabled?: boolean }) {
        const query = useVariantsListInfinite(search, options)
        const pages = query.data?.pages ?? []
        const first = search.trim() ? [] : leadingOptions
        return {
          ...query,
          data: {
            pages: pages.length
              ? pages.map((p, i) => ({
                  items: [
                    ...(i === 0 ? first : []),
                    ...p.items.map((v) => ({
                      id: v.id,
                      label: v.display_title,
                      description: partOptionDescription(v),
                    })),
                  ],
                }))
              : [{ items: first }],
          },
        }
      },
    [leadingOptions],
  )
}
