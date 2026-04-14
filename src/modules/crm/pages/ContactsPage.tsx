import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"

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
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    accountName: c.accountName,
    title: c.title,
    lastContact: c.lastContact,
  })),
}

const contactCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "name" && typeof value === "string") {
    return {
      display: <Link to={`/crm/contacts/${row["id"]}`} className="text-primary hover:underline font-medium">{value}</Link>,
    }
  }
  return null
}

function ContactsPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Contacts</h2>
        <Button onClick={() => navigate("/crm/contacts/new")}>
          <Plus className="mr-1 size-4" />
          Add Contact
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[contactsTab]}
        cellFormatter={contactCellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default ContactsPage
