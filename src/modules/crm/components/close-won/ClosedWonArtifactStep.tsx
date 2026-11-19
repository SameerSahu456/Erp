import {
  Building2,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  Receipt,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { AsyncSelect } from '@/components/ui/async-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import { DateRangePicker } from '@/components/common/pickers/DateRangePicker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Typography } from '@/components/ui/typography'
// `formatDateLabel(parseDateParam(x))`, never `formatIST_date` — these
// are bare `YYYY-MM-DD` calendar dates with no timezone to convert, and
// running them through the IST instant formatter shifts them a day.
import { formatDateLabel, parseDateParam, toDateParam } from '@/shared/lib/date'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import { SO_ORDER_TYPES, type QuoteListItemWire, type SOOrderType } from '../../api'
import { CommercialTermsSection } from '../../components/shared/CommercialTermsSection'
import { TotalsSummary } from '../../components/shared/TotalsSummary'
import { ClosedWonLineItemsGrid } from './ClosedWonLineItemsGrid'
import { ClosedWonDemoForm } from '../../components/demo-requests/ClosedWonDemoForm'
import { SoAttachmentsSection } from '../sales-orders/form/SoAttachmentsSection'
import { ArtifactChoice } from './ArtifactChoice'
import { CLOSE_WON_STRINGS } from './close-won.strings'
import { fmtCurrency } from '../../hooks/close-won/useClosedWonWizard'
import type { ClosedWonController } from '../../hooks/close-won/useClosedWonWizard'

// Closed-Won wizard Step 2 — the Sales Order / Demo Request artifact step:
// quote selection, line items + BOM, addresses, order summary and commercial
// terms. Extracted verbatim from ClosedWonWizardBody; state comes from `f`.
/** A bare `YYYY-MM-DD` rental bound, rendered without timezone shifting. */
function formatRentalBound(value: string): string {
  const parsed = parseDateParam(value)
  return parsed ? formatDateLabel(parsed) : value
}

const S = CLOSE_WON_STRINGS.soStep

