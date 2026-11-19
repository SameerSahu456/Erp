import { FormPageShell } from "@/components/page-shells"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { Typography } from "@/components/ui/typography"

import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"
import { AccountFormBody } from "../../components/accounts/AccountFormBody"
import { useAccountForm } from "../../hooks/accounts/useAccountForm"

function AccountFormPage() {
  const form = useAccountForm()

  // Hold the form behind the loading screen until BOTH the data has arrived
  // AND we've copied it into local state, to avoid Select primitives mounting
  // uncontrolled then flipping to controlled (base-ui keeps the placeholder).
  if (form.isEdit && (form.isLoadingAccount || !form.hydrated)) {
    return (
      <FormPageShell
        title={S.form.editTitle}
        subtitle={S.form.editLoadingSubtitle}
        breadcrumbs={[
          { label: S.breadcrumbs.crm },
          { label: S.breadcrumbs.accounts, href: "/crm/accounts" },
          { label: S.breadcrumbs.edit },
        ]}
        backHref="/crm/accounts"
        canSave={false}
      >
        <FormCardSkeleton sections={3} rows={5} />
      </FormPageShell>
    )
  }
  if (form.isEdit && form.isAccountError) {
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
      title={form.isEdit ? `${S.form.editTitlePrefix}${form.existing?.name ?? ""}` : S.form.createByKind[form.createKind].title}
      subtitle={form.isEdit ? S.form.editSubtitle : S.form.createByKind[form.createKind].subtitle}
      breadcrumbs={
        form.isEdit
          ? [
              { label: S.breadcrumbs.crm },
              { label: S.breadcrumbs.accounts, href: "/crm/accounts" },
              { label: form.existing?.name ?? "", href: `/crm/accounts/${form.accountId}` },
              { label: S.breadcrumbs.edit },
            ]
          : [
              { label: S.breadcrumbs.crm },
              { label: S.breadcrumbs.accounts, href: "/crm/accounts" },
              { label: S.form.createByKind[form.createKind].breadcrumb },
            ]
      }
      backHref={form.backHref}
      onSave={form.handleSave}
      onCancel={form.handleCancel}
      canSave={form.canSave}
      saveLabel={form.isEdit ? S.form.saveChanges : S.form.createByKind[form.createKind].save}
      isDirty={form.isDirty}
    >
      <AccountFormBody form={form} />
    </FormPageShell>
  )
}

export { AccountFormPage }
export default AccountFormPage
