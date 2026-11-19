import { useMemo } from 'react'
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  ShoppingCart,
  Sparkles,
  StickyNote,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import { DateRangePicker } from '@/components/common/pickers/DateRangePicker'
import { parseDateParam, toDateParam, todayDateParam } from '@/shared/lib/date'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/common/forms/FieldError'
import { DocumentUploadField } from '@/components/common/files/DocumentUploadField'
import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_LABELS,
  ACCOUNT_DOC_MAX_BYTES,
  ACCOUNT_DOC_TYPES,
} from '@/modules/crm/constants/account-documents'
import { formatINR } from '@/lib/currency'

import { CommercialTermsSection } from '../../shared/CommercialTermsSection'
import { DealAccountSelect } from '../../deals/DealAccountSelect'
import { SO_ORDER_TYPES } from '../../../api'
import type { SOOrderType } from '../../../api'
import { SO_ORDERABLE_LABELS, SO_ORDER_TYPE_LABELS } from '../../../constants/so-status'
import { SALES_ORDERS_STRINGS as S } from '../sales-orders.strings'
import { SoSectionHeader as SectionHeader } from './SoSectionHeader'
import { TotalsSummary } from '../../shared/TotalsSummary'
import { AddressDataEditor } from './AddressDataEditor'
import { ContactAndAddresses } from './ContactAndAddresses'
import { AcceptedQuotePicker } from './AcceptedQuotePicker'
import { SalesOrderLineItemsGrid } from './SalesOrderLineItemsGrid'
import { SoAttachmentsSection } from './SoAttachmentsSection'
import type { SalesOrderFormController } from '../../../hooks/sales-orders/useSalesOrderForm'

