import { useMemo } from "react"

import { AsyncSelect } from "@/components/ui/async-select"
import { formatINR } from "@/lib/currency"

import { useQuote, useQuotesInfinite } from "../../../hooks/quotes/useQuotes"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

// Hook adapter: wires `useQuotesInfinite` into the shape AsyncSelect expects
// (`(debouncedSearch, opts?) => useInfiniteQuery result`). The backend accepts
// repeated `?status=` query params (axios paramsSerializer `indexes: null`),
// so one call covers all drawable statuses in a single request.
//
// 2026-05-20: status no longer signals fulfilment — any non-Rejected quote
// can produce an SO. Pre-decoupling this was ['Accepted', 'PartiallyFulfilled'].
// 2026-06-02: quote workflow moved to Draft → Submitted → Amend; the drawable
// set was the two settled states (Draft, Submitted).
// 2026-10-15: narrowed to Approved only — mirrors the Convert-to-SO gate in
// QuoteStatusActions / QuoteRowActions (2026-10-07): a quote must clear
// internal approval before it can produce an SO, so the picker offers only
// quotes that the quote-side actions would also allow to convert.
const DRAWABLE_QUOTE_STATUSES = ["Approved"] as const

function useDrawableQuoteOptions(
  search: string,
  options?: { enabled?: boolean },
) {
  return useQuotesInfinite(
    {
      status: [...DRAWABLE_QUOTE_STATUSES],
      search: search || undefined,
      sort: "-created_at",
    },
    options,
  )
}

// Factory that returns a hook scoped to a specific lead/deal's quotes.
// AsyncSelect calls the returned function as a hook, so it must follow
// hook rules (start with `use*`, call hooks unconditionally). Output is
// the same shape as `useDrawableQuoteOptions`.
function makeScopedDrawableQuoteOptions(
  quotableType: "lead" | "deal",
  quotableId: string,
) {
  return function useScopedDrawableQuoteOptions(
    search: string,
    options?: { enabled?: boolean },
  ) {
    return useQuotesInfinite(
      {
        status: [...DRAWABLE_QUOTE_STATUSES],
        quotable_type: quotableType,
        quotable_id: quotableId,
        search: search || undefined,
        sort: "-created_at",
      },
      options,
    )
  }
}

export function AcceptedQuotePicker({
  value,
  onChange,
  disabled,
  scope,
}: {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  /** Optional lead/deal scoping — when set, the picker only shows
   *  drawable quotes that belong to that entity. Used by the Closed-Won
   *  redirect flow from leads/deals. */
  scope?: { type: "lead" | "deal"; id: string }
}) {
  // Selected-quote detail fetch so the trigger renders a useful label even
  // when the picked row isn't on the loaded pages (deep-linked / amended
  // quote that's many pages in). Gated on `value` so it's a no-op when
  // nothing is picked.
  const pickedQuery = useQuote(value || undefined, { enabled: !!value })

  const pickedLabel = pickedQuery.data
    ? `${pickedQuery.data.quote_number} · ${pickedQuery.data.quotable_type} · ${formatINR(pickedQuery.data.grand_total)}`
    : value
      ? S.quotePicker.loading
      : ""

  // When scope is set, route through a scoped variant of the hook. We
  // intentionally hand React stable function references per scope so
  // AsyncSelect's useOptions slot stays referentially equal across
  // renders (otherwise each keystroke would re-create the query key).
  const useScopedOptions = useMemo(
    () =>
      scope
        ? makeScopedDrawableQuoteOptions(scope.type, scope.id)
        : useDrawableQuoteOptions,
    [scope?.type, scope?.id],
  )

  return (
    <AsyncSelect
      value={value ? { id: value, label: pickedLabel } : null}
      onValueChange={(next) => onChange(next?.id ?? "")}
      useOptions={useScopedOptions}
      toLabel={(q) =>
        `${q.quote_number} · ${q.quotable_type} · ${q.status} · ${formatINR(q.grand_total)}`
      }
      placeholder={S.quotePicker.placeholder}
      searchPlaceholder={S.quotePicker.searchPlaceholder}
      disabled={disabled}
      loadOnOpen
    />
  )
}
