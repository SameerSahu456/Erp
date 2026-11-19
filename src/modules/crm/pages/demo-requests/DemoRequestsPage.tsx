import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { DEMO_REQUESTS_STRINGS as S } from "../../components/demo-requests/demo-requests.strings"
import { DemoRequestsTable } from "../../components/demo-requests/DemoRequestsTable"
import { useDemoRequestsList } from "../../hooks/demo-requests/useDemoRequestsList"

function DemoRequestsPage() {
  const list = useDemoRequestsList()

  return (
    <ListPageShell
      title={S.list.pageTitle}
      subtitle={S.list.pageSubtitle}
      breadcrumbs={[{ label: S.list.breadcrumbCrm }, { label: S.list.breadcrumbDemoRequests }]}
      className="animate-fade-in-up"
      actions={
        <PermissionGuard required={[...crmCan.writeDr]}>
          <Button onClick={list.openDemoNew}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.newDemoRequest}
          </Button>
        </PermissionGuard>
      }
      stats={<StatsRow stats={list.kpiStats} />}
    >
      <DemoRequestsTable list={list} />
    </ListPageShell>
  )
}

export { DemoRequestsPage }
export default DemoRequestsPage
