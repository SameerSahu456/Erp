import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { FormPageShell } from "@/components/page-shells"

import { PurchaseRequestFormBody } from "../../components/purchase-requests/PurchaseRequestFormBody"
import { PURCHASE_REQUESTS_STRINGS } from "../../components/purchase-requests/purchase-requests.strings"
import { usePurchaseRequestForm } from "../../hooks/purchase-requests/usePurchaseRequestForm"

const FORM_STRINGS = PURCHASE_REQUESTS_STRINGS.form

function PurchaseRequestFormPage() {
  const form = usePurchaseRequestForm()
  // Recompute the alias locally so TS narrows `existingPR` under `isEdit`.
  const { existingPR, linkedSO } = form
  const isEdit = !!existingPR

  return (
    <FormPageShell
      title={isEdit ? FORM_STRINGS.editTitle(existingPR.prNumber) : FORM_STRINGS.createTitle}
      subtitle={isEdit ? FORM_STRINGS.editSubtitle : FORM_STRINGS.createSubtitle}
      breadcrumbs={
        isEdit
          ? [
              { label: FORM_STRINGS.breadcrumbCrm },
              { label: FORM_STRINGS.breadcrumbSelf, href: "/crm/purchase-requests" },
              { label: existingPR.prNumber },
              { label: FORM_STRINGS.breadcrumbEdit },
            ]
          : [
              { label: FORM_STRINGS.breadcrumbCrm },
              { label: FORM_STRINGS.breadcrumbSelf, href: "/crm/purchase-requests" },
              { label: FORM_STRINGS.breadcrumbNew },
            ]
      }
      status={{ label: form.status, variant: form.statusVariant }}
      meta={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">{FORM_STRINGS.prNumberLabel}</span>
            <span className="text-sm font-medium">{form.prNumber}</span>
          </div>
          {linkedSO && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">{FORM_STRINGS.linkedSoLabel}</span>
              <Link
                to={`/crm/sales-orders/${linkedSO.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                {linkedSO.orderNumber}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">{FORM_STRINGS.requestedByMetaLabel}</span>
            <span className="text-sm">{form.requestedBy}</span>
          </div>
        </div>
      }
      backHref={form.backHref}
      guard={form.guard}
      footerActions={
        <>
          <Button variant="outline" onClick={form.handleCancel}>
            {FORM_STRINGS.cancel}
          </Button>
          <Button variant="outline" onClick={form.handleSaveDraft}>
            {FORM_STRINGS.saveDraft}
          </Button>
          <Button onClick={form.handleSubmit}>
            {FORM_STRINGS.submit}
          </Button>
        </>
      }
    >
      <PurchaseRequestFormBody form={form} />
    </FormPageShell>
  )
}

export { PurchaseRequestFormPage }

export default PurchaseRequestFormPage
