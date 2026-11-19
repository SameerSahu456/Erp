import { Fragment } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { AddressFormDialog } from '../AddressFormDialog'

import { ClosedWonAccountStep } from './ClosedWonAccountStep'
import { ClosedWonArtifactStep } from './ClosedWonArtifactStep'
import { CLOSE_WON_STRINGS } from './close-won.strings'
import { fmtCurrency } from '../../hooks/close-won/useClosedWonWizard'
import type { ClosedWonController } from '../../hooks/close-won/useClosedWonWizard'

export function ClosedWonWizardBody({ f }: { f: ClosedWonController }) {
  const {
    currentStep,
    soOrDemo,
    demoFormState,
    addAddressOpen,
    addAddressType,
    editingAddress,
    selectedBillingId,
    setCurrentStep,
    setAddAddressOpen,
    setEditingAddress,
    setEditingSource,
    contactError,
    duplicateAccount,
    entityCompany,
    entityName,
    existingAccountName,
    grandTotal,
    guardedBack,
    handleAddressSave,
    handleComplete,
    createSOMut,
    convertDemoMut,
    handleNext,
    hasDiscountError,
    incompleteLineItems,
    isAccountValid,
    isDemo,
    isLead,
    isOnAccountStep,
    isOnSOStep,
    isSOValid,
    showDemoToggle,
    totalSteps,
    unsavedGuard,
  } = f

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* ── Top bar (sticky, full-width) ── */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between gap-6 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={guardedBack}
              aria-label={CLOSE_WON_STRINGS.chrome.back}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                {isDemo ? CLOSE_WON_STRINGS.chrome.titleConvertDemo : CLOSE_WON_STRINGS.chrome.titleCloseWon} &mdash;{' '}
                {isLead
                  ? entityCompany || entityName
                  : isDemo
                    ? entityName
                    : existingAccountName || entityName}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isLead
                  ? soOrDemo === 'demo'
                    ? CLOSE_WON_STRINGS.chrome.subtitle.leadDemo
                    : CLOSE_WON_STRINGS.chrome.subtitle.leadSo
                  : isDemo
                    ? CLOSE_WON_STRINGS.chrome.subtitle.demoConvert(entityName)
                    : soOrDemo === 'demo'
                      ? CLOSE_WON_STRINGS.chrome.subtitle.dealDemo(existingAccountName || CLOSE_WON_STRINGS.chrome.subtitle.thisDeal)
                      : CLOSE_WON_STRINGS.chrome.subtitle.dealSo(existingAccountName || CLOSE_WON_STRINGS.chrome.subtitle.thisDeal)}
              </p>
            </div>
          </div>

          {/* Inline step indicator (md+) — built from a single config so the
              3-step lead path and 2-step deal path stay in lockstep. Demo
              source has only 1 step and renders no indicator. */}
          {totalSteps > 1 && (
            <div className="hidden items-center gap-2 md:flex">
              {(() => {
                const steps: { num: number; label: string }[] = []
                let n = 1
                if (isLead) steps.push({ num: n++, label: CLOSE_WON_STRINGS.chrome.stepAccount })
                // Step 2 is the artifact step. While the user is still on
                // the account step it is a pending Sales Order / Demo Request
                // choice; once on it, the label tracks the live selection.
                const artifactLabel = !showDemoToggle
                  ? CLOSE_WON_STRINGS.chrome.stepSalesOrder
                  : currentStep >= n
                    ? soOrDemo === 'demo'
                      ? CLOSE_WON_STRINGS.chrome.stepDemoRequest
                      : CLOSE_WON_STRINGS.chrome.stepSalesOrder
                    : CLOSE_WON_STRINGS.chrome.stepArtifactPending
                steps.push({ num: n, label: artifactLabel })
                return steps.map((s, idx) => {
                  const isPast = currentStep > s.num
                  const isCurrent = currentStep === s.num
                  // The immediate next step is clickable too — it routes through
                  // `handleNext`, which validates the current step and either
                  // advances or toasts what's missing (same as the footer
                  // "Continue" button). Past steps jump straight back.
                  const isNext = s.num === currentStep + 1
                  const isClickable = isPast || isNext
                  return (
                    <Fragment key={s.num}>
                      <button
                        type="button"
                        disabled={!isClickable}
                        onClick={() => {
                          if (isPast) setCurrentStep(s.num)
                          else if (isNext) handleNext()
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all',
                          isCurrent
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                            : isPast
                              ? 'cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400'
                              : isNext
                                ? 'cursor-pointer bg-muted text-muted-foreground hover:bg-muted/70'
                                : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                            isCurrent
                              ? 'bg-primary/15 text-primary'
                              : isPast
                                ? 'bg-emerald-600/20 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-400'
                                : 'bg-card text-muted-foreground',
                          )}
                        >
                          {isPast ? <Check className="size-3" strokeWidth={3} /> : s.num}
                        </span>
                        {s.label}
                      </button>
                      {idx < steps.length - 1 && (
                        <div
                          className={cn(
                            'h-px w-6 transition-colors',
                            isPast ? 'bg-emerald-500/50' : 'bg-border',
                          )}
                        />
                      )}
                    </Fragment>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content (full-width grid) ── */}
      {/* <div className="flex-1 px-6 py-6 pb-28"> */}
      <div className="flex-1  py-6 pb-28">
        <div className="mx-auto w-full max-w-[1600px]">

          {/* ════ Step 1: Account (leads only) ════ */}
          {isLead && currentStep === 1 && <ClosedWonAccountStep f={f} />}

          {/* ════ Sales Order / Demo Request step ════ */}
          <ClosedWonArtifactStep f={f} />
        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-6 py-3 shadow-[0_-4px_16px_-6px_rgb(var(--shadow-rgb)/0.06),0_-1px_0_rgb(var(--shadow-rgb)/0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="min-w-0 text-[12.5px]">
            {isOnAccountStep ? (
              (isAccountValid || Object.keys(duplicateAccount || {})?.length !== 0) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Check className="size-3.5" /> {showDemoToggle ? CLOSE_WON_STRINGS.chrome.status.accountReadyContinue : CLOSE_WON_STRINGS.chrome.status.accountReadyToSo}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {contactError ?? CLOSE_WON_STRINGS.chrome.status.fillAccountFields}
                </span>
              )
            ) : isOnSOStep ? (
              soOrDemo === 'demo' ? (
                demoFormState.isValid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Check className="size-3.5" /> {CLOSE_WON_STRINGS.chrome.status.demoReady(demoFormState.summary)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{CLOSE_WON_STRINGS.chrome.status.demoIncomplete}</span>
                )
              ) : isSOValid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Check className="size-3.5" /> {CLOSE_WON_STRINGS.chrome.status.orderReady(fmtCurrency(grandTotal))}
                </span>
              ) : hasDiscountError ? (
                <span className="text-destructive">{CLOSE_WON_STRINGS.chrome.status.discountError}</span>
              ) : incompleteLineItems.length > 0 ? (
                <span className="text-destructive">
                  {CLOSE_WON_STRINGS.chrome.status.incompleteItems(incompleteLineItems.length)}
                </span>
              ) : !selectedBillingId ? (
                <span className="text-muted-foreground">{CLOSE_WON_STRINGS.chrome.status.selectBilling}</span>
              ) : (
                <span className="text-muted-foreground">{CLOSE_WON_STRINGS.chrome.status.addLineItem}</span>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={guardedBack}>{CLOSE_WON_STRINGS.chrome.cancel}</Button>
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                <ArrowLeft className="mr-2 size-4" /> {CLOSE_WON_STRINGS.chrome.backButton}
              </Button>
            )}
            {isOnAccountStep ? (
              <Button onClick={handleNext} className="px-6" disabled={
                  !isAccountValid || Object.keys(duplicateAccount || {})?.length !== 0
              }>
                {showDemoToggle ? CLOSE_WON_STRINGS.chrome.continue : CLOSE_WON_STRINGS.chrome.continueToSo} &rarr;
              </Button>
            ) : soOrDemo === 'demo' ? (
              <Button
                type="submit"
                form="cw-demo-form"
                variant="success"
                className="px-6"
                disabled={!demoFormState.isValid || demoFormState.isPending}
              >
                <Check className="mr-2 size-4" /> {CLOSE_WON_STRINGS.chrome.createDemoRequest}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                variant="success"
                className="px-6"
                disabled={!isSOValid || createSOMut.isPending || convertDemoMut.isPending}
              >
                {createSOMut.isPending || convertDemoMut.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Check className="mr-2 size-4" />
                )}{' '}
                {CLOSE_WON_STRINGS.chrome.complete}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Address Dialog
          - Lead branch (no account_id yet): the address is kept locally
            and sent inline as `*_address_data` on the SO cascade POST.
          - Deal branch (account_id present): the dialog's onAdd hits
            `POST /accounts/{id}/addresses` so the address persists on
            the account, then auto-selects the returned id.
          Deliberately NOT passing `accountAddresses` here — existing
          account addresses are already pickable via the radio cards in
          the main addresses section, so the dialog is strictly for
          entering a brand-new structured address. Keeps the "From
          Account" pick-list from duplicating the surface above. */}
      <AddressFormDialog
        mode="stage"
        open={addAddressOpen}
        onOpenChange={(next) => {
          setAddAddressOpen(next)
          // Closing always clears edit mode so the next "Add" click opens a
          // blank form, not the previously-edited row's values.
          if (!next) {
            setEditingAddress(null)
            setEditingSource(null)
          }
        }}
        defaultType={addAddressType}
        initialValues={editingAddress ?? undefined}
        onAdd={handleAddressSave}
      />

      <UnsavedChangesDialog
        open={unsavedGuard.dialogOpen}
        onOpenChange={unsavedGuard.onDialogOpenChange}
        onConfirm={unsavedGuard.onConfirmDiscard}
      />
    </div>
  )
}
