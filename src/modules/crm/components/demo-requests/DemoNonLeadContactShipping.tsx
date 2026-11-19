import { Pencil, Plus } from "lucide-react"

import { AsyncSelect } from "@/components/ui/async-select"
import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { AddressFormDialog } from "../AddressFormDialog"
import { ContactFormDialog } from "../ContactFormDialog"
import type { AccountAddressWire, ContactListItem } from "../../api"
import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

function addressLabel(address: AccountAddressWire): string {
  return [
    address.label,
    address.line1,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ")
}

export function DemoNonLeadContactShipping({ form }: { form: DemoRequestFormController }) {
  const { accountId, shippingAddresses, shippingAddressesQuery, errors, clearError } = form

  return (
    <>
      {form.sourceType === "deal" && (
        <div className="space-y-1.5">
          <Label htmlFor="account">{S.form.contact.accountLabel}</Label>
          <Input
            id="account"
            value={form.accountOption?.label ?? ""}
            readOnly
            placeholder={S.form.contact.accountFromDeal}
            aria-invalid={Boolean(errors.accountId)}
          />
          <FieldError id="demo-account-error" message={errors.accountId} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="contact">
          {S.form.contact.contactLabel} <span className="text-destructive">*</span>
        </Label>
        <AsyncSelect<ContactListItem>
          id="contact"
          value={form.contactOption}
          onValueChange={(next) => {
            form.setContactOption(next)
            form.setContactId(next?.id ?? "")
          }}
          onItemPick={form.handleContactPick}
          useOptions={form.useContactOptionsForSelectedAccount}
          toLabel={(contact) => contact.name}
          placeholder={accountId ? S.form.contact.selectContact : S.form.contact.pickSourceFirst}
          searchPlaceholder={S.form.contact.searchContacts}
          disabled={!accountId}
          loadOnOpen
          itemAction={(contact) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                form.setEditingContact(contact)
                form.setAddContactOpen(true)
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
                form.setEditingContact(null)
                close()
                form.setAddContactOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-accent"
            >
              <Plus className="size-4" />
              {S.form.contact.addNewContact}
            </button>
          )}
        />
        <FieldError id="demo-contact-id-error" message={errors.contactId} />
        {accountId && (
          <ContactFormDialog
            mode="persist"
            open={form.addContactOpen}
            onOpenChange={(next) => {
              form.setAddContactOpen(next)
              if (!next) form.setEditingContact(null)
            }}
            accountId={accountId}
            contact={form.editingContact}
            onCreated={(contact) => {
              form.setContactId(contact.id)
              form.setContactOption({ id: contact.id, label: contact.name })
              form.setContactName(contact.name)
              form.setContactPhone(contact.phone ?? "")
              form.setContactEmail(contact.email ?? "")
              clearError("contactId")
              clearError("contactName")
              clearError("contactPhone")
              clearError("contactEmail")
            }}
          />
        )}
      </div>

      <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
        <Label htmlFor="shippingAddressId">
          {S.form.shipping.addressLabel} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.shippingAddressId}
          onValueChange={(value) => {
            form.setShippingAddressId(value ?? "")
            clearError("shippingAddress")
          }}
          open={form.shippingSelectOpen}
          onOpenChange={form.setShippingSelectOpen}
          disabled={!accountId || shippingAddressesQuery.isLoading}
        >
          <SelectTrigger id="shippingAddressId" className="w-full">
            <SelectValue
              placeholder={
                !accountId
                  ? S.form.shipping.pickSourceFirst
                  : shippingAddressesQuery.isLoading
                    ? S.form.shipping.loadingAddresses
                    : shippingAddresses.length === 0
                      ? S.form.shipping.noAddresses
                      : S.form.shipping.selectAddress
              }
            >
              {form.shippingAddressId
                ? (() => {
                    const selected = shippingAddresses.find((a) => a.id === form.shippingAddressId)
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
                {/* Keyboard-operable edit affordance: tabIndex=0 + an
                    Enter/Space handler (which stops propagation so the Select
                    doesn't treat the press as an option pick). */}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={S.form.shipping.editAddress(address.label ?? S.form.shipping.addressFallback)}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return
                    e.preventDefault()
                    e.stopPropagation()
                    form.setShippingSelectOpen(false)
                    form.setEditingAddr(address)
                    form.setAddAddrOpen(true)
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    form.setShippingSelectOpen(false)
                    form.setEditingAddr(address)
                    form.setAddAddrOpen(true)
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
                e.preventDefault()
                e.stopPropagation()
                form.setShippingSelectOpen(false)
                form.setEditingAddr(null)
                form.setAddAddrOpen(true)
              }}
              className={
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent" +
                (shippingAddresses.length > 0 ? " mt-1 border-t border-border" : "")
              }
            >
              <Plus className="size-4" />
              {S.form.shipping.addAddress}
            </button>
          </SelectContent>
        </Select>
        <FieldError id="demo-shipping-error" message={errors.shippingAddress} />
        {accountId && (
          <AddressFormDialog
            mode="persist"
            open={form.addAddrOpen}
            onOpenChange={(next) => {
              form.setAddAddrOpen(next)
              if (!next) form.setEditingAddr(null)
            }}
            accountId={accountId}
            defaultType="Shipping"
            initialValues={form.editingAddr}
            onCreated={(id) => {
              void shippingAddressesQuery.refetch()
              form.setShippingAddressId(id)
              clearError("shippingAddress")
            }}
          />
        )}
      </div>
    </>
  )
}
