import { FormPageShell } from "@/components/page-shells"
import { Typography } from "@/components/ui/typography"

import { DEMO_REQUESTS_STRINGS as S, EN_IN_LOCALE } from "../../components/demo-requests/demo-requests.strings"
import { DemoRequestFormBody } from "../../components/demo-requests/DemoRequestFormBody"
import { useDemoRequestForm } from "../../hooks/demo-requests/useDemoRequestForm"

function DemoRequestFormPage() {
  const form = useDemoRequestForm()

  return (
    <FormPageShell
      title={S.form.title}
      subtitle={S.form.subtitle}
      breadcrumbs={[
        { label: S.form.breadcrumbCrm },
        { label: S.form.breadcrumbDemoRequests, href: "/crm/demo-requests" },
        { label: S.form.breadcrumbNew },
      ]}
      backHref="/crm/demo-requests"
      badges={
        <Typography variant="mono" tone="muted" asChild>
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5">
            {form.demoNumber}
          </span>
        </Typography>
      }
      onSave={form.handleSubmit}
      onCancel={form.goBack}
      saveLabel={S.form.saveLabel}
      saving={form.submitInFlight}
      canSave={form.isFormValid}
      isDirty={form.isDirty}
      footerLeft={
        form.isFormValid ? (
          <span>
            {S.form.footerSummary(form.totalQty)}
            <span className="font-medium tabular-nums text-foreground">
              ₹{form.totalAmount.toLocaleString(EN_IN_LOCALE)}
            </span>
          </span>
        ) : undefined
      }
    >
      <DemoRequestFormBody form={form} />
    </FormPageShell>
  )
}

export { DemoRequestFormPage }
export default DemoRequestFormPage
