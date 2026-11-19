import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { MaterialInquiriesTable } from "../../components/material-inquiries/MaterialInquiriesTable"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import { useMaterialInquiriesList } from "../../hooks/material-inquiries/useMaterialInquiriesList"

function MaterialInquiriesPage() {
  const list = useMaterialInquiriesList()

  return (
    <ListPageShell
      title={S.list.pageTitle}
      subtitle={S.list.pageSubtitle}
      breadcrumbs={[
        { label: S.list.breadcrumbCrm },
        { label: S.list.breadcrumbSelf },
      ]}
      actions={
        <PermissionGuard required={[...crmCan.writeMi]}>
          <Button onClick={list.openMiNew} className="h-9">
            <Plus className="mr-1 size-4" />
            {S.list.createAction}
          </Button>
        </PermissionGuard>
      }
      className="animate-fade-in-up"
    >
      <MaterialInquiriesTable list={list} />
    </ListPageShell>
  )
}

export { MaterialInquiriesPage }
export default MaterialInquiriesPage
