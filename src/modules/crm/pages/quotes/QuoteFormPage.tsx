import { FormPageShell } from "@/components/page-shells"

import { QuoteBuilderPanel } from "../../components/quotes/QuoteBuilderPanel"
import { QuoteFormHeaderActions } from "../../components/quotes/QuoteFormHeaderActions"
import { QuoteFormMessageShell } from "../../components/quotes/QuoteFormMessageShell"
import { ViewOnlyBanner } from "../../components/shared/ViewOnlyBanner"
import { QUOTES_STRINGS as S } from "../../components/quotes/quotes.strings"
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_VARIANT } from "../../constants/quote-status"
import { useQuoteForm } from "../../hooks/quotes/useQuoteForm"

function QuoteFormPage() {
  const form = useQuoteForm()
  const { isEdit, viewOnly, mentionViewOnly, quote, quoteQuery, prefillGuard, status } = form

  if (isEdit) {
    if (quoteQuery.isLoading && !quote) {
      return (
        <QuoteFormMessageShell
          title={S.form.loadingTitle}
          lastCrumb={S.form.loadingTitle}
          message={S.form.fetchingQuote}
        />
      )
    }
    if (quoteQuery.isError || !quote) {
      return (
        <QuoteFormMessageShell
          title={S.form.notFoundTitle}
          lastCrumb={S.form.notFoundCrumb}
          tone="danger"
          message={S.form.notFoundMessage}
        />
      )
    }
  }

  // Create-mode prefill validation — runs only when deep-linked with a
  // ?leadId / ?dealId / ?accountId.
  if (!isEdit && prefillGuard.isChecking) {
    return (
      <QuoteFormMessageShell
        title={S.form.loadingTitle}
        lastCrumb={S.form.newQuoteCrumb}
        message={S.form.checkingLinkedRecord}
      />
    )
  }

  if (!isEdit && prefillGuard.notFound) {
    return (
      <QuoteFormMessageShell
        title={S.form.prefillNotFoundTitle(prefillGuard.notFound.entity)}
        lastCrumb={S.form.notFoundCrumb}
        tone="danger"
        message={S.form.prefillNotFoundMessage(prefillGuard.notFound.entity)}
      />
    )
  }

  return (
    <FormPageShell
      title={isEdit && quote ? quote.quote_number : S.form.createTitle}
      // The edit title is the quote number — click to copy it.
      titleCopyable={isEdit && !!quote}
      subtitle={
        isEdit && quote
          ? S.form.editSubtitle(quote.quotable_type, quote.items.length)
          : S.form.createSubtitle
      }
      breadcrumbs={
        isEdit && quote
          ? [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbQuotes, href: "/crm/quotes" },
              { label: quote.quote_number },
            ]
          : [
              { label: S.form.breadcrumbCrm },
              { label: S.form.breadcrumbQuotes, href: "/crm/quotes" },
              { label: S.form.newQuoteCrumb },
            ]
      }
      status={isEdit && quote ? { label: QUOTE_STATUS_LABELS[status] ?? status, variant: QUOTE_STATUS_VARIANT[status] ?? "neutral" } : undefined}
      backHref="/crm/quotes"
      hideFooter
      // View-only mode is read-only — nothing to save/discard, so never arm the
      // unsaved-changes guard. Otherwise a stray `panelDirty` from the builder
      // panel makes deliberate navigations (Convert-to-SO, back) pop the
      // "discard changes?" dialog.
      isDirty={viewOnly ? false : form.panelDirty}
      actions={
        // Mention-only access: no Edit / Amend / Convert-to-SO.
        isEdit && quote && !mentionViewOnly ? (
          <QuoteFormHeaderActions
            quote={quote}
            viewOnly={viewOnly}
            amendMode={form.amendMode}
            status={status}
            onEdit={() => form.navigate(`/crm/quotes/${quote.id}/edit`)}
            onAmend={form.handleAmend}
            onCancelAmend={() => form.setAmendMode(false)}
            // Convert-to-SO is a view-mode-only action. The /edit route
            // is for amending the quote itself; jumping to an SO from a
            // mid-edit form would silently drop unsaved changes.
            onConvertToSO={viewOnly ? form.handleConvertToSO : undefined}
          />
        ) : null
      }
    >
      {mentionViewOnly && (
        <ViewOnlyBanner
          title={S.form.viewOnlyTitle}
          description={S.form.viewOnlyMentioned}
        />
      )}
      {/* `key` forces a remount when the quote id changes (e.g. after Amend
          creates a new version) so the panel's internal lineItems state
          re-initializes from the new quote. */}
      <QuoteBuilderPanel
        key={quote?.id ?? "new"}
        leadId={form.prefill?.leadId}
        dealId={form.prefill?.dealId}
        accountId={form.prefill?.accountId}
        existing={quote}
        amendMode={form.amendMode}
        onCancelAmend={() => form.setAmendMode(false)}
        viewOnly={viewOnly}
        onDirtyChange={form.setPanelDirty}
      />
    </FormPageShell>
  )
}

export { QuoteFormPage }
export default QuoteFormPage
