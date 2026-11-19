import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import { ContactsTable } from "../../components/contacts/ContactsTable"
import { useContactsList } from "../../hooks/contacts/useContactsList"

function ContactsPage() {
  const list = useContactsList()

  return (
    <ListPageShell
      title={CONTACTS_STRINGS.list.title}
      subtitle={CONTACTS_STRINGS.list.subtitle}
      breadcrumbs={[
        { label: CONTACTS_STRINGS.breadcrumbs.crm },
        { label: CONTACTS_STRINGS.breadcrumbs.contacts },
      ]}
      actions={
        <PermissionGuard required={[...crmCan.writeContact]}>
          <Button onClick={list.openContactNew} className="h-9">
            <Plus className="mr-1 size-4" />
            {CONTACTS_STRINGS.list.addContact}
          </Button>
        </PermissionGuard>
      }
      className="animate-fade-in-up"
    >
      <ContactsTable list={list} />
    </ListPageShell>
  )
}

export default ContactsPage
