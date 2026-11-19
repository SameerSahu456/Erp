import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"

import { PurchaseRequestsTable } from "../../components/purchase-requests/PurchaseRequestsTable"
import { PURCHASE_REQUESTS_STRINGS } from "../../components/purchase-requests/purchase-requests.strings"
import { usePurchaseRequestsList } from "../../hooks/purchase-requests/usePurchaseRequestsList"

function PurchaseRequestsPage() {
  const list = usePurchaseRequestsList()

  return (
    <ListPageShell
      title={PURCHASE_REQUESTS_STRINGS.list.title}
      subtitle={PURCHASE_REQUESTS_STRINGS.list.subtitle}
      breadcrumbs={[
        { label: PURCHASE_REQUESTS_STRINGS.list.breadcrumbCrm },
        { label: PURCHASE_REQUESTS_STRINGS.list.breadcrumbSelf },
      ]}
      className="p-3 sm:p-4 lg:p-6 animate-fade-in-up"
      actions={
        <Button onClick={list.goToNew}>
          <Plus className="mr-1 size-4" />
          {PURCHASE_REQUESTS_STRINGS.list.createAction}
        </Button>
      }
      stats={
        <StatsRow
          stats={list.stats}
          className="cpt-kpi-grid--compact grid grid-cols-1 sm:grid-cols-3"
        />
      }
    >
      <PurchaseRequestsTable list={list} />
    </ListPageShell>
  )
}

export { PurchaseRequestsPage }
export default PurchaseRequestsPage
