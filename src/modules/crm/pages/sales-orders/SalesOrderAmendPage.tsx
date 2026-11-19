import { AlertTriangle, Loader2 } from "lucide-react"

import { FormPageShell } from "@/components/page-shells"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"

import { SalesOrderFormBody } from "../../components/sales-orders/form/SalesOrderFormBody"
import { SALES_ORDERS_STRINGS as S } from "../../components/sales-orders/sales-orders.strings"
import { useSalesOrderForm } from "../../hooks/sales-orders/useSalesOrderForm"

// Amend page for an "Account Rejected" sales order. It renders the SAME form as
// the SO edit page (account, contact/addresses, line items, terms) via
// `useSalesOrderForm({ amend: true })` — but the account starts BLANK so the
// operator re-points the order onto an approved account, while line items and
// every account-independent field prefill from the source SO. The amend reason
// is captured by the detail-page modal and carried in via router state. On save
// the hook POSTs /revise (full-replace items + customer-FK swap) and spawns a
// new revision; see useSalesOrderForm.handleSave.
function SalesOrderAmendPage() {
  const f = useSalesOrderForm({ amend: true })
  const {
    soId,
    existing,
    soQuery,
    backHref,
    saving,
    isDirty,
    amendReason,
    handleSave,
    navigate,
  } = f

  const detailHref = soId ? `/crm/sales-orders/${soId}` : backHref
  const baseCrumbs = [
    { label: S.form.breadcrumbCrm },
    { label: S.form.breadcrumbSelf, href: backHref },
  ]

  if (soQuery.isLoading && !existing) {
    return (
      <FormPageShell
        title={S.form.titleLoading}
        breadcrumbs={[...baseCrumbs, { label: S.form.breadcrumbLoading }]}
        backHref={backHref}
        hideFooter
      >
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
          {S.form.loadingSo}
        </div>
      </FormPageShell>
    )
  }

  if (soQuery.isError || !existing) {
    return (
      <FormPageShell
        title={S.form.titleNotFound}
        breadcrumbs={[...baseCrumbs, { label: S.form.breadcrumbNotFound }]}
        backHref={backHref}
        hideFooter
      >
        <Typography variant="body" tone="danger" align="center" asChild>
          <div className="px-4 py-12">{S.form.loadError}</div>
        </Typography>
      </FormPageShell>
    )
  }

  return (
    <FormPageShell
      title={`Amend ${existing.order_number}`}
      subtitle={S.form.subtitleItems(
        existing.items.length,
        formatINR(existing.grand_total),
      )}
      breadcrumbs={[
        ...baseCrumbs,
        { label: existing.order_number, href: detailHref },
        { label: "Amend" },
      ]}
      status={{ label: "Account Rejected", variant: "error" }}
      backHref={detailHref}
      onSave={() => handleSave()}
      onCancel={() => navigate(detailHref)}
      saving={saving}
      saveLabel="Amend Sales Order"
      isDirty={isDirty}
    >
      {/* Why we're here — the source account was rejected. Re-point onto an
          approved account below; line items carry over and stay editable. */}
      <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning dark:border-warning/40 dark:bg-warning/15">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This sales order&apos;s account was <strong>rejected</strong>.
            Re-point it onto an <strong>approved</strong> account, then pick that
            account&apos;s contact and addresses. Line items and terms carried
            over from the original and stay editable — your changes save onto a
            new revision.
            {amendReason.trim() && (
              <span className="mt-1 block text-muted-foreground">
                Reason: {amendReason.trim()}
              </span>
            )}
          </span>
        </span>
      </div>

      <SalesOrderFormBody f={f} />
    </FormPageShell>
  )
}

export { SalesOrderAmendPage }
export default SalesOrderAmendPage
