import { ArrowRight, Copy, Download, Loader2, Save, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import { DateRangePicker } from '@/components/common/pickers/DateRangePicker'
import { parseDateParam, toDateParam } from '@/shared/lib/date'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/common/forms/FieldError'
import { TotalsSection } from '../shared/TotalsSection'
import { PartPickerDialog } from './PartPickerDialog'
import { SwapComponentDialog } from './SwapComponentDialog'
import { QuoteLineItemsGrid } from './QuoteLineItemsGrid'
import { DealAccountSelect } from '../deals/DealAccountSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AsyncSelect } from '@/components/ui/async-select'

import type { QuotableType } from '../../api'

import { QuoteClauseSection } from './QuoteClauseSection'
import { useBrandsInfinite } from '../../hooks/quotes/useBrands'
import { useQuotePdfPolling } from '../../hooks/quotes/useQuotePdfPolling'
import { useLeadPickerOptions, useDealPickerOptions, QUOTE_ORDER_TYPE_LABELS, type QuoteOrderType } from './quoteBuilderShared'
import { QUOTES_STRINGS as Q } from './quotes.strings'
import {
  QUOTABLE_TYPE_LABELS,
  QUOTE_INLINE_EDITABLE_STATUSES,
} from '../../constants/quote-status'
import { resolveValidityToken, validityDaysBetween } from '../../lib/validity-token'
import type { QuoteBuilderController } from '../../hooks/quotes/useQuoteBuilder'

export function QuoteBuilderBody({ qb }: { qb: QuoteBuilderController }) {
  const {
    errors,
    clearError,
    handleSaveQuote,
    handleDownloadQuote,
    handleCopyQuote,
    quotableType,
    selectedAccountId,
    selectedLead,
    selectedDeal,
    validUntil,
    quoteType,
    rentalStartDate,
    rentalEndDate,
    notes,
    discount,
    // Business Vertical (brand) + Terms & Conditions clause builder — owned by
    // useQuoteBuilder so brand + clauses ride the save payload and seed on load.
    clauseCtrl,
    selectedBrand,
    handleBrandChange,
    isEdit,
    partPickerOpen,
    partPickerTarget,
    swapDialogOpen,
    swapTarget,
    setSelectedAccountId,
    setSelectedLead,
    setSelectedDeal,
    setValidUntil,
    setQuoteType,
    setRentalStartDate,
    setRentalEndDate,
    setNotes,
    setDiscount,
    setPartPickerOpen,
    setSwapDialogOpen,
    createMut,
    grandTotal,
    handlePartPickerSelect,
    handleSwapSelect,
    isEmbedded,
    isSalesOrderEmbedded,
    quotableLocked,
    quoteNumber,
    quoteStatus,
    subtotal,
    switchQuotableType,
    taxableAmount,
    todayIso,
    totalLineDiscount,
    totalTaxAmount,
    updateMut,
    versionMut,
    viewLocked,
    accountName,
    mode,
    existing,
    amendMode,
    viewOnly,
    onCancel,
  } = qb

  // Resolve the `{{quote.validity_days}}` T&C token for DISPLAY on the
  // read-only detail view — the token stays raw in the edit textarea (so it
  // round-trips on save and the day count stays live). Day count = validity
  // date − issue date, matching the backend/PDF. Applied only in `readOnly`.
  const clauseValidityDays = validityDaysBetween(
    validUntil || existing?.valid_until,
    existing?.created_at,
  )
  const resolveClauseBody = (body: string) => resolveValidityToken(body, clauseValidityDays)

  // Async PDF (docs/quote-pdf-async-integration.md): the mutation returns a
  // stale/null `pdf_url` and a Celery worker replaces it ~1–3 s later. This
  // hook drives the download button's Pending/Timeout states — the poll itself
  // is kicked off by the save handlers in useQuoteBuilder.
  const { status: pdfStatus } = useQuotePdfPolling(existing?.id)
  const qc = useQueryClient()
  const handleManualPdfRefresh = () => {
    if (!existing?.id) return
    // Timeout state: the worker didn't produce a new URL in the 10 s window.
    // Give the user an explicit "check again" that just re-fetches the detail.
    void qc.invalidateQueries({
      queryKey: ['crm', 'quotes', 'detail', existing.id],
    })
  }

  // Business Vertical (brand) — rendered beside "Valid Until" in each header
  // variant below. `null` in the SO embed so the surrounding 2-col grid
  // collapses to a single column. Picking a brand re-hydrates the Terms &
  // Conditions clause list; the vertical stays editable while editing/amending
  // (the change is sent as `brand_id` on the PATCH, and the backend allows it
  // while the quote is still editable) — only true view-only mode locks it.
  // See comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md.
  // ── Order type + rental window ────────────────────────────────────
  //
  // A quote has no `sellable_type` column: `quoteType` is written down
  // onto every line's `is_rental`. Until this existed a quote could not
  // be marked rental at all, so every one saved as Sales and converting
  // it to a rental SO silently dropped the window.
  const orderTypeField = (
    <div className="space-y-2">
      <Label className="font-ui" htmlFor="quote-order-type">
        {Q.builder.fields.orderType}
        {!isEdit && <span className="text-destructive"> *</span>}
      </Label>
      <Select
        items={QUOTE_ORDER_TYPE_LABELS}
        value={quoteType || null}
        onValueChange={(v) => {
          if (!v) return
          setQuoteType(v as QuoteOrderType)
          clearError('orderType')
        }}
      >
        <SelectTrigger
          id="quote-order-type"
          className="w-full"
          // Mandatory and never emptied once picked, so no × to clear it.
          clearable={false}
          aria-invalid={Boolean(errors.orderType)}
          aria-describedby={errors.orderType ? 'quote-order-type-error' : undefined}
        >
          <SelectValue placeholder={Q.builder.placeholders.orderType} />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(QUOTE_ORDER_TYPE_LABELS) as QuoteOrderType[]).map((k) => (
            <SelectItem key={k} value={k}>
              {QUOTE_ORDER_TYPE_LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id="quote-order-type-error" message={errors.orderType} />
    </div>
  )

  // Only on a rental quote — on a sales quote there is no window to state.
  const rentalWindowField =
    quoteType === 'Rental' ? (
      <div className="space-y-2">
        <Label className="font-ui" htmlFor="quote-rental-window">
          {Q.builder.fields.rentalWindow}
          <span className="text-destructive"> *</span>
        </Label>
        {/* One from–to period on the two-calendar picker the SO form
            uses. A range can't be picked inverted, so the ordering the
            item schema and the DB CHECK enforce holds by construction. */}
        <DateRangePicker
          id="quote-rental-window"
          value={
            rentalStartDate || rentalEndDate
              ? { from: parseDateParam(rentalStartDate), to: parseDateParam(rentalEndDate) }
              : undefined
          }
          onChange={(next) => {
            setRentalStartDate(next?.from ? toDateParam(next.from) : '')
            setRentalEndDate(next?.to ? toDateParam(next.to) : '')
          }}
          placeholder={Q.builder.placeholders.rentalWindow}
        />
        <FieldError id="quote-rental-window-error" message={errors.rentalWindow} />
        <p className="text-[11px] text-muted-foreground">
          {Q.builder.fields.rentalWindowHelp}
        </p>
      </div>
    ) : null

  const verticalField = !isSalesOrderEmbedded ? (
    <div className="space-y-2">
      <Label className="font-ui" htmlFor="quote-vertical">
        {Q.builder.fields.businessVertical}
        {(!isEdit || amendMode) && <span className="text-destructive"> *</span>}
      </Label>
      {/* Error ring mirrors the quotable picker so a missing vertical gets a
          visible outline, not just the helper line. Required on create; frozen
          (and non-clearable) on edit. */}
      <div
        className={cn(
          'rounded-md',
          errors.vertical && 'ring-2 ring-destructive/70',
        )}
      >
        <AsyncSelect
          id="quote-vertical"
          value={selectedBrand ? { id: selectedBrand.id, label: selectedBrand.name } : null}
          onValueChange={(next) => {
            if (next === null) handleBrandChange(null)
          }}
          onItemPick={(b) => {
            handleBrandChange({ id: b.id, code: b.code, name: b.name })
            clearError('vertical')
          }}
          useOptions={useBrandsInfinite}
          toLabel={(b) => b.name}
          placeholder={Q.builder.placeholders.vertical}
          searchable={false}
          disabled={viewLocked}
          clearable={!isEdit}
          loadOnOpen
        />
      </div>
      <FieldError id="quote-vertical-error" message={errors.vertical} />
    </div>
  ) : null

  return (
    <>
      {/* Copy Quote / Download Quote — read-only-safe actions shown at the
          top of the detail (view) page ONLY once the quote has cleared
          internal approval (status === 'Approved'). Pre-approval statuses
          (Draft/Submitted/Pending Approval/Partially Approved) and
          post-approval terminal states (Sent/Accepted/Rejected/Amend) hide
          both because the PDF is only a customer-shareable artifact while
          the quote sits in the Approved state. Rendered outside the
          <fieldset> so they stay clickable in view-only mode; standalone
          (non-embedded) view only. */}
      {!isEmbedded && viewLocked && existing?.status === 'Approved' && (
        <div className="flex items-center justify-end gap-2 pb-3">
          {/* Async PDF states (docs/quote-pdf-async-integration.md):
              • pending → disabled spinner "Generating PDF…" (worker rendering)
              • timeout → clickable "Refresh" that re-fetches the detail
              • ready + pdf_url → normal Download button
              • no pdf_url + idle → keep the legacy "not generated" tooltip */}
          {pdfStatus === 'pending' ? (
            <Button variant="outline" size="sm" disabled>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              {Q.builder.generatingPdf}
            </Button>
          ) : pdfStatus === 'timeout' && !existing?.pdf_url ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualPdfRefresh}
                  >
                    <Download className="mr-1.5 size-4" />
                    {Q.builder.refreshPdf}
                  </Button>
                }
              />
              <TooltipContent>{Q.builder.pdfStillGenerating}</TooltipContent>
            </Tooltip>
          ) : existing?.pdf_url ? (
            <Button variant="outline" size="sm" onClick={handleDownloadQuote}>
              <Download className="mr-1.5 size-4" />
              {Q.builder.downloadQuote}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span tabIndex={0} aria-disabled="true">
                    <Button variant="outline" size="sm" disabled>
                      <Download className="mr-1.5 size-4" />
                      {Q.builder.downloadQuote}
                    </Button>
                  </span>
                }
              />
              <TooltipContent>
                {existing
                  ? Q.builder.pdfNotGeneratedExisting
                  : Q.builder.pdfNotGeneratedNew}
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyQuote}>
            <Copy className="mr-1.5 size-4" />
            {Q.builder.copyQuote}
          </Button>
        </div>
      )}

      {/* `<fieldset disabled>` greys out and pointer-disables every nested
           form control automatically (browser-native), giving us the
           read-only view without touching every input. We add an explicit
           `pointer-events-none` on action-only divs (BOM dialogs etc.) for
           extra safety. The Save button is hidden separately in the footer.
           Amend mode overrides view-only — the user lands on the read-only
           page, clicks Amend, and the form unlocks for editing in place
           without a route change. */}
      <fieldset
        disabled={viewOnly && !amendMode}
        // `min-w-0` is essential in read-only view: a <fieldset> defaults
        // to `min-inline-size: min-content`, so without it the fieldset
        // refuses to shrink and stretches to its widest child (the wide
        // line-item row), pushing the WHOLE page into a horizontal scroll.
        // With min-w-0 the fieldset stays at container width and the
        // line-item row's own `overflow-x-auto` scrolls internally instead.
        className={viewOnly && !amendMode ? 'min-w-0 space-y-8' : 'contents'}
      >
        {viewOnly && !amendMode && existing && (
          <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-700/40 dark:bg-blue-950/20 dark:text-blue-200">
            {Q.builder.readOnlyView(existing.quote_number)}
            {/* No "click Edit" hint when there's no Edit (mention-only). */}
            {QUOTE_INLINE_EDITABLE_STATUSES.includes(existing.status) &&
              existing.access_level !== 'view' &&
              Q.builder.readOnlyDraftSuffix}
            {!QUOTE_INLINE_EDITABLE_STATUSES.includes(existing.status) &&
              Q.builder.readOnlyLockedSuffix(existing.status)}
          </div>
        )}
      <div className={viewOnly ? 'space-y-8' : 'space-y-8'}>
        {amendMode && existing && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-200">
            {Q.builder.amendBannerLead(
              existing.version_number + 1,
              existing.quote_number,
            )}
          </div>
        )}
        {/* Header Fields — standalone shows read-only Quote Number + Status,
            the quotable-type toggle + matching picker, and Valid Until.
            Quote Number previews GET /api/v1/next-number on create and shows
            the server-allocated value on edit. Embedded variants stay minimal
            because their parent form already owns the upstream party. */}
        {mode === 'standalone' && (
          accountName ? (
            // Parent forced an account context (e.g. Lead/Deal detail
            // → Quotes tab). Read-only — the upstream party isn't
            // user-pickable in that embed.
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-ui">{Q.builder.fields.quoteNumber}</Label>
                <Input value={quoteNumber} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="font-ui">{Q.builder.fields.status}</Label>
                <Input value={quoteStatus} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="font-ui">{Q.builder.fields.account}</Label>
                <Input value={accountName} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="font-ui">{Q.builder.fields.validUntil}</Label>
                <DatePicker
                  value={validUntil}
                  min={todayIso}
                  onChange={setValidUntil}
                />
              </div>
              {verticalField}
              {orderTypeField}
              {rentalWindowField}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quote Number + Status — read-only. Number previews
                  /next-number on create, shows the allocated value on edit. */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-ui">{Q.builder.fields.quoteNumber}</Label>
                  <Input value={quoteNumber} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui">{Q.builder.fields.status}</Label>
                  <Input value={quoteStatus} readOnly className="bg-muted/50" />
                </div>
              </div>
              {/* Row 1 — two dropdowns side by side: first picks the
                  entity type, second picks the matching record. Backend
                  `quotable_type` is exclusive, so switching the type
                  clears the previously selected record. */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-ui" htmlFor="quote-quotable-type">
                    {Q.builder.fields.linkedTo} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={quotableType}
                    onValueChange={(v: string | null) =>
                      v && switchQuotableType(v as QuotableType)
                    }
                    disabled={viewLocked || quotableLocked}
                  >
                    <SelectTrigger id="quote-quotable-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Account option temporarily disabled — quotes are
                          created against leads/deals only for now. Account
                          deep-links (?accountId=) and existing account
                          quotes still render via the locked chip below. */}
                      {/* <SelectItem value="account">{QUOTABLE_TYPE_LABELS.account}</SelectItem> */}
                      <SelectItem value="lead">{QUOTABLE_TYPE_LABELS.lead}</SelectItem>
                      <SelectItem value="deal">{QUOTABLE_TYPE_LABELS.deal}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui" htmlFor="quote-quotable-record">
                    {QUOTABLE_TYPE_LABELS[quotableType]}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  {/* Wrap each picker in an error-ring container so the
                      "Pick an account / lead / deal" message gets a
                      visible red outline instead of just the helper line
                      under the field. Per UX: the inline FieldError stays
                      so screen-readers and users with red-blindness still
                      have the message. */}
                  {quotableType === 'account' && (
                    <div
                      className={cn(
                        'rounded-md',
                        errors.quotable && 'rounded-md ring-2 ring-destructive/70',
                      )}
                    >
                      <DealAccountSelect
                        value={selectedAccountId || null}
                        onValueChange={(id) => {
                          setSelectedAccountId(id ?? '')
                          clearError('quotable')
                        }}
                        disabled={viewLocked || quotableLocked}
                        placeholder={Q.builder.placeholders.account}
                      />
                    </div>
                  )}
                  {quotableType === 'lead' && (
                    <div
                      className={cn(
                        'rounded-md',
                        errors.quotable && 'rounded-md ring-2 ring-destructive/70',
                      )}
                    >
                      <AsyncSelect
                        id="quote-quotable-record"
                        value={selectedLead}
                        onValueChange={(next) => {
                          setSelectedLead(next)
                          clearError('quotable')
                        }}
                        useOptions={useLeadPickerOptions}
                        toLabel={(l) =>
                          `${l.lead_code}${l.company_name ? ` · ${l.company_name}` : ''}`
                        }
                        placeholder={Q.builder.placeholders.lead}
                        searchPlaceholder={Q.builder.placeholders.leadSearch}
                        disabled={viewLocked || quotableLocked}
                        loadOnOpen
                      />
                    </div>
                  )}
                  {quotableType === 'deal' && (
                    <div
                      className={cn(
                        'rounded-md',
                        errors.quotable && 'rounded-md ring-2 ring-destructive/70',
                      )}
                    >
                      <AsyncSelect
                        id="quote-quotable-record"
                        value={selectedDeal}
                        onValueChange={(next) => {
                          setSelectedDeal(next)
                          clearError('quotable')
                        }}
                        useOptions={useDealPickerOptions}
                        toLabel={(d) =>
                          // Show the customer name to keep the chip
                          // recognizable across the form; deal number is
                          // the stable identifier and stays as the prefix.
                          // `account_name` is joined onto DealListItem
                          // server-side; null only when the account FK is
                          // orphaned.
                          d.account_name
                            ? `${d.deal_number} · ${d.account_name}`
                            : d.deal_number
                        }
                        placeholder={Q.builder.placeholders.deal}
                        searchPlaceholder={Q.builder.placeholders.dealSearch}
                        disabled={viewLocked || quotableLocked}
                        loadOnOpen
                      />
                    </div>
                  )}
                </div>
              </div>
              <FieldError id="quote-quotable-error" message={errors.quotable} />
              {/* Row 2 — Valid Until, with the Business Vertical selector
                  beside it (when the clause feature is on). */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-ui">{Q.builder.fields.validUntil}</Label>
                  <DatePicker
                    value={validUntil}
                    min={todayIso}
                    onChange={setValidUntil}
                  />
                </div>
                {verticalField}
                {orderTypeField}
                {rentalWindowField}
              </div>
            </div>
          )
        )}
        {mode === 'embedded' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-ui">{Q.builder.fields.validUntil}</Label>
              <DatePicker
                value={validUntil}
                min={todayIso}
                onChange={setValidUntil}
              />
            </div>
            {verticalField}
            {orderTypeField}
            {rentalWindowField}
          </div>
        )}

        {/* ── Line Items ── */}
        <QuoteLineItemsGrid qb={qb} />

        {/* Totals. Discount input is hidden on Quote builder per the
            2026-05-19 spec — ad-hoc header discounts are no longer user-
            editable; the field stays in the wire shape so server-side
            discounts still display read-only when present. */}
        <TotalsSection
          subtotal={subtotal}
          discount={discount}
          onDiscountChange={setDiscount}
          lineDiscount={totalLineDiscount}
          computed={{
            taxableAmount,
            taxAmount: totalTaxAmount,
            grandTotal,
          }}
          hideDiscount
          hideTaxableAmount
          hideTaxRate
        />

        {/* Terms & Notes — shown for CRM quote flows; SO form owns its own notes UI. */}
        {!isSalesOrderEmbedded && (
          <div className="space-y-4">
            {/* Structured Terms & Conditions clause builder, seeded from the
                selected brand's hydrate template and persisted on the quote's
                `terms[]`. In view-only mode it stays expandable (read-only) so
                clauses are readable on the detail page. See comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md. */}
            <QuoteClauseSection
              c={clauseCtrl}
              readOnly={viewLocked}
              resolveBody={resolveClauseBody}
            />
            <div className="space-y-2">
              <Label className="font-ui">{Q.builder.fields.notes}</Label>
              <Textarea
                placeholder={Q.builder.placeholders.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Footer actions — embedded quote builders still need Save.
            Copy / Download moved OUTSIDE the fieldset (see below) so they
            stay clickable in view-only mode — otherwise the parent
            `<fieldset disabled>` greys them out too. */}
        <div className="flex items-center justify-end border-t pt-4">
          <div className="flex gap-2">
            {(!viewOnly || amendMode) && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={
                  createMut.isPending || updateMut.isPending || versionMut.isPending
                }
              >
                <X className="mr-1.5 size-4" />
                {Q.builder.cancel}
              </Button>
            )}
            {/* Save as Draft + Submit pair. Mirrors the Download Quote
                (outline) and Convert to SO (primary) styling so the form's
                visual hierarchy matches the rest of the quote surface.
                Routing depends on whether amend mode is active:
                  * Normal create / edit-Draft → PATCH/POST the same row;
                    status flips inline if Submit is chosen.
                  * Amend (source is Submitted or Rejected) → versionMut
                    spawns v(N+1) Draft and copies items over; Submit
                    additionally PATCHes the new draft to Submitted.
                The amber amend banner above already tells the user this
                save lands on a new version, so the labels stay the same. */}
            {(!viewOnly || amendMode) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveQuote('Draft')}
                  disabled={
                    createMut.isPending || updateMut.isPending || versionMut.isPending
                  }
                >
                  <Save className="mr-1.5 size-4" />
                  {createMut.isPending || updateMut.isPending || versionMut.isPending
                    ? Q.builder.saving
                    : Q.builder.saveAsDraft}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveQuote('Submitted')}
                  disabled={
                    createMut.isPending || updateMut.isPending || versionMut.isPending
                  }
                >
                  <ArrowRight className="mr-1.5 size-4" />
                  {createMut.isPending || updateMut.isPending || versionMut.isPending
                    ? Q.builder.submitting
                    : Q.builder.submit}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      </fieldset>

      {/* ── Dialogs ── */}
      <PartPickerDialog
        open={partPickerOpen}
        onOpenChange={setPartPickerOpen}
        onSelect={handlePartPickerSelect}
        title={partPickerTarget?.mode === 'additional' ? Q.builder.addComponentTitle : Q.builder.selectPartTitle}
      />

      {swapTarget && (
        <SwapComponentDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          onSwap={handleSwapSelect}
          currentPartId={swapTarget.currentPartId}
          currentPartName={swapTarget.currentPartName}
          suggestedSubstituteIds={swapTarget.substituteIds}
        />
      )}
    </>
  )
}
