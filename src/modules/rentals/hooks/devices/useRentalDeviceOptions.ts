import { useInfiniteQuery } from "@tanstack/react-query"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import {
  fetchRentalDevices,
  type DeviceDisplayStatus,
  type RentalDevice,
} from "../../api/devices"
import { rentalKeys } from "../shared/keys"

export interface RentalDeviceFilter {
  /** Defaults to units still out on rent. */
  status?: DeviceDisplayStatus
  salesOrderId?: string
}

/**
 * An AsyncSelect options source over ONE customer's units on rent
 * (§16.11: server search, paged). Other modules pick a rental unit through
 * this — e.g. WMS linking a held box to the unit it turned out to be, or a
 * serial swap naming the unit that stays with the customer.
 *
 * A factory so the account rides in the closure: `<AsyncSelect
 * useOptions={useRentalDeviceOptions(accountId, { status: "Returned" })}>`.
 */
export function useRentalDeviceOptions(
  accountId: string | null | undefined,
  filter: RentalDeviceFilter = {},
) {
  const status = filter.status ?? "On Rent"
  const salesOrderId = filter.salesOrderId
  return function useOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
    const q = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
    const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
    return useInfiniteQuery({
      queryKey: rentalKeys.devices.options(accountId, status, salesOrderId, q),
      queryFn: ({ pageParam }) =>
        fetchRentalDevices({
          account_id: accountId ?? undefined,
          sales_order_id: salesOrderId,
          status,
          q,
          page: pageParam,
          page_size: pageSize,
        }),
      initialPageParam: 1 as number,
      getNextPageParam: (last, all) => {
        const loaded = all.reduce((n, p) => n + p.items.length, 0)
        return loaded < last.total ? all.length + 1 : undefined
      },
      enabled: !!accountId && options.enabled !== false,
    })
  }
}

export type RentalDeviceOption = RentalDevice
