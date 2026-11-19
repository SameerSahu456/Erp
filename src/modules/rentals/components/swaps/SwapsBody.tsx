import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PAGINATION } from "@/shared/constants"
import { PermissionGuard } from "@shared/rbac"

import { rentalsCan } from "../../permissions"
import { swapStatusVariant } from "../../constants/swaps"
import { useSwaps } from "../../hooks/swaps/useSwaps"
import { StatusTabbedList } from "../shared/StatusTabbedList"
import { SWAP_COLUMNS, SWAP_TABS, toSwapRow } from "./swaps.columns"
import { SWAPS_STRINGS as S } from "./swaps.strings"

const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** Swap approval queue — the rental product manager works the first tab. */
export function SwapsBody() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<string>("pending")
  const [page, setPage] = useState(1)
  const status = SWAP_TABS.find((t) => t.id === tab)?.status
  const query = useSwaps({ status: status ? [...status] : undefined, page, page_size: PAGE_SIZE })
  return (
    <StatusTabbedList
      title={S.list.title}
      subtitle={S.list.subtitle}
      actions={
        <PermissionGuard required={[...rentalsCan.returnUnits]}>
          <Button onClick={() => navigate("/rentals/swaps/new")}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.newSwap}
          </Button>
        </PermissionGuard>
      }
      tabs={SWAP_TABS}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id)
        setPage(1)
      }}
      columns={SWAP_COLUMNS}
      rows={(query.data?.items ?? []).map(toSwapRow)}
      variantOf={swapStatusVariant}
      persistKey="rentals-swaps"
      onRowClick={(row) => navigate(`/rentals/swaps/${String(row.id)}`)}
      query={query}
      pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPageChange: setPage }}
      emptyState={S.list.empty}
      loadError={S.list.loadError}
    />
  )
}
