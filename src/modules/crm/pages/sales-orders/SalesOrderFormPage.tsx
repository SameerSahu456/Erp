import { useCallback, useState } from 'react'
import { Loader2, Save, Send } from 'lucide-react'

import { FormPageShell } from '@/components/page-shells'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatINR } from '@/lib/currency'

import { SalesOrderFormBody } from '../../components/sales-orders/form/SalesOrderFormBody'
import { SALES_ORDERS_STRINGS as S } from '../../components/sales-orders/sales-orders.strings'
import { SO_STATUS_LABELS, SO_STATUS_VARIANT } from '../../constants/so-status'
import { useSalesOrderForm } from '../../hooks/sales-orders/useSalesOrderForm'

function SalesOrderFormPage() {
  const f = useSalesOrderForm()
  const {
    isEdit, soQuery, existing, backHref, prefillGuard, soId,
    sourceMode, saving, readOnly, status, isDirty,
    handleSave, navigate,
  } = f

  // Leaving this form addresses its parent directly — never `navigate(-1)`.
  //
  // The shell's default is `useNavigateBack(backHref)`, which pops history when
  // the app has an entry to pop. With the form dirty, `useUnsavedChangesGuard`
  // has pushed a no-op SENTINEL entry on the form's OWN url, so the pop
  // consumed the sentinel and the user never left the page at all.
  //
  // The parent of a CREATE is the SO list (`toList`); the parent of an EDIT is
  // the order being edited (`toRecord`, below) — Edit is opened from the SO
  // view, so Back returns there, not to the list.
  //
  // Still routed through the shell's unsaved-changes guard — `FormPageShell`
  // wraps any consumer `onBack`/`onCancel` in `guard.attempt`, so a dirty form
  // prompts to discard first and only leaves once that is confirmed.
  const toList = useCallback(() => navigate(backHref), [navigate, backHref])

  // BACK and CANCEL on an edit return to the RECORD you were editing, not to
  // the list — leaving an edit should land on the order you chose to open.
  //
  // `backHref` cannot express this: `useSalesOrderForm` hardcodes it to the
  // list for BOTH create and edit (unlike `useDealForm`, which uses the record
  // in edit mode), and it is also the href of the "Sales Orders" breadcrumb, so
  // it has to stay pointing at the list. Hence a separate destination.
  //
  // A create has no record yet, so it falls back to the list.
  const toRecord = useCallback(
    () => navigate(soId ? `/crm/sales-orders/${soId}` : backHref),
    [navigate, soId, backHref],
  )

  // Tracks which CREATE button is in flight so only the clicked button shows a
  // spinner (both stay disabled while either is saving). Edit mode keeps the
  // shell's default single Save button, so this stays null there.
  const [saveIntent, setSaveIntent] = useState<'Draft' | 'Submitted' | null>(null)
  // Externally-owned guard so the custom create-mode footer's Cancel shares the
  // same unsaved-changes prompt the shell uses for the back-arrow (§ shell docs).
  //
  // CREATE MODE ONLY — hence `isEdit ? false : isDirty`. The hook must still run
  // on every render (hooks rule), but in edit mode this guard is handed to
  // nobody: line ~165 passes `guard={undefined}`, so the shell builds its OWN
  // guard from `isDirty` and renders that one's dialog. Feeding this one a live
  // `isDirty` as well produced TWO active guards on the edit form — each
  // pushing its own history sentinel and each answering `popstate`. Measured on
  // /edit: a single dirty keystroke pushed SEVEN sentinels. Back then had to be
  // pressed once per sentinel, "Discard" popped only one of them so it appeared
  // to do nothing, and Cancel could not leave the form either. FormPageShell
  // guards the mirror-image case the same way and for the same reason.
  const createGuard = useUnsavedChangesGuard({ isDirty: isEdit ? false : isDirty })

  async function runSave(intent: 'Draft' | 'Submitted') {
    setSaveIntent(intent)
    try {
      await handleSave(intent)
    } finally {
      setSaveIntent(null)
    }
  }

  // ── Edit-mode guards ─────────────────────────────────────────────────
  if (isEdit && soQuery.isLoading && !existing) {
    return (
      <FormPageShell
        title={S.form.titleLoading}
        breadcrumbs={[
          { label: S.form.breadcrumbCrm },
          { label: S.form.breadcrumbSelf, href: backHref },
          { label: S.form.breadcrumbLoading },
        ]}
        backHref={backHref}
        onBack={toList}
        hideFooter
      >
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
          {S.form.loadingSo}
        </div>
      </FormPageShell>
    )
  }

  if (isEdit && (soQuery.isError || !existing)) {
    return (
      <FormPageShell
        title={S.form.titleNotFound}
        breadcrumbs={[
          { label: S.form.breadcrumbCrm },
          { label: S.form.breadcrumbSelf, href: backHref },
          { label: S.form.breadcrumbNotFound },
        ]}
        backHref={backHref}
        onBack={toList}
        hideFooter
      >
        <Typography variant="body" tone="danger" align="center" asChild>
          <div className="px-4 py-12">
            {S.form.loadError}
          </div>
        </Typography>
      </FormPageShell>
    )
  }

  // Create-mode prefill validation — runs only when the form was deep-linked
  // with a ?quoteId / ?accountId / ?leadId / ?dealId. Block on the in-flight
  // check, then bail to a "not found" shell if the linked record's id
  // doesn't resolve.
  if (!isEdit && prefillGuard.isChecking) {
    return (
      <FormPageShell
        title={S.form.titleLoading}
        breadcrumbs={[
          { label: S.form.breadcrumbCrm },
          { label: S.form.breadcrumbSelf, href: backHref },
          { label: S.form.breadcrumbLoading },
        ]}
        backHref={backHref}
        onBack={toList}
        hideFooter
      >
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
          {S.form.checkingLinked}
        </div>
      </FormPageShell>
    )
  }

  if (!isEdit && prefillGuard.notFound) {
    return (
      <FormPageShell
        title={S.form.notFoundEntity(prefillGuard.notFound.entity)}
        breadcrumbs={[
          { label: S.form.breadcrumbCrm },
          { label: S.form.breadcrumbSelf, href: backHref },
          { label: S.form.breadcrumbNotFound },
        ]}
        backHref={backHref}
        onBack={toList}
        hideFooter
      >
        <Typography variant="body" tone="danger" align="center" asChild>
          <div className="px-4 py-12">
            {S.form.linkedNotFound(prefillGuard.notFound.entity.toLowerCase())}
          </div>
        </Typography>
      </FormPageShell>
    )
  }

  return (
    <FormPageShell
      title={isEdit && existing ? existing.order_number : S.form.titleCreate}
      subtitle={
        isEdit && existing
          ? S.form.subtitleItems(existing.items.length, formatINR(existing.grand_total))
          : sourceMode === 'from-quote'
            ? S.form.subtitleFromQuote
            : S.form.subtitleDirect
      }
      breadcrumbs={
        isEdit && existing
          ? [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbSelf, href: backHref },
              { label: existing.order_number },
            ]
          : [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbSelf, href: backHref },
              { label: S.form.breadcrumbNew },
            ]
      }
      status={
        isEdit && existing
          ? { label: SO_STATUS_LABELS[status] ?? status, variant: SO_STATUS_VARIANT[status] ?? "neutral" }
          : undefined
      }
      backHref={backHref}
      // The back ARROW mirrors Cancel: the SO view on edit, the list on create.
      onBack={isEdit ? toRecord : toList}
      // Edit mode keeps the shell's single Save button. Create mode renders a
      // custom Save-as-Draft / Submit-for-Approval pair (footerActions) and
      // owns the unsaved-changes guard so its Cancel shares the same prompt.
      onSave={() => handleSave()}
      onCancel={toRecord}
      saving={saving}
      canSave={!readOnly}
      saveLabel={S.form.saveEdit}
      isDirty={isDirty}
      guard={isEdit ? undefined : createGuard}
      footerActions={
        isEdit ? undefined : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => createGuard.attempt(toList)}
              disabled={saving}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => runSave('Draft')}
              disabled={saving}
              className="h-9 min-w-[140px]"
            >
              {saveIntent === 'Draft' ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-1.5 size-4" aria-hidden="true" />
              )}
              {saveIntent === 'Draft' ? 'Saving…' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              onClick={() => runSave('Submitted')}
              disabled={saving}
              className="h-9 min-w-[180px]"
            >
              {saveIntent === 'Submitted' ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="mr-1.5 size-4" aria-hidden="true" />
              )}
              {saveIntent === 'Submitted' ? 'Submitting…' : 'Submit for Approval'}
            </Button>
          </>
        )
      }
    >
      <SalesOrderFormBody f={f} />
    </FormPageShell>
  )
}

export { SalesOrderFormPage }
export default SalesOrderFormPage
