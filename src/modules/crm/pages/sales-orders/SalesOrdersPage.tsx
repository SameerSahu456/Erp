// Plus / Button / PermissionGuard / crmCan — re-import when the Create Sales Order action is restored.
// import { Plus } from "lucide-react"

// import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"
// import { PermissionGuard } from "@shared/rbac"

import { SalesOrdersTable } from "../../components/sales-orders/SalesOrdersTable"
import { SALES_ORDERS_STRINGS as S } from "../../components/sales-orders/sales-orders.strings"
// import { crmCan } from "../../permissions"
import { useSalesOrdersList } from "../../hooks/sales-orders/useSalesOrdersList"

function SalesOrdersPage() {
  const list = useSalesOrdersList()

  return (
    <ListPageShell
      title={S.page.title}
      subtitle={S.page.subtitle}
      breadcrumbs={[{ label: S.page.breadcrumbCrm }, { label: S.page.breadcrumbSelf }]}
      className="space-y-4 animate-fade-in-up"
      // Create Sales Order action hidden — a sales order is only reachable from its
      // originating Lead or Deal. Restore by uncommenting the block + imports above
      // (and the empty-state action in `SalesOrdersTable`).
      // actions={
      //   <PermissionGuard required={[...crmCan.writeSo]}>
      //     <Button onClick={list.goToNew}>
      //       <Plus className="size-4 mr-1.5" />
      //       {S.page.create}
      //     </Button>
      //   </PermissionGuard>
      // }
    >
      <SalesOrdersTable list={list} />
    </ListPageShell>
  )
}

export default SalesOrdersPage
