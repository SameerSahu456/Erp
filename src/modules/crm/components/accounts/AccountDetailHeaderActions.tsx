import { Link } from "react-router-dom"
import { Pencil /* , Trash2 — Delete hidden */ } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

interface AccountDetailHeaderActionsProps {
  accountId: string
  onDeleteClick: () => void
}

export function AccountDetailHeaderActions({ accountId, onDeleteClick }: AccountDetailHeaderActionsProps) {
  return (
    <>
      <PermissionGuard required={[...crmCan.writeAccount]}>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/crm/accounts/${accountId}/edit`} />}
        >
          <Pencil className="mr-1 size-3.5" />
          {S.headerActions.edit}
        </Button>
      </PermissionGuard>
      {/* Delete is hidden for now (product decision) — uncomment to restore.
      <PermissionGuard required={[...crmCan.deleteAccount]}>
        <Button
          variant="danger-light"
          size="sm"
          onClick={onDeleteClick}
        >
          <Trash2 className="mr-1 size-3.5" />
          {S.headerActions.delete}
        </Button>
      </PermissionGuard>
      */}
    </>
  )
}