export function ClosedWonArtifactStep({ f }: { f: ClosedWonController }) {
  const {
    accountName,
    attachments,
    billingAddressPool,
    calculateQuery,
    delivery,
    demoLeadAccount,
    demoLeadContact,
    documents,
    entityValue,
    existingAccountId,
    existingAccountName,
    grandTotal,
    gst,
    handleDemoCreated,
    handleDemoState,
    id,
    isDemo,
    isLead,
    isOnSOStep,
    lineDiscount,
    lineItems,
    notes,
    orderType,
    paymentTerms,
    quoteRental,
    rentalOrderDate,
    setRentalOrderDate,
    rentalSubmitTried,
    rentalStartDate,
    rentalEndDate,
    setRentalStartDate,
    setRentalEndDate,
    isRentalOrder,
    rentalWindowReady,
    rentalWindowInverted,
    quoteOptionsHook,
    selectedBillingId,
    selectedQuote,
    selectedShippingId,
    setAddAddressOpen,
    setAddAddressType,
    setDelivery,
    setEditingAddress,
    setEditingSource,
    setNotes,
    setOrderType,
    setPaymentTerms,
    setSelectedBillingId,
    setSelectedQuote,
    setSelectedShippingId,
    setSoOrDemo,
    setWarranty,
    shippingAddressPool,
    showDemoToggle,
    soOrDemo,
    subtotal,
    warranty,
  } = f

  // Backend discriminator (not user copy) — hoisted so the 'lead'/'deal'
  // literals live in JS, out of the no-literal-string rule's scope.
  const kind = isLead ? 'lead' : 'deal'

  return (
          <div className={cn('space-y-6', !isOnSOStep && 'hidden')}>
              {showDemoToggle && (
                <ArtifactChoice value={soOrDemo} onChange={setSoOrDemo} />
              )}
              {soOrDemo === 'demo' ? (
                <ClosedWonDemoForm
                  formId="cw-demo-form"
                  entityType={isLead ? 'lead' : 'deal'}
                  entityId={id ?? ''}
                  accountId={existingAccountId ?? undefined}
                  accountName={existingAccountName || undefined}
                  leadAccount={isLead ? demoLeadAccount : undefined}
                  leadContact={isLead ? demoLeadContact : undefined}
                  documents={isLead ? documents : undefined}
                  onStateChange={handleDemoState}
                  onCreated={handleDemoCreated}
                />
              ) : (
            <div className="space-y-6">
              {/* ── Top row: Quote Selection (left) aligned with the Account
                  + Order Summary rail (right). Line Items, Addresses and
                  Notes/Terms all run full-width below this row so the items
                  table has the whole page width and never needs to scroll. ── */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Left: Quote Selection */}
                <div className="flex flex-col xl:col-span-8">
                {/* ── Quote Selection (embedded inside SO step) ──
                    Quote picking is part of the Sales Order — picking a
                    quote pre-populates the line-item editor below. If no
                    Accepted quote exists for this {isLead ? 'lead' : 'deal'},
                    the picker's empty-state offers a Create-Quote link that
                    deep-links into the Quote form with this entity pre-filled.
                    Demo path skips this card entirely — demos never have
                    quotes. */}
                {!isDemo && (
                <Card className="flex-1">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Receipt className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13.5px] font-semibold leading-tight">
                          {S.quote.heading}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {/* pre-2026-05-20: "Pick an Accepted (or PartiallyFulfilled) quote..." */}
                          {S.quote.subtitle(kind)}
                        </p>
                      </div>
                    </div>

                    {/*
                      2026-05-19: Quote is optional now. The picker is an
                      inline AsyncSelect filtered to every non-Rejected
                      status (Draft / Sent / Accepted post-2026-05-20
                      decoupling) — scroll-to-load-more, debounced search.
                      Selecting one seeds the line items table; the user
                      can still add ad-hoc items below.
                    */}
                    <AsyncSelect<QuoteListItemWire>
                      value={
                        selectedQuote
                          ? {
                              id: selectedQuote.id,
                              label: `${selectedQuote.quote_number} · v${selectedQuote.version_number}`,
                            }
                          : null
                      }
                      onValueChange={(next) => {
                        if (next === null) setSelectedQuote(null)
                      }}
                      onItemPick={(row) => setSelectedQuote(row)}
                      useOptions={quoteOptionsHook}
                      toLabel={(q) =>
                        `${q.quote_number} · v${q.version_number}`
                      }
                      placeholder={S.quote.selectPlaceholder}
                      searchPlaceholder={S.quote.searchPlaceholder}
                      clearable
                      loadOnOpen
                      renderItem={(q) => (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {q.quote_number}
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              v{q.version_number}
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {q.status}
                            {q.entity_number ? ` · ${q.entity_number}` : ''}
                          </div>
                        </div>
                      )}
                    />
                    {selectedQuote && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {S.quote.loadedBefore}<span className="font-medium">{selectedQuote.quote_number}</span>
                        {S.quote.loadedAfter}
                      </p>
                    )}

                    {/* Order Type — classification carried onto the SO
                        header. Mirrors SalesOrderFormPage's Order Details
                        select; sent as a one-element `order_type` array. */}
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <Label htmlFor="cw-order-type">
                        {S.quote.orderTypeLabel} <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={orderType || null}
                        onValueChange={(v) => setOrderType((v ?? '') as SOOrderType | '')}
                        // A rental quote makes this a Rental order — fixed.
                        disabled={quoteRental !== null}
                      >
                        <SelectTrigger id="cw-order-type" className="w-full">
                          <SelectValue placeholder={S.quote.orderTypePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {SO_ORDER_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Order Type alone is a LABEL — `sellable_type` is
                          what the rentals module keys off, and it is the
                          WINDOW below that makes the lines rental. So the
                          dates appear the moment this is a rental order,
                          with or without a quote. */}
                      {isRentalOrder ? (
                        <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                          <div>
                            <Typography variant="body-strong">
                              {S.quote.rentalWindowHeading}
                            </Typography>
                            <Typography variant="helper" tone="muted">
                              {S.quote.rentalWindowHelp}
                            </Typography>
                          </div>

                          {/* Order date beside the rental period, as on the
                              Sales Order form. A quote carries no order date,
                              so it is always picked here. */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="cw-rental-order" required>
                                {S.quote.rentalOrderLabel}
                              </Label>
                              <DatePicker
                                id="cw-rental-order"
                                value={rentalOrderDate}
                                onChange={setRentalOrderDate}
                                clearable
                              />
                              {rentalSubmitTried && !rentalOrderDate ? (
                                <Typography variant="helper" tone="danger">
                                  {S.quote.rentalOrderMissing}
                                </Typography>
                              ) : (
                                <Typography variant="helper" tone="muted">
                                  {S.quote.rentalOrderHelp}
                                </Typography>
                              )}
                            </div>
                            {/* ONE period on a two-calendar picker, the same
                                control as the Sales Order form: both ends
                                against one highlighted span, so an
                                inverted window cannot be picked. Cleared,
                                it falls back to the quote's own span. */}
                            <div className="space-y-1.5">
                              <Label htmlFor="cw-rental-period" required>
                                {S.quote.rentalPeriodLabel}
                              </Label>
                              <DateRangePicker
                                id="cw-rental-period"
                                value={
                                  rentalStartDate || rentalEndDate
                                    ? {
                                        from: parseDateParam(rentalStartDate),
                                        to: parseDateParam(rentalEndDate),
                                      }
                                    : undefined
                                }
                                onChange={(next) => {
                                  setRentalStartDate(next?.from ? toDateParam(next.from) : '')
                                  setRentalEndDate(next?.to ? toDateParam(next.to) : '')
                                }}
                                placeholder={S.quote.rentalPeriodPlaceholder}
                              />
                              <Typography variant="helper" tone="muted">
                                {S.quote.rentalPeriodHelp}
                              </Typography>
                            </div>
                          </div>

                          {rentalWindowInverted ? (
                            <Typography variant="helper" tone="danger">
                              {S.quote.rentalWindowInvertedField}
                            </Typography>
                          ) : !rentalWindowReady ? (
                            // Only once a submit was refused for it.
                            rentalSubmitTried ? (
                              <Typography variant="helper" tone="danger">
                                {S.quote.rentalWindowMissing}
                              </Typography>
                            ) : null
                          ) : (
                            <Alert>
                              <AlertTitle>{S.quote.rentalTitle}</AlertTitle>
                              <AlertDescription className="space-y-1">
                                <span className="block">
                                  {quoteRental
                                    ? S.quote.rentalBody(
                                        quoteRental.rentalLineCount,
                                        quoteRental.totalLineCount,
                                        formatRentalBound(rentalStartDate),
                                        formatRentalBound(rentalEndDate),
                                      )
                                    : S.quote.rentalBodyNoQuote(
                                        formatRentalBound(rentalStartDate),
                                        formatRentalBound(rentalEndDate),
                                      )}
                                </span>
                                <span className="block">{S.quote.rentalCycleNote}</span>
                              </AlertDescription>
                            </Alert>
                          )}

                          {quoteRental && rentalWindowReady ? (
                            <Typography variant="helper" tone="muted">
                              {S.quote.rentalWindowSeeded}
                            </Typography>
                          ) : null}
                        </div>
                      ) : (
                        <Typography variant="helper" tone="muted">
                          {S.quote.orderTypeNotRentalSwitch}
                        </Typography>
                      )}
                    </div>
                  </CardContent>
                </Card>
                )}
                </div>
                {/* Right: Account card — aligned with the Quote Selection
                    card above. Order Summary moved below the line items. */}
                <div className="xl:col-span-4">
                  <div className="space-y-4">
                    {/* Account & Deal banner */}
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="size-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{S.account.label}</p>
                            <p className="truncate text-sm font-semibold">{isLead ? (accountName || S.account.emDash) : existingAccountName || S.account.na}</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{isDemo ? S.account.demoValue : S.account.dealValue}</p>
                          <p className="text-sm font-semibold">&#8377;{fmtCurrency(entityValue)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

                {/* Line Items — button-to-add UX.
                    "Add line item" appends an editable row; the part number is
                    picked inline inside the row (auto-fills rate & category).
                    Rows wrap instead of scrolling, so the list never needs a
                    horizontal scrollbar. Totals come from the calculate
                    endpoint — never computed FE-side. */}
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <ClipboardList className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[13.5px] font-semibold leading-tight">{S.items.heading}</h3>
                        <p className="text-xs text-muted-foreground">
                          {S.items.subtitle}
                        </p>
                      </div>
                    </div>

                    <ClosedWonLineItemsGrid f={f} />

                    {calculateQuery.isError && (
                      <LoadErrorState error={calculateQuery.error} fallback={S.items.calcError} compact />
                    )}
                  </CardContent>
                </Card>

                {/* Attachments — same section (and same shared controller) as
                    the SO form, placed before Addresses to match it. */}
                <Card>
                  <CardContent className="p-5">
                    <SoAttachmentsSection controller={attachments} />
                  </CardContent>
                </Card>

                {/* Addresses */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-semibold leading-tight">{S.addresses.heading}</h3>
                        <p className="text-xs text-muted-foreground">{S.addresses.subtitle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Billing — single-select; the SO API takes ONE
                          `billing_address_id`, not a list. Add button below
                          pre-selects `Billing` on the dialog so the user
                          doesn't have to flip the type manually. */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {S.addresses.billingLabel} <span className="text-destructive">*</span>
                          </Label>
                          {/* Lead branch: cap to one address per type — the
                              SO cascade only carries one `billing_address_data`,
                              so a second Add wouldn't reach the backend.
                              Deal branch: account-owned addresses can stack,
                              keep the button enabled. */}
                          {!(isLead && billingAddressPool.length > 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setEditingAddress(null); setEditingSource(null); setAddAddressType('Billing'); setAddAddressOpen(true) }}
                            >
                              <Plus className="mr-1 size-3" /> {S.addresses.add}
                            </Button>
                          )}
                        </div>
                        {billingAddressPool.length > 0 ? (
                          <div className="space-y-2">
                            {billingAddressPool.map((addr) => {
                              const checked = selectedBillingId === addr.id
                              return (
                                <div
                                  key={addr.id}
                                  className={cn(
                                    'flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
                                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                                  )}
                                >
                                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                                    <input
                                      type="radio"
                                      name="closedwon-billing"
                                      checked={checked}
                                      onChange={() => setSelectedBillingId(addr.id)}
                                      className="mt-0.5 size-4 accent-primary"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[13px] font-medium">{addr.label}</span>
                                        <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                                        {addr.isDefault && <Badge variant="secondary" className="text-[10px]">{S.addresses.defaultBadge}</Badge>}
                                      </div>
                                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''} · {addr.city}, {addr.state} — {addr.pincode}
                                      </p>
                                    </div>
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 shrink-0 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingAddress(addr)
                                      // Account-owned rows PATCH on save; local
                                      // ('New') rows replace in the staged pool.
                                      setEditingSource(addr.source === 'Account' ? 'Account' : 'New')
                                      setAddAddressType(addr.type === 'Both' ? 'Billing' : addr.type)
                                      setAddAddressOpen(true)
                                    }}
                                    aria-label={S.addresses.editAddress(addr.label || S.addresses.addressFallback)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center">
                            <MapPin className="mx-auto mb-1 size-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{S.addresses.billingEmptyTitle}</p>
                            <p className="text-xs text-muted-foreground">{S.addresses.emptyAddHint}</p>
                          </div>
                        )}
                      </div>
                      {/* Shipping — same single-select pattern. */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {S.addresses.shippingLabel} <span className="text-destructive">*</span>
                          </Label>
                          {!(isLead && shippingAddressPool.length > 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setEditingAddress(null); setEditingSource(null); setAddAddressType('Shipping'); setAddAddressOpen(true) }}
                            >
                              <Plus className="mr-1 size-3" /> {S.addresses.add}
                            </Button>
                          )}
                        </div>
                        {shippingAddressPool.length > 0 ? (
                          <div className="space-y-2">
                            {shippingAddressPool.map((addr) => {
                              const checked = selectedShippingId === addr.id
                              return (
                                <div
                                  key={addr.id}
                                  className={cn(
                                    'flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
                                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                                  )}
                                >
                                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                                    <input
                                      type="radio"
                                      name="closedwon-shipping"
                                      checked={checked}
                                      onChange={() => setSelectedShippingId(addr.id)}
                                      className="mt-0.5 size-4 accent-primary"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[13px] font-medium">{addr.label}</span>
                                        <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                                        {addr.isDefault && <Badge variant="secondary" className="text-[10px]">{S.addresses.defaultBadge}</Badge>}
                                      </div>
                                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''} · {addr.city}, {addr.state} — {addr.pincode}
                                      </p>
                                    </div>
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 shrink-0 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingAddress(addr)
                                      // Account-owned rows PATCH on save; local
                                      // ('New') rows replace in the staged pool.
                                      setEditingSource(addr.source === 'Account' ? 'Account' : 'New')
                                      setAddAddressType(addr.type === 'Both' ? 'Billing' : addr.type)
                                      setAddAddressOpen(true)
                                    }}
                                    aria-label={S.addresses.editAddress(addr.label || S.addresses.addressFallback)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center">
                            <MapPin className="mx-auto mb-1 size-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{S.addresses.shippingEmptyTitle}</p>
                            <p className="text-xs text-muted-foreground">{S.addresses.emptyAddHint}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

              {/* ── Order Summary — moved below the line items ──
                  Shares the SO / Quote <TotalsSummary> (card variant) so the
                  totals can't drift between the wizard and the Sales Order. */}
              <TotalsSummary
                variant="card"
                lineItemCount={lineItems.length}
                subtotal={subtotal}
                lineDiscount={lineDiscount}
                totalTax={gst}
                grandTotal={grandTotal}
              />

              {/* ── Commercial terms & notes — full-width row below items ── */}
              <CommercialTermsSection
                variant="card"
                value={{ paymentTerms, warranty, delivery, notes }}
                onFieldChange={(field, val) => {
                  if (field === "paymentTerms") setPaymentTerms(val)
                  else if (field === "warranty") setWarranty(val)
                  else if (field === "delivery") setDelivery(val)
                  else setNotes(val)
                }}
              />
            </div>
              )}
            </div>
  )
}
