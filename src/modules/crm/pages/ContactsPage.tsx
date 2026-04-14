import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig } from "@/components/common/BusinessMetricsTable"

import { contacts } from "@/modules/crm/data/contacts"

const contactsTab: TabConfig = {
  id: "contacts",
  label: "All Contacts",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "accountName", label: "Account", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "lastContact", label: "Last Contact", sortable: true },
  ],
  data: contacts.map((c) => ({
    name: c.name,
    email: c.email,
    phone: c.phone,
    accountName: c.accountName,
    title: c.title,
    lastContact: c.lastContact,
  })),
}

function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Contacts</h2>
        <Button>
          <Plus className="mr-1 size-4" />
          Add Contact
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[contactsTab]}
        pageSize={10}
      />
    </div>
  )
}

export default ContactsPage
