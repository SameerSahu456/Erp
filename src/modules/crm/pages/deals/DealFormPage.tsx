import { FormPageShell } from "@/components/page-shells"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"

import { DealFormBody } from "../../components/deals/DealFormBody"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"
import { useDealForm } from "../../hooks/deals/useDealForm"

function DealFormPage() {
  const f = useDealForm()
  const { isEdit, isView, headerAccountName, existing, dealId, backHref, handleSave, goBack, canSave, isDirty, isLoadingDeal, isDealError, hydrated } = f

  if (isEdit && (isLoadingDeal || !hydrated)) {
    return (
      <FormPageShell
        title={DEALS_STRINGS.form.loadingTitle}
        subtitle={DEALS_STRINGS.form.loadingSubtitle}
        breadcrumbs={[
          { label: DEALS_STRINGS.form.breadcrumbCrm },
          { label: DEALS_STRINGS.form.breadcrumbDeals, href: "/crm/deals" },
          { label: DEALS_STRINGS.form.breadcrumbEdit },
        ]}
        backHref={backHref}
        canSave={false}
      >
        <FormCardSkeleton sections={3} rows={5} />
      </FormPageShell>
    )
  }
  if (isEdit && isDealError) {
    return (
      <div className="m-8 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {DEALS_STRINGS.form.loadError}
      </div>
    )
  }

  return (
    <FormPageShell
      title={
        isView
          ? DEALS_STRINGS.form.viewPageTitle(headerAccountName.toUpperCase())
          : isEdit
            ? DEALS_STRINGS.form.editPageTitle(headerAccountName.toUpperCase())
            : DEALS_STRINGS.form.newPageTitle
      }
      subtitle={
        isView
          ? DEALS_STRINGS.form.viewSubtitle
          : isEdit
            ? DEALS_STRINGS.form.editSubtitle
            : DEALS_STRINGS.form.newSubtitle
      }
      breadcrumbs={
        isEdit
          ? [
              { label: DEALS_STRINGS.form.breadcrumbCrm },
              { label: DEALS_STRINGS.form.breadcrumbDeals, href: "/crm/deals" },
              { label: existing?.title ?? "", href: `/crm/deals/${dealId}` },
              { label: isView ? DEALS_STRINGS.form.breadcrumbView : DEALS_STRINGS.form.breadcrumbEdit },
            ]
          : [
              { label: DEALS_STRINGS.form.breadcrumbCrm },
              { label: DEALS_STRINGS.form.breadcrumbDeals, href: "/crm/deals" },
              { label: DEALS_STRINGS.form.breadcrumbNewDeal },
            ]
      }
      backHref={backHref}
      onSave={handleSave}
      onCancel={goBack}
      canSave={canSave}
      saveLabel={isEdit ? DEALS_STRINGS.form.saveChanges : DEALS_STRINGS.form.createDeal}
      isDirty={isView ? false : isDirty}
      hideFooter={isView}
    >
      <DealFormBody f={f} />
    </FormPageShell>
  )
}

export default DealFormPage
