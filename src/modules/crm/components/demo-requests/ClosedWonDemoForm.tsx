/**
 * Closed Won → Demo Request branch.
 *
 * Rendered inside `ClosedWonPage`'s Sales Order step when the user picks
 * "Demo Request" instead of "Sales Order". Submits `POST /crm/demo-requests`
 * (auto_submit → Pending for Approval) instead of creating a sales order.
 *
 * - Deal source: account is known from the deal; contact + shipping address
 *   are picked from that account.
 * - Lead source: account + contact come from Closed Won Step 1 (passed in as
 *   `leadAccount` / `leadContact`); the shipping address is entered inline.
 *
 * The component owns its own state and renders its own `<form id={formId}>`;
 * the parent's sticky-footer button submits it via `<button form={formId}>`
 * and reflects validity/pending through `onStateChange`.
 */
import { Pencil, Plus, Truck, Users } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AsyncSelect } from '@/components/ui/async-select'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import { DatePicker } from '@/components/common/pickers/DatePicker'

import type { AccountDocumentType } from '../../constants/account-documents'

import type {
  AccountAddressWire,
  ContactListItem,
  DemoRequestCreatePayload,
  DemoRequestWire,
} from '../../api'
import { AddressFormDialog } from '../AddressFormDialog'
import { ContactFormDialog } from '../ContactFormDialog'
import { DemoItemsCard } from './DemoItemsCard'
import { DEMO_REQUESTS_STRINGS as S } from './demo-requests.strings'
import {
  useClosedWonDemoForm,
  type ClosedWonDemoFormState,
} from './useClosedWonDemoForm'

export type { ClosedWonDemoFormState }

interface ClosedWonDemoFormProps {
  /** id wired to the parent's sticky-footer submit button. */
  formId: string
  entityType: 'lead' | 'deal'
  /** Lead id or deal id — the demo request's `source_id`. */
  entityId: string
  /** Deal branch — account already exists. */
  accountId?: string
  accountName?: string
  /** Lead branch — account/contact built from Closed Won Step 1. */
  leadAccount?: NonNullable<DemoRequestCreatePayload['account']>
  leadContact?: NonNullable<DemoRequestCreatePayload['contact_details']>
  /** Lead branch — KYC documents captured in Step 1. Uploaded onto the
   *  newly-provisioned account once the demo request is created. */
  documents?: Partial<Record<AccountDocumentType, File>>
  onStateChange: (state: ClosedWonDemoFormState) => void
  onCreated: (demoRequest: DemoRequestWire) => void
}

