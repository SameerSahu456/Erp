import { FormPageShell } from "@/components/page-shells"
import { Typography } from "@/components/ui/typography"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"

import { ContactFormBody } from "../../components/contacts/ContactFormBody"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import { useContactForm } from "../../hooks/contacts/useContactForm"

const S = CONTACTS_STRINGS

function ContactFormPage() {
  const form = useContactForm()

  if (form.isEdit && (form.isLoadingContact || !form.hydrated)) {
    return (
      <FormPageShell
        title={S.form.editTitleLoading}
        subtitle={S.form.subtitleLoading}
        breadcrumbs={[
          { label: S.breadcrumbs.crm },
          { label: S.breadcrumbs.contacts, href: "/crm/contacts" },
          { label: S.breadcrumbs.edit },
        ]}
        backHref="/crm/contacts"
        canSave={false}
      >
        <FormCardSkeleton sections={2} rows={5} />
      </FormPageShell>
    )
  }
  if (form.isEdit && form.isContactError) {
    return (
      <Typography variant="body" tone="danger" asChild>
        <div className="m-8 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          {S.form.loadError}
        </div>
      </Typography>
    )
  }

  return (
    <FormPageShell
      title={S.form.title(form.isEdit, form.existing?.name ?? "")}
      subtitle={S.form.subtitle(form.isEdit)}
      breadcrumbs={
        form.isEdit
          ? [
              { label: S.breadcrumbs.crm },
              { label: S.breadcrumbs.contacts, href: "/crm/contacts" },
              {
                label: form.existing?.name ?? "",
                href: `/crm/contacts/${form.contactId}`,
              },
              { label: S.breadcrumbs.edit },
            ]
          : [
              { label: S.breadcrumbs.crm },
              { label: S.breadcrumbs.contacts, href: "/crm/contacts" },
              { label: S.breadcrumbs.newContact },
            ]
      }
      backHref={form.backHref}
      onSave={form.handleSave}
      onCancel={form.handleCancel}
      canSave={form.canSave}
      saveLabel={S.form.saveLabel(form.isEdit)}
      isDirty={form.isDirty}
    >
      <ContactFormBody form={form} />
    </FormPageShell>
  )
}

export { ContactFormPage }
export default ContactFormPage
