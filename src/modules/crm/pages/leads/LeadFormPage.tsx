import { FormPageShell } from "@/components/page-shells"

import { LeadFormBody } from "../../components/leads/LeadFormBody"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"
import { useLeadForm } from "../../hooks/leads/useLeadForm"

function LeadFormPage() {
  const f = useLeadForm()
  const { formTitle, isEdit, leadQuery, backHref, handleSave, handleCancel, loadingLead, isSaving, isDirty } = f

  return (
    <FormPageShell
      title={formTitle}
      subtitle={
        isEdit
          ? S.form.editSubtitle
          : S.form.newSubtitle
      }
      breadcrumbs={
        isEdit
          ? [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbLeads, href: "/crm/leads" },
              { label: leadQuery.data?.contact_name ?? leadQuery.data?.company_name ?? S.form.breadcrumbLeadFallback },
              { label: S.form.breadcrumbEdit },
            ]
          : [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbLeads, href: "/crm/leads" },
              { label: S.form.breadcrumbNewLead },
            ]
      }
      backHref={backHref}
      onSave={handleSave}
      onCancel={handleCancel}
      canSave={!loadingLead}
      saving={isSaving}
      saveLabel={isEdit ? S.form.saveChanges : S.form.createLead}
      isDirty={isDirty}
    >
      <LeadFormBody f={f} />
    </FormPageShell>
  )
}

export default LeadFormPage
