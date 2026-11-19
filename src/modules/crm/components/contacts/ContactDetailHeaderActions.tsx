import { Link } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import type { ContactResponse } from "../../api"
import { CONTACTS_STRINGS } from "./contacts.strings"

interface ContactDetailHeaderActionsProps {
  contact: ContactResponse
  onDeleteClick: () => void
}

export function ContactDetailHeaderActions({ contact, onDeleteClick }: ContactDetailHeaderActionsProps) {
  return (
    <>
      <PermissionGuard required={[...crmCan.writeContact]}>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/crm/contacts/${contact.id}/edit`} />}
        >
          <Pencil className="mr-1 size-3.5" />
          {CONTACTS_STRINGS.detail.actions.edit}
        </Button>
      </PermissionGuard>
      <PermissionGuard required={[...crmCan.deleteContact]}>
        <Button
          variant="danger-light"
          size="sm"
          onClick={onDeleteClick}
        >
          <Trash2 className="mr-1 size-3.5" />
          {CONTACTS_STRINGS.detail.actions.delete}
        </Button>
      </PermissionGuard>
    </>
  )
}