export function SalesOrderFormBody({ f }: { f: SalesOrderFormController }) {
  const {
    readOnly, closedWonSource, isEdit, existing, sourceMode,
    salesQuoteId, setSalesQuoteId, clearError, errors, quote, quoteQuery,
    accountId, handleAccountChange, contactId, setContactId,
    billingAddressId, setBillingAddressId, shippingAddressId, setShippingAddressId,
    billingAddresses, shippingAddresses, addressesQuery, customerLocked,
    addressOwnerAccountId, dealQuery, quotableType, orderType, setOrderType,
    rentalOrderDate, setRentalOrderDate,
    rentalStartDate, setRentalStartDate,
    rentalEndDate, setRentalEndDate,
    placeOfSupply, setPlaceOfSupply, isLeadCascade, totals, calcQuery,
    billingAddr, setBillingAddr,
    shippingAddr, setShippingAddr, shippingSameAsBilling, setShippingSameAsBilling,
    leadCascadeDocs, setLeadCascadeDoc, paymentTerms, setPaymentTerms,
    warranty, setWarranty, delivery, setDelivery, notes, setNotes,
  } = f

  // Split errors: line-item keys (line:* / items) go into the Line Items card;
  // everything else (account, contact, addresses, etc.) stays in the top banner.
  const { headerErrorMsgs, lineItemErrorMsgs } = useMemo(() => {
    const header = new Set<string>()
    const lineItem = new Set<string>()
    for (const [k, v] of Object.entries(errors)) {
      if (!v) continue
      if (k.startsWith('line:') || k === 'items') lineItem.add(v)
      else header.add(v)
    }
    return { headerErrorMsgs: [...header], lineItemErrorMsgs: [...lineItem] }
  }, [errors])

  // The SO-level window as ONE range for the dual-calendar picker.
  // Stored as two `YYYY-MM-DD` strings because that is what
  // `so_configure` holds and what every line inherits; a half-picked
  // range (from, no to) is a real state while the user is mid-choice.
  const rentalBillingPeriod = useMemo(
    () =>
      rentalStartDate || rentalEndDate
        ? { from: parseDateParam(rentalStartDate), to: parseDateParam(rentalEndDate) }
        : undefined,
    [rentalStartDate, rentalEndDate],
  )

  return (
    <>
      {headerErrorMsgs.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{S.form.errorBannerTitle}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {headerErrorMsgs.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {readOnly && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning dark:border-warning/40 dark:bg-warning/15">
          {S.form.readOnlyBannerBefore}
          <strong>{status}</strong>
          {S.form.readOnlyBannerAfter}
        </div>
      )}

      {/* Closed-Won banner — surfaces the lead/deal we were redirected from
          so the operator knows the source context. Source mode is locked to
          From Quote and the picker below is scoped to this entity's own
          quotes. */}
      {closedWonSource && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {S.form.closedWonTitle(
                closedWonSource.type === 'lead'
                  ? SO_ORDERABLE_LABELS.lead
                  : SO_ORDERABLE_LABELS.deal,
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {S.form.closedWonBody(closedWonSource.type)}
            </p>
          </div>
        </div>
      )}

      {/* Source card — rendered only when the order has (or had) a quote
          linkage. The Direct module entry hides this card entirely: per
          product, quote-driven SOs are only created from the Closed-Won
          flow on a Lead or Deal. Editing an existing quote-linked SO still
          shows the locked badge so users can see the linkage at a glance. */}
      {(isEdit || closedWonSource || sourceMode === 'from-quote') && (
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={<FileText className="size-4" />}
            tint="bg-muted text-muted-foreground"
            title={S.form.source.title}
            subtitle={S.form.source.subtitle}
          />

          {isEdit ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              {S.form.source.lockedOnCreate}
              <span className="ml-2 inline-flex items-center gap-1">
                <Badge variant="secondary" className="capitalize">
                  {existing?.sales_quote_id ? S.form.source.fromQuote : S.form.source.direct}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {existing?.orderable_type}
                </Badge>
              </span>
            </div>
          ) : closedWonSource ? (
            // Closed-Won path forces From Quote — show a locked banner so the
            // operator sees the lead/deal linkage and can't accidentally
            // switch to Direct mid-flow.
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <Badge variant="secondary">{S.form.source.fromQuote}</Badge>
              <span className="ml-2">
                {S.form.source.lockedClosedWon(closedWonSource.type)}
              </span>
            </div>
          ) : null}

          {sourceMode === 'from-quote' && !isEdit && (
            <div className="mt-4 space-y-2">
              <Label>
                {S.form.source.salesQuote} <span className="text-destructive">*</span>
              </Label>
              <AcceptedQuotePicker
                value={salesQuoteId}
                onChange={(id) => {
                  setSalesQuoteId(id)
                  clearError('salesQuoteId')
                }}
                disabled={readOnly}
                scope={closedWonSource ?? undefined}
              />
              <FieldError id="so-quote-error" message={errors.salesQuoteId} />
              {quote && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{quote.quote_number}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {S.form.source.sourcePrefix}{quote.quotable_type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {S.form.source.quoteSummary(quote.items.length, formatINR(quote.grand_total))}
                    </span>
                  </div>
                  {quote.quotable_type === 'lead' && (
                    <p className="mt-2 text-muted-foreground">
                      {S.form.source.leadCascadeNote}
                    </p>
                  )}
                </div>
              )}
              {salesQuoteId && quoteQuery.isLoading && (
                <p className="text-xs text-muted-foreground">
                  <Loader2 className="mr-1 inline size-3 animate-spin" />
                  {S.form.source.loadingQuote}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Customer card — branches on source */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={<ShoppingCart className="size-4" />}
            tint="bg-muted text-muted-foreground"
            title={S.form.orderDetails.title}
            subtitle={
              isLeadCascade
                ? S.form.orderDetails.subtitleLeadCascade
                : sourceMode === 'from-quote'
                  ? S.form.orderDetails.subtitleFromQuote
                  : S.form.orderDetails.subtitleDirect
            }
          />

          {sourceMode === 'direct' && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  {S.form.orderDetails.account} <span className="text-destructive">*</span>
                </Label>
                <DealAccountSelect
                  value={accountId || null}
                  onValueChange={handleAccountChange}
                  disabled={readOnly || isEdit}
                  placeholder={S.form.orderDetails.accountPlaceholder}
                />
                <FieldError id="so-account-error" message={errors.accountId} />
              </div>
              <ContactAndAddresses
                mode="contact"
                accountId={accountId}
                contactId={contactId}
                setContactId={setContactId}
                billingAddressId={billingAddressId}
                setBillingAddressId={setBillingAddressId}
                shippingAddressId={shippingAddressId}
                setShippingAddressId={setShippingAddressId}
                billingAddresses={billingAddresses}
                shippingAddresses={shippingAddresses}
                addressesLoading={addressesQuery.isLoading}
                readOnly={customerLocked}
                errors={errors}
                clearError={clearError}
              />
            </div>
          )}

          {sourceMode === 'from-quote' && !isLeadCascade && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {/* The quote may still be loading on EDIT first paint — null-
                  check it so the contact + address dropdowns render
                  unconditionally with the SO's saved values. */}
              {quote && (
                <div className="space-y-2 sm:col-span-2">
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {S.form.orderDetails.sourceIsBefore}{' '}
                    <strong>
                      {quote.quotable_type}
                      {quotableType === 'deal' && dealQuery.data
                        ? ` (${dealQuery.data.deal_number})`
                        : ''}
                    </strong>
                    .{' '}
                    {isEdit
                      ? S.form.orderDetails.sourceLockedEdit
                      : S.form.orderDetails.sourcePickPrompt}
                  </p>
                </div>
              )}
              {/* Account is frozen for quote-driven SOs (picked on the source
                  deal/account), but on edit/amend the customer identity has
                  to be visible — otherwise the form only shows the deal
                  number and an email contact. Renders the same disabled
                  picker the direct branch uses so the name resolves even
                  when the paginated options aren't loaded. */}
              <div className="space-y-2">
                <Label>{S.form.orderDetails.account}</Label>
                <DealAccountSelect
                  value={addressOwnerAccountId || null}
                  onValueChange={() => {}}
                  disabled
                  placeholder={S.form.orderDetails.accountPlaceholder}
                />
              </div>
              <ContactAndAddresses
                mode="contact"
                accountId={addressOwnerAccountId}
                contactId={contactId}
                setContactId={setContactId}
                billingAddressId={billingAddressId}
                setBillingAddressId={setBillingAddressId}
                shippingAddressId={shippingAddressId}
                setShippingAddressId={setShippingAddressId}
                billingAddresses={billingAddresses}
                shippingAddresses={shippingAddresses}
                addressesLoading={addressesQuery.isLoading || dealQuery.isLoading}
                readOnly={customerLocked}
                errors={errors}
                clearError={clearError}
              />
            </div>
          )}

          {isLeadCascade && (
            <div className="space-y-4">
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {S.form.orderDetails.leadCascadeNote}
              </p>
            </div>
          )}

          {/* Order Type + Place of Supply — both apply to every source
              mode (direct, from-quote, lead-cascade), so they render once
              here as a half-and-half row below the mode-specific customer
              grids (Account + Contact are picked first, above). Order Type
              is captured at create time and locked once the SO exists. */}
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="so-order-type">
                {S.form.orderDetails.orderType}
                {!isEdit && <span className="text-destructive"> *</span>}
              </Label>
              <Select
                value={orderType}
                onValueChange={(v) => setOrderType(v as SOOrderType)}
                // Locked on edit-in-place (product decision: order type is fixed
                // post-create). Editable on amend — the new revision can change
                // it; it's persisted via the follow-up PATCH (SalesOrderUpdate
                // accepts order_type).
                disabled={readOnly || isEdit}
              >
                <SelectTrigger
                  id="so-order-type"
                  className="w-full"
                  aria-invalid={Boolean(errors.orderType)}
                  aria-describedby={errors.orderType ? "so-order-type-error" : undefined}
                >
                  <SelectValue placeholder={S.form.orderDetails.orderTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {SO_ORDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SO_ORDER_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="so-order-type-error" message={errors.orderType} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="so-pos">{S.form.orderDetails.placeOfSupply}</Label>
              <Input
                id="so-pos"
                value={placeOfSupply}
                onChange={(e) => {
                  setPlaceOfSupply(e.target.value.toUpperCase().slice(0, 2))
                  clearError('placeOfSupply')
                }}
                placeholder={S.form.orderDetails.placeOfSupplyPlaceholder}
                disabled={readOnly}
                aria-invalid={Boolean(errors.placeOfSupply)}
              />

              <FieldError id="so-pos-error" message={errors.placeOfSupply} />
            </div>

            {/* Rental window — RENTAL orders only.
                `sales_orders` has no date columns; these are stored on the
                rentals module's `so_configure` row, which is created with
                the order. The backend fills them down onto every line
                (is_rental + period + dates), and that is what makes the
                order's units provision as tracked devices on dispatch. */}
            {orderType === "Rental" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="so-rental-order-date">
                    {S.form.orderDetails.rentalOrderDate} <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id="so-rental-order-date"
                    value={rentalOrderDate}
                    onChange={setRentalOrderDate}
                    disabled={readOnly || isEdit}
                  />
                  <FieldError
                    id="so-rental-order-date-error"
                    message={errors.rentalOrderDate}
                  />
                </div>
                {/* ONE billing period, not two loose dates. The window is a
                    single fact — rent runs from a day to a day — and the
                    dual-calendar picker shows both ends against one
                    highlighted span, so an inverted or absurd window is
                    visible rather than arithmetic. Same picker WMS and
                    the rentals register use. Beside the order date: the
                    three rental dates read as one row. */}
                <div className="space-y-2">
                  <Label htmlFor="so-rental-billing-period">
                    {S.form.orderDetails.rentalBillingPeriod} <span className="text-destructive">*</span>
                  </Label>
                  <DateRangePicker
                    id="so-rental-billing-period"
                    value={rentalBillingPeriod}
                    onChange={(next) => {
                      // Written back as two YYYY-MM-DD strings: that is what
                      // `so_configure` stores and what every line inherits.
                      setRentalStartDate(next?.from ? toDateParam(next.from) : "")
                      setRentalEndDate(next?.to ? toDateParam(next.to) : "")
                    }}
                    placeholder={S.form.orderDetails.rentalBillingPeriodPlaceholder}
                    disabled={readOnly || isEdit}
                  />
                  {/* Without this the save just… didn't happen: validation
                      set `rentalWindow` and nothing rendered it, so the
                      form refused silently. */}
                  <FieldError
                    id="so-rental-window-error"
                    message={errors.rentalWindow}
                  />
                  {/* Soft warning only — a past start is allowed (QA RM11). */}
                  {/* Column: both helpers are inline <span>s and otherwise
                      run together on one line. */}
                  <div className="flex flex-col gap-0.5">
                    {!isEdit && rentalStartDate && rentalStartDate < todayDateParam() ? (
                      <Typography variant="helper" tone="warning">
                        {S.form.rentalStartInPast}
                      </Typography>
                    ) : null}
                    <Typography variant="helper">
                      {S.form.orderDetails.rentalEndDateHelp}
                    </Typography>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line items — card-per-line layout mirrors the Quote builder
          so sales sees the same UX across Direct and Quote-driven flows.
          Quote-driven items prefill from the picked quote and stay
          editable; the post-save diff replays edits as a PATCH against
          the server-deep-copied items. */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionHeader
            icon={
              sourceMode === 'from-quote' ? (
                <Sparkles className="size-4" />
              ) : (
                <ClipboardList className="size-4" />
              )
            }
            tint="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            title={S.form.lineItems.title}
            subtitle={
              sourceMode === 'from-quote'
                ? S.form.lineItems.subtitleFromQuote
                : S.form.lineItems.subtitleDirect
            }
          />

          {lineItemErrorMsgs.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>{S.form.errorBannerTitle}</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {lineItemErrorMsgs.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <SalesOrderLineItemsGrid f={f} sourceMode={sourceMode} isEdit={isEdit} />

          {/* Totals — moved into the Line Items card per UI redesign so
              the running summary sits directly below the Add Line Item
              button instead of in its own separate card. Same component +
              same props as before. */}
          <div className="mt-4 border-t pt-4">
            {/* 2026-05-19: ad-hoc header discount input removed per spec.
                The TotalsSummary still surfaces a read-only Discount row
                when `headerDiscount > 0` (e.g. seeded from a quote), so
                existing data renders correctly. */}
            <TotalsSummary
              loading={calcQuery.isFetching}
              subtotal={totals?.subtotal ?? 0}
              lineDiscount={totals?.total_line_discount ?? 0}
              headerDiscount={totals?.discount_amount ?? 0}
              totalTax={totals?.total_tax ?? 0}
              grandTotal={totals?.grand_total ?? 0}
              discountInput={null}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attachments card — sits between Line Items and Addresses per UI ask.
          Distinct from the Account Documents card further down: that one is
          lead-cascade-only and uploads PAN/GST to the *account*, whereas these
          are SO paperwork (SO copy / customer PO / screenshots / free-text). */}
      <Card>
        <CardContent className="p-6">
          <SoAttachmentsSection controller={f.attachments} readOnly={readOnly} />
        </CardContent>
      </Card>

      {/* Addresses card — moved BELOW the Line Items card per UI ask so
          billing / shipping picking comes after the items are configured.
          Renders different children based on mode: address pickers for
          direct + from-quote, freeform AddressDataEditor for lead-cascade. */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={<MapPin className="size-4" />}
            tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            title={S.form.addresses.title}
            subtitle={S.form.addresses.subtitle}
          />
          {!isLeadCascade && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <ContactAndAddresses
                mode="addresses"
                accountId={addressOwnerAccountId}
                contactId={contactId}
                setContactId={setContactId}
                billingAddressId={billingAddressId}
                setBillingAddressId={setBillingAddressId}
                shippingAddressId={shippingAddressId}
                setShippingAddressId={setShippingAddressId}
                billingAddresses={billingAddresses}
                shippingAddresses={shippingAddresses}
                addressesLoading={addressesQuery.isLoading || dealQuery.isLoading}
                readOnly={customerLocked}
                errors={errors}
                clearError={clearError}
              />
            </div>
          )}
          {isLeadCascade && (
            <div className="space-y-4">
              <AddressDataEditor
                label={S.form.addresses.billing}
                required
                value={billingAddr}
                onChange={(v) => {
                  setBillingAddr(v)
                  clearError('billingAddr')
                }}
                readOnly={readOnly}
              />
              <FieldError id="so-billing-error" message={errors.billingAddr} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shippingSameAsBilling}
                  disabled={readOnly}
                  onChange={(e) => setShippingSameAsBilling(e.target.checked)}
                  className="size-4 accent-primary"
                />
                {S.form.addresses.shippingSameAsBilling}
              </label>
              {!shippingSameAsBilling && (
                <>
                  <AddressDataEditor
                    label={S.form.addresses.shipping}
                    required
                    value={shippingAddr}
                    onChange={(v) => {
                      setShippingAddr(v)
                      clearError('shippingAddr')
                    }}
                    readOnly={readOnly}
                  />
                  <FieldError id="so-shipping-error" message={errors.shippingAddr} />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Documents — lead-cascade only.
          PAN/GST inputs intentionally left out here (Option A in the SO docs
          plan): this form's lead-cascade path delegates compliance fields to
          the dedicated AccountDetailPage so the SO form stays slim. The
          ClosedWonPage account step is the canonical surface for PAN/GST. */}
      {isLeadCascade && (
        <Card>
          <CardContent className="p-6">
            <SectionHeader
              icon={<StickyNote className="size-4" />}
              tint="bg-sky-500/10 text-sky-700 dark:text-sky-400"
              title={S.form.documents.title}
              subtitle={S.form.documents.subtitle}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACCOUNT_DOC_TYPES.map((slot) => (
                <DocumentUploadField
                  key={slot}
                  label={ACCOUNT_DOC_LABELS[slot]}
                  value={leadCascadeDocs[slot]}
                  onChange={(file) => setLeadCascadeDoc(slot, file)}
                  allowedMimes={ACCOUNT_DOC_ALLOWED_MIMES}
                  maxBytes={ACCOUNT_DOC_MAX_BYTES}
                  disabled={readOnly}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* T&C + Notes */}
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={<StickyNote className="size-4" />}
            tint="bg-orange-500/10 text-orange-700 dark:text-orange-400"
            title={S.form.termsNotes.title}
            subtitle={S.form.termsNotes.subtitle}
          />
          <CommercialTermsSection
            variant="labeled"
            disabled={readOnly}
            value={{ paymentTerms, warranty, delivery, notes }}
            onFieldChange={(field, val) => {
              if (field === "paymentTerms") setPaymentTerms(val)
              else if (field === "warranty") setWarranty(val)
              else if (field === "delivery") setDelivery(val)
              else setNotes(val)
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
