import { useMemo, useState } from "react"

import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { usePermission } from "@shared/rbac"
import { rentalsPermissions } from "@modules/rentals"
import {
  crmPermissions,
  useRentalReturnRequestCounts,
  useRentalReturnRequests,
} from "@modules/crm"

import { WMS_PAGE_SIZE } from "../../constants"
import { useWarehouseScope } from "../../context/warehouse-scope"
import {
  RENTAL_RETURN_STATUS_IDS,
  toRentalReturnRow,
} from "../../components/rental-return-requests/rental-return-requests.columns"

/** Rental-return register state, all server-side (§16.7); any filter change resets to page 1. */
export function useRentalReturnList() {
  const { can } = usePermission()
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [reason, setReason] = useState("")
  const debouncedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS)

  // Navbar warehouse scope (§0.16); empty = all accessible.
  const { selectedWarehouseIds } = useWarehouseScope()
  const whKey = selectedWarehouseIds.join(",")
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    setPage(1)
  }

  const shared = {
    q: debouncedSearch || undefined,
    warehouse_ids: selectedWarehouseIds,
    reason: reason || undefined,
  }
  const listQuery = useRentalReturnRequests({
    ...shared,
    page,
    page_size: WMS_PAGE_SIZE,
    status: activeTab === "all" ? undefined : [activeTab],
  })
  // One slim count per status bucket, honouring the active filters — the same
  // numbers drive the stat strip and the tab badges, so a filter moves both.
  const counts = useRentalReturnRequestCounts(RENTAL_RETURN_STATUS_IDS, shared)

  const rows = useMemo(
    () => (listQuery.data?.items ?? []).map(toRentalReturnRow),
    [listQuery.data?.items],
  )

  const onTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setPage(1)
  }
  const onSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }
  const onToolbarFilterChange = (key: string, value: string) => {
    if (key === "reason") setReason(value)
    setPage(1)
  }
  const onClearFilters = () => {
    setReason("")
    setSearch("")
    setPage(1)
  }

  return {
    listQuery,
    counts,
    rows,
    page,
    setPage,
    activeTab,
    onTabChange,
    search,
    onSearchChange,
    reason,
    onToolbarFilterChange,
    onClearFilters,
    // Mirrors the `rental-returns/new` route gate — the button is hidden from
    // anyone the form would turn away (§5).
    canCreate: can([crmPermissions.MANAGE, rentalsPermissions.RETURN]),
  }
}
