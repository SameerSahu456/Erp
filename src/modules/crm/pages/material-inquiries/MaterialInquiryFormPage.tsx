import { FormPageShell } from "@/components/page-shells"

import { MIFormBody } from "../../components/material-inquiries/MIFormBody"
import { MIFormFooterActions } from "../../components/material-inquiries/MIFormFooterActions"
import { MIFormMessageShell } from "../../components/material-inquiries/MIFormMessageShell"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import {
  MATERIAL_INQUIRY_STATUS_LABELS,
  MATERIAL_INQUIRY_STATUS_VARIANT,
} from "../../constants/material-inquiry-status"
import { useMaterialInquiryForm } from "../../hooks/material-inquiries/useMaterialInquiryForm"

function MaterialInquiryFormPage() {
  const form = useMaterialInquiryForm()
  const { isEdit, existing, detailQuery, prefillGuard, hydrated, status, backHref } = form

  // Loading screen for edit mode while detail fetches.
  if (isEdit && (detailQuery.isLoading || !hydrated)) {
    return (
      <MIFormMessageShell
        title={S.form.loadingTitle}
        lastCrumb={S.form.loadingCrumb}
        message={S.form.loadingMessage}
      />
    )
  }

  if (isEdit && (detailQuery.isError || !existing)) {
    return (
      <MIFormMessageShell
        title={S.form.notFoundTitle}
        lastCrumb={S.form.notFoundCrumb}
        tone="danger"
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : S.form.notFoundMessage
        }
      />
    )
  }

  // Create-mode prefill validation — runs only when deep-linked with a
  // ?leadId / ?dealId.
  if (!isEdit && prefillGuard.isChecking) {
    return (
      <MIFormMessageShell
        title={S.form.loadingTitle}
        lastCrumb={S.form.loadingCrumb}
        message={S.form.checkingLinkedMessage}
      />
    )
  }

  if (!isEdit && prefillGuard.notFound) {
    return (
      <MIFormMessageShell
        title={S.form.prefillNotFoundTitle(prefillGuard.notFound.entity)}
        lastCrumb={S.form.notFoundCrumb}
        tone="danger"
        message={S.form.prefillNotFoundMessage(prefillGuard.notFound.entity)}
      />
    )
  }

  return (
    <FormPageShell
      title={
        isEdit && existing
          ? S.form.pageTitleEdit(existing.enquiry_number)
          : S.form.pageTitleNew
      }
      subtitle={isEdit ? S.form.pageSubtitleEdit : S.form.pageSubtitleNew}
      breadcrumbs={
        isEdit && existing
          ? [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbSelf, href: backHref },
              { label: existing.enquiry_number },
              { label: S.form.breadcrumbEdit },
            ]
          : [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbSelf, href: backHref },
              { label: S.form.breadcrumbNew },
            ]
      }
      status={
        isEdit && existing
          ? {
              label: MATERIAL_INQUIRY_STATUS_LABELS[status] ?? status,
              variant: MATERIAL_INQUIRY_STATUS_VARIANT[status] ?? "neutral",
            }
          : undefined
      }
      backHref={backHref}
      onSave={form.handleSave}
      onCancel={form.goBack}
      canSave={form.canSave}
      saveLabel={isEdit ? S.form.saveChanges : S.form.createInquiry}
      isDirty={form.isDirty}
      guard={form.guard}
      footerActions={
        isEdit ? undefined : (
          <MIFormFooterActions
            isPending={form.isPending}
            canSave={form.canSave}
            onCancel={() => form.guard.attempt(form.goBack)}
            onSaveDraft={form.handleSave}
            onSubmit={form.handleSubmitToProcurement}
          />
        )
      }
    >
      <MIFormBody form={form} />
    </FormPageShell>
  )
}

export { MaterialInquiryFormPage }
export default MaterialInquiryFormPage
