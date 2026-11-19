import { useInfiniteQuery } from "@tanstack/react-query"

import { FIRST_PAGE, nextPage } from "@/shared/api/pagination"
import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import { fetchRentalReturnEligibleAccounts } from "../../api"
import { rentalReturnRequestKeys } from "./useRentalReturnRequests"

const ELIGIBLE_ACCOUNTS_KEY = [...rentalReturnRequestKeys.all, "eligible-accounts"] as const

/** A customer the return form may pick, shaped for `<AsyncSelect>`. */
export interface RentalReturnAccountOption {
  id: string
  name: string
  returnableUnitCount: number
}

/**
 * The return form's customer picker: only customers with a rental order and
 * at least one unit still free to return (2026-11-16). `<AsyncSelect>`'s
 * `useOptions` — search is debounced here, and pages follow `has_next`
 * because the server drops ineligible customers after paging.
 */
export function useRentalReturnEligibleAccountOptions(
  rawSearch: string,
  options?: { enabled?: boolean },
) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  return useInfiniteQuery({
    queryKey: [...ELIGIBLE_ACCOUNTS_KEY, { search }],
    queryFn: ({ pageParam }) => fetchRentalReturnEligibleAccounts({ q: search, page: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options?.enabled ?? true,
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map(
          (row): RentalReturnAccountOption => ({
            id: row.account_id,
            name: row.account_name,
            returnableUnitCount: row.returnable_unit_count,
          }),
        ),
      })),
    }),
  })
}
