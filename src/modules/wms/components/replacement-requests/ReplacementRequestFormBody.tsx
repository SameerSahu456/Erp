import { FormPageShell } from "@/components/page-shells"

import { useReplacementRequestForm } from "../../hooks/replacement-requests/useReplacementRequestForm"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { LIST_ROUTE } from "./replacement-request-form-helpers"
import { ReplacementOrderStep } from "./ReplacementOrderStep"
import { ReplacementUnitsStep } from "./ReplacementUnitsStep"
import { ReplacementModeStep } from "./ReplacementModeStep"
import { ReplacementIssueStep } from "./ReplacementIssueStep"

export function ReplacementRequestFormBody() {
  const form = useReplacementRequestForm()
  const { totalLines } = form

  return (
    <FormPageShell
      title={S.form.title}
      subtitle={S.form.subtitle}
      backHref={LIST_ROUTE}
      guard={form.guard}
      onCancel={form.navigateBack}
      onSave={() => void form.submit()}
      saveLabel={S.form.submit}
      saving={form.isSubmitting}
      canSave={totalLines > 0}
      footerLeft={totalLines > 0 ? S.form.units.fanOutHelp(totalLines) : undefined}
    >
      {/* One column, one spacing scale: numbered step cards stacked space-y-6,
          matching the Inward form's grammar (shared SectionCard). */}
      <div className="space-y-6">
        <ReplacementOrderStep form={form} />
        <ReplacementUnitsStep form={form} />
        <ReplacementModeStep form={form} />
        <ReplacementIssueStep form={form} />
      </div>
    </FormPageShell>
  )
}
