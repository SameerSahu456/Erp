import { useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"

import { invoices } from "@/modules/crm/data/invoices"
import type { Invoice } from "@/modules/crm/types"
import { InvoiceDetailDialog } from "../../components/invoices/InvoiceDetailDialog"
import { InvoicesTable } from "../../components/invoices/InvoicesTable"
import { CRM_INVOICES_STRINGS } from "../../components/invoices/invoices.strings"

const S = CRM_INVOICES_STRINGS.list

function InvoicesPage() {
  const navigate = useNavigate()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleInvoiceClick = (invoiceNumber: string) => {
    const inv = invoices.find((i) => i.invoiceNumber === invoiceNumber)
    if (inv) {
      setSelectedInvoice(inv)
      setDialogOpen(true)
    }
  }

  return (
    <>
      <ListPageShell
        title={S.title}
        subtitle={S.subtitle}
        breadcrumbs={[{ label: S.breadcrumbCrm }, { label: S.breadcrumbInvoices }]}
        className="p-3 sm:p-4 lg:p-6 animate-fade-in-up"
        actions={
          <Button onClick={() => navigate("/crm/invoices/new")}>
            <Plus className="mr-1 size-4" />
            {S.create}
          </Button>
        }
      >
        <InvoicesTable
          onInvoiceClick={handleInvoiceClick}
          onRowClick={(id) => navigate(`/crm/invoices/${id}/edit`)}
          onCreate={() => navigate("/crm/invoices/new")}
        />
      </ListPageShell>

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}

export default InvoicesPage
