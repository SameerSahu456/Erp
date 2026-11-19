import { useCallback, useMemo } from "react"

import { AsyncMultiSelect } from "@/components/ui/async-multi-select"

import { LEADS_STRINGS as S } from "./leads.strings"

interface RejectionReasonFilterSelectProps {
  /** Selected preset reasons (empty array = no filter). */
  value: string[]
  onChange: (next: string[]) => void
  /** Field name shown with a count once something is selected, e.g. "Rejection Reason (2)". */
  label: string
  /** Empty-state text, e.g. "All Reasons". */
  placeholder: string
}

// Same panel width as the Category / OEM filters beside it in the aside, so the
// three dropdowns open at one size and wrap long reasons instead of truncating.
const FILTER_DROPDOWN_WIDTH = "w-[min(380px,90vw)]"

interface ReasonOption {
  id: string
}

// The reasons are the fixed presets the Reject dialog offers, so there is no
// API to page through — this adapts the list to the infinite-query shape
// `AsyncMultiSelect` expects (a single page, nothing more to fetch) and keeps
// the picker's search box working. The id IS the reason text: that is exactly
// what `rejection_reasons` carries to the backend.
function useRejectionReasonOptions(search: string) {
  const pages = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items: ReasonOption[] = S.reject.reasons
      .filter((r) => !q || r.toLowerCase().includes(q))
      .map((r) => ({ id: r }))
    return [{ items }]
  }, [search])
  return {
    data: { pages },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
  }
}

const toOptions = (reasons: string[]) => reasons.map((r) => ({ id: r, label: r }))

/** Multi-select Rejection Reason filter for the Rejected Leads list — the same
 *  picker (search box, scrolling list, count summary) as Category / OEM. */
export function RejectionReasonFilterSelect({
  value,
  onChange,
  label,
  placeholder,
}: RejectionReasonFilterSelectProps) {
  const handleChange = useCallback(
    (next: { id: string }[]) => onChange(next.map((o) => o.id)),
    [onChange],
  )
  return (
    <AsyncMultiSelect
      value={toOptions(value)}
      onValueChange={handleChange}
      useOptions={useRejectionReasonOptions}
      toLabel={(item: ReasonOption) => item.id}
      placeholder={placeholder}
      tooltipLabel={label}
      summary={value.length > 0 ? `${label} (${value.length})` : undefined}
      matchBy="id"
      contentClassName={FILTER_DROPDOWN_WIDTH}
      wrapLabels
    />
  )
}
