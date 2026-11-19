import { FormPageShell } from "@/components/page-shells"
import { Typography } from "@/components/ui/typography"

import { QUOTES_STRINGS as S } from "./quotes.strings"

interface QuoteFormMessageShellProps {
  title: string
  lastCrumb: string
  message: React.ReactNode
  tone?: "muted" | "danger"
}

// Shared loading / not-found shell for the Quote form page — a FormPageShell
// with a centered message and a footer-less frame.
export function QuoteFormMessageShell({
  title,
  lastCrumb,
  message,
  tone = "muted",
}: QuoteFormMessageShellProps) {
  return (
    <FormPageShell
      title={title}
      breadcrumbs={[
        { label: S.form.breadcrumbCrm },
        { label: S.form.breadcrumbQuotes, href: "/crm/quotes" },
        { label: lastCrumb },
      ]}
      backHref="/crm/quotes"
      hideFooter
    >
      <Typography variant="body" tone={tone} align="center" asChild>
        <div className="px-4 py-12">{message}</div>
      </Typography>
    </FormPageShell>
  )
}
