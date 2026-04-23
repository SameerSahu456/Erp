import { useMemo } from "react"
import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    { key: "accounts", label: "Accounts", sortable: true },
    { key: "designation", label: "Designation", sortable: true },
    { key: "department", label: "Department", sortable: true, filterable: true },
    { key: "preferred", label: "Preferred", sortable: true },
    { key: "lastContact", label: "Last Contact", sortable: true },
  ],
  data: contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    accounts: (c.accountNames ?? [c.accountName]).join(', '),
    designation: c.designation,
    department: c.department ?? '',
    preferred: c.preferredContact ? 'Yes' : 'No',
    lastContact: c.lastContact,
  })),
}

const contactCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "accounts" && typeof value === "string" && value) {
    const names = value.split(', ')
    if (names.length > 1) {
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {names.map((name) => (
              <Badge key={name} variant="outline" size="sm" className="text-[10px]">{name}</Badge>
            ))}
          </div>
        ),
      }
    }
  }
  if (key === "preferred" && value === "Yes") {
    return {
      display: <Badge variant="success-soft" size="sm">Preferred</Badge>,
    }
  }
  if (key === "preferred" && value === "No") {
    return {
      display: <span className="text-muted-foreground text-xs">—</span>,
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
        persistKey="crm-contacts"
        onRowClick={(row) => navigate(`/crm/contacts/${row.id}`)}
      />
    </div>
  )
}

export default ContactsPage
