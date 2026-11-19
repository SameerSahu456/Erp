import { FormPageShell } from "@/components/page-shells"

import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

interface MIFormMessageShellProps {
  title: string
  lastCrumb: string
  message: string
  tone?: "muted" | "danger"
  backHref?: string
}

// Shared loading / not-found shell for the Material Inquiry form page.
export function MIFormMessageShell({
  title,
  lastCrumb,
  message,
  tone = "muted",
  backHref = "/crm/material-inquiries",
}: MIFormMessageShellProps) {
  return (
    <FormPageShell
      title={title}
      breadcrumbs={[
        { label: S.form.breadcrumbCrm },
        { label: S.form.breadcrumbSelf, href: backHref },
        { label: lastCrumb },
      ]}
      backHref={backHref}
      canSave={false}
    >
      {tone === "danger" ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
          {message}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {message}
        </div>
      )}
    </FormPageShell>
  )
}
