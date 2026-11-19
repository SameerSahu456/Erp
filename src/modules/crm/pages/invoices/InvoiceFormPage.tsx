import { Button } from "@/components/ui/button"
import { FormPageShell } from "@/components/page-shells"

import { InvoiceFormBody } from "../../components/invoices/InvoiceFormBody"
import { CRM_INVOICES_STRINGS } from "../../components/invoices/invoices.strings"
import { useInvoiceForm } from "../../hooks/invoices/useInvoiceForm"

const S = CRM_INVOICES_STRINGS.form

function InvoiceFormPage() {
  const form = useInvoiceForm()
  // Recompute the alias locally so TS narrows `existingInvoice` under `isEdit`
  // (aliased-condition narrowing needs both consts in this scope).
  const { existingInvoice } = form
  const isEdit = !!existingInvoice

  return (
    <FormPageShell
      title={isEdit ? S.editTitle(existingInvoice.invoiceNumber) : S.createTitle}
      subtitle={isEdit ? S.editSubtitle : S.createSubtitle}
      breadcrumbs={
        isEdit
          ? [
              { label: CRM_INVOICES_STRINGS.list.breadcrumbCrm },
              { label: CRM_INVOICES_STRINGS.list.breadcrumbInvoices, href: "/crm/invoices" },
              { label: existingInvoice.invoiceNumber },
              { label: S.editBreadcrumb },
            ]
          : [
              { label: CRM_INVOICES_STRINGS.list.breadcrumbCrm },
              { label: CRM_INVOICES_STRINGS.list.breadcrumbInvoices, href: "/crm/invoices" },
              { label: S.newInvoiceBreadcrumb },
            ]
      }
      backHref={form.backHref}
      guard={form.guard}
      footerActions={
        <>
          <Button variant="outline" onClick={form.handleCancel}>
            {S.cancel}
          </Button>
          <Button variant="outline" onClick={form.handleSaveDraft}>
            {S.saveDraft}
          </Button>
          <Button onClick={form.handleSendInvoice}>
            {S.sendInvoice}
          </Button>
        </>
      }
    >
      <InvoiceFormBody form={form} />
    </FormPageShell>
  )
}

export { InvoiceFormPage }
export default InvoiceFormPage
