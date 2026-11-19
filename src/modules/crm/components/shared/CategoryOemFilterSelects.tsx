import { useCallback } from "react"

import { AsyncMultiSelect } from "@/components/ui/async-multi-select"
import {
  categoryLabel,
  useCategoriesByIds,
  useCategoryOptions,
  useOEMOptions,
  useOEMsByIds,
} from "@modules/ims"

interface IdFilterSelectProps {
  /** Selected IMS ids (empty array = no filter). */
  value: string[]
  onChange: (next: string[]) => void
  /** Field name shown with a count once something is selected, e.g. "Category (2)". */
  label: string
  /** Empty-state text, e.g. "All Categories". */
  placeholder: string
}

// The aside is narrow (w-64), so the dropdown panel opens wider than its
// trigger and wraps long category / OEM names instead of truncating them.
const FILTER_DROPDOWN_WIDTH = "w-[min(380px,90vw)]"

// The list filters keep only ids in the URL, so the shared picker's
// `{ id, label }` chips are rebuilt from ids — the trigger shows a count
// summary (never the labels), and rows match by id.
const toOptions = (ids: string[]) => ids.map((id) => ({ id, label: id }))

// Names for selected ids that are not on a loaded dropdown page, so they can
// still be pinned to the top of the list under their real name.
function useCategoryNames(ids: string[]): Record<string, string> {
  const results = useCategoriesByIds(ids)
  const out: Record<string, string> = {}
  results.forEach((r, i) => {
    if (r.data) out[ids[i]!] = categoryLabel(r.data)
  })
  return out
}
function useOemNames(ids: string[]): Record<string, string> {
  const results = useOEMsByIds(ids)
  const out: Record<string, string> = {}
  results.forEach((r, i) => {
    if (r.data) out[ids[i]!] = r.data.name
  })
  return out
}

/** Multi-select Category filter for the Leads & Deals lists (ids in, ids out). */
export function CategoryFilterSelect({ value, onChange, label, placeholder }: IdFilterSelectProps) {
  const handleChange = useCallback(
    (next: { id: string }[]) => onChange(next.map((o) => o.id)),
    [onChange],
  )
  return (
    <AsyncMultiSelect
      value={toOptions(value)}
      onValueChange={handleChange}
      useOptions={useCategoryOptions}
      useResolveLabels={useCategoryNames}
      toLabel={categoryLabel}
      placeholder={placeholder}
      tooltipLabel={label}
      summary={value.length > 0 ? `${label} (${value.length})` : undefined}
      loadOnOpen
      matchBy="id"
      contentClassName={FILTER_DROPDOWN_WIDTH}
      wrapLabels
    />
  )
}

/** Multi-select OEM filter for the Leads & Deals lists (ids in, ids out). */
export function OemFilterSelect({ value, onChange, label, placeholder }: IdFilterSelectProps) {
  const handleChange = useCallback(
    (next: { id: string }[]) => onChange(next.map((o) => o.id)),
    [onChange],
  )
  return (
    <AsyncMultiSelect
      value={toOptions(value)}
      onValueChange={handleChange}
      useOptions={useOEMOptions}
      useResolveLabels={useOemNames}
      toLabel={(oem) => oem.name}
      placeholder={placeholder}
      tooltipLabel={label}
      summary={value.length > 0 ? `${label} (${value.length})` : undefined}
      loadOnOpen
      matchBy="id"
      contentClassName={FILTER_DROPDOWN_WIDTH}
      wrapLabels
    />
  )
}