function addressLabel(address: AccountAddressWire): string {
  return [
    address.label,
    address.line1,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ')
}

function ClosedWonDemoForm({
  formId,
  entityType,
  entityId,
  accountId,
  accountName,
  leadAccount,
  leadContact,
  documents,
  onStateChange,
  onCreated,
}: ClosedWonDemoFormProps) {
  const {
    isLead,
    errors,
    clearError,
    todayIso,
    lines,
    setLines,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    setContactId,
    setContactOption,
    setShippingAddressId,
    shippingSelectOpen,
    setShippingSelectOpen,
    addAddrOpen,
    setAddAddrOpen,
    editingAddr,
    setEditingAddr,
    addContactOpen,
    setAddContactOpen,
    editingContact,
    setEditingContact,
    shippingLine1,
    setShippingLine1,
    shippingLine2,
    setShippingLine2,
    shippingCity,
    setShippingCity,
    shippingState,
    setShippingState,
    shippingPincode,
    setShippingPincode,
    shippingAddresses,
    shippingAddressesQuery,
    effectiveShippingId,
    effectiveContactOption,
    useContactOptionsForAccount,
    handleContactPick,
    handleSubmit,
    leadContactHasReach,
  } = useClosedWonDemoForm({
    entityType,
    entityId,
    accountId,
    leadAccount,
    leadContact,
    documents,
    onStateChange,
    onCreated,
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
      className="flex w-full flex-col gap-5"
    >
      {/* ── Customer ── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" strokeWidth={2} />
            </span>
            <div>
              <CardTitle>{S.form.customer.title}</CardTitle>
              <CardDescription>
                {isLead
                  ? S.form.customer.leadDescription
                  : S.form.customer.dealDescription}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLead ? (
            <>
              {/* Read-only summary from Step 1 */}
              <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <Typography variant="badge" tone="muted" asChild>
                    <p>{S.form.customer.summaryAccount}</p>
                  </Typography>
                  <Typography variant="body-strong" truncate asChild>
                    <p>{leadAccount?.name || '—'}</p>
                  </Typography>
                </div>
                <div>
                  <Typography variant="badge" tone="muted" asChild>
                    <p>{S.form.customer.summaryContact}</p>
                  </Typography>
                  <Typography variant="body-strong" truncate asChild>
                    <p>
                      {leadContact?.name || '—'}
                      {leadContact?.email || leadContact?.phone ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          · {leadContact.email || leadContact.phone}
                        </span>
                      ) : null}
                    </p>
                  </Typography>
                </div>
              </div>
              {!leadContactHasReach && (
                <Typography variant="helper" tone="danger" asChild>
                  <p>{S.form.customer.contactNoReach}</p>
                </Typography>
              )}
              <FieldError id="cw-demo-contact-error" message={errors.contact} />

              {/* Shipping address (inline) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cw-demo-ship-line1">
                    {S.form.shipping.line1Label} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cw-demo-ship-line1"
                    value={shippingLine1}
                    onChange={(e) => {
                      setShippingLine1(e.target.value)
                      clearError('shippingAddress')
                    }}
                    placeholder={S.form.shipping.line1Placeholder}
                    aria-invalid={Boolean(errors.shippingAddress)}
                  />
                  <FieldError
                    id="cw-demo-ship-line1-error"
                    message={errors.shippingAddress}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cw-demo-ship-line2">{S.form.shipping.line2Label}</Label>
                  <Input
                    id="cw-demo-ship-line2"
                    value={shippingLine2}
                    onChange={(e) => setShippingLine2(e.target.value)}
                    placeholder={S.form.shipping.line2Placeholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cw-demo-ship-city">
                    {S.form.shipping.cityLabel} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cw-demo-ship-city"
                    value={shippingCity}
                    onChange={(e) => {
                      // Letters, spaces and hyphens only.
                      setShippingCity(
                        e.target.value.replace(/[^A-Za-z\s-]/g, ''),
                      )
                      clearError('shippingCity')
                    }}
                    aria-invalid={Boolean(errors.shippingCity)}
                  />
                  <FieldError
                    id="cw-demo-ship-city-error"
                    message={errors.shippingCity}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cw-demo-ship-state">
                    {S.form.shipping.stateLabel} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cw-demo-ship-state"
                    value={shippingState}
                    onChange={(e) => {
                      // Letters, spaces and hyphens only.
                      setShippingState(
                        e.target.value.replace(/[^A-Za-z\s-]/g, ''),
                      )
                      clearError('shippingState')
                    }}
                    aria-invalid={Boolean(errors.shippingState)}
                  />
                  <FieldError
                    id="cw-demo-ship-state-error"
                    message={errors.shippingState}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cw-demo-ship-pincode">
                    {S.form.shipping.pincodeLabel} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cw-demo-ship-pincode"
                    value={shippingPincode}
                    maxLength={6}
                    inputMode="numeric"
                    onChange={(e) => {
                      // Digits only.
                      setShippingPincode(e.target.value.replace(/\D/g, ''))
                      clearError('shippingPincode')
                    }}
                    aria-invalid={Boolean(errors.shippingPincode)}
                  />
                  <FieldError
                    id="cw-demo-ship-pincode-error"
                    message={errors.shippingPincode}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cw-demo-account">{S.form.contact.accountLabel}</Label>
                <Input
                  id="cw-demo-account"
                  value={accountName ?? ''}
                  readOnly
                  placeholder={S.form.contact.accountFromDealRo}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cw-demo-contact">
                  {S.form.contact.contactLabel} <span className="text-destructive">*</span>
                </Label>
                <AsyncSelect<ContactListItem>
                  id="cw-demo-contact"
                  value={effectiveContactOption}
                  onValueChange={(next) => {
                    setContactOption(next)
                    setContactId(next?.id ?? '')
                  }}
                  onItemPick={handleContactPick}
                  useOptions={useContactOptionsForAccount}
                  toLabel={(contact) => contact.name}
                  placeholder={accountId ? S.form.contact.selectContact : S.form.contact.noAccount}
                  searchPlaceholder={S.form.contact.searchContacts}
                  disabled={!accountId}
                  loadOnOpen
                  itemAction={(contact) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingContact(contact)
                        setAddContactOpen(true)
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={S.form.contact.editContact(contact.name)}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  footer={({ close }) => (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(null)
                        close()
                        setAddContactOpen(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-accent"
                    >
                      <Plus className="size-4" />
                      {S.form.contact.addNewContact}
                    </button>
                  )}
                />
                <FieldError
                  id="cw-demo-contact-error"
                  message={errors.contactId}
                />
                {accountId && (
                  <ContactFormDialog
                    mode="persist"
                    open={addContactOpen}
                    onOpenChange={(next) => {
                      setAddContactOpen(next)
                      if (!next) setEditingContact(null)
                    }}
                    accountId={accountId}
                    contact={editingContact}
                    onCreated={(contact) => {
                      // Create/update mutation invalidates contact options, so
                      // the AsyncSelect refreshes; (re)select the contact.
                      setContactId(contact.id)
                      setContactOption({ id: contact.id, label: contact.name })
                      clearError('contactId')
                    }}
                  />
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cw-demo-shipping">
                  {S.form.shipping.addressLabel} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={effectiveShippingId}
                  onValueChange={(value) => {
                    setShippingAddressId(value ?? '')
                    clearError('shippingAddress')
                  }}
                  open={shippingSelectOpen}
                  onOpenChange={setShippingSelectOpen}
                  disabled={!accountId || shippingAddressesQuery.isLoading}
                >
                  <SelectTrigger id="cw-demo-shipping" className="w-full">
                    <SelectValue
                      placeholder={
                        !accountId
                          ? S.form.shipping.noAccount
                          : shippingAddressesQuery.isLoading
                            ? S.form.shipping.loadingAddresses
                            : shippingAddresses.length === 0
                              ? S.form.shipping.noAddresses
                              : S.form.shipping.selectAddress
                      }
                    >
                      {effectiveShippingId
                        ? (() => {
                            const selected = shippingAddresses.find(
                              (a) => a.id === effectiveShippingId,
                            )
                            return selected ? addressLabel(selected) : null
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {shippingAddresses.map((address) => (
                      <SelectItem key={address.id} value={address.id}>
                        <span className="min-w-0 flex-1 truncate">
                          {addressLabel(address)}
                        </span>
                        {/* Edit affordance lives inside the row, pinned right
                            just left of the selected-check. role=button (not a
                            nested <button>) + stopPropagation so activating it
                            edits instead of selecting the option. tabIndex=0 +
                            Enter/Space handler keep it keyboard-operable; the
                            key handler stops propagation so the Select doesn't
                            treat the press as an option pick. */}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={S.form.shipping.editAddress(address.label ?? S.form.shipping.addressFallback)}
                          onMouseDown={(e) => e.preventDefault()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return
                            e.preventDefault()
                            e.stopPropagation()
                            setShippingSelectOpen(false)
                            setEditingAddr(address)
                            setAddAddrOpen(true)
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShippingSelectOpen(false)
                            setEditingAddr(address)
                            setAddAddrOpen(true)
                          }}
                          className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Pencil className="size-3.5" />
                        </span>
                      </SelectItem>
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        // Not a SelectItem — stop Base UI treating it as a
                        // value, close the listbox, then open the dialog.
                        e.preventDefault()
                        e.stopPropagation()
                        setShippingSelectOpen(false)
                        setEditingAddr(null)
                        setAddAddrOpen(true)
                      }}
                      className={
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent' +
                        (shippingAddresses.length > 0
                          ? ' mt-1 border-t border-border'
                          : '')
                      }
                    >
                      <Plus className="size-4" />
                      {S.form.shipping.addAddress}
                    </button>
                  </SelectContent>
                </Select>
                <FieldError
                  id="cw-demo-shipping-error"
                  message={errors.shippingAddress}
                />
                {accountId && (
                  <AddressFormDialog
                    mode="persist"
                    open={addAddrOpen}
                    onOpenChange={(next) => {
                      setAddAddrOpen(next)
                      if (!next) setEditingAddr(null)
                    }}
                    accountId={accountId}
                    defaultType="Shipping"
                    initialValues={editingAddr}
                    onCreated={(id) => {
                      // Create/update mutation invalidates the addresses query;
                      // refetch eagerly so the row is in the pool before we
                      // select it.
                      void shippingAddressesQuery.refetch()
                      setShippingAddressId(id)
                      clearError('shippingAddress')
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Demo items ── */}
      <DemoItemsCard
        value={lines}
        onChange={(next) => {
          setLines(next)
          if (next.length > 0) clearError('items')
        }}
        error={errors.items}
      />

      {/* ── Logistics ── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <Truck className="size-4" strokeWidth={2} />
            </span>
            <div>
              <CardTitle>{S.form.logistics.title}</CardTitle>
              <CardDescription>
                {S.form.logistics.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cw-demo-return-date">
              {S.form.logistics.returnDateLabel} <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="cw-demo-return-date"
              value={expectedReturnDate}
              min={todayIso}
              onChange={(v) => {
                setExpectedReturnDate(v)
                clearError('expectedReturnDate')
              }}
              className="md:max-w-xs"
              aria-invalid={Boolean(errors.expectedReturnDate)}
            />
            <FieldError
              id="cw-demo-return-date-error"
              message={errors.expectedReturnDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cw-demo-notes">{S.form.logistics.notesLabel}</Label>
            <Textarea
              id="cw-demo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={S.form.logistics.notesPlaceholderClosedWon}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export { ClosedWonDemoForm }
