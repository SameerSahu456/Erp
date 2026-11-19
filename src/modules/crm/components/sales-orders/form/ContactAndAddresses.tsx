import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"

import { DealContactSelect } from "../../deals/DealContactSelect"
import { AddressPickerSection } from "./AddressPickerSection"
import type { AccountAddressWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function ContactAndAddresses({
  accountId,
  contactId,
  setContactId,
  billingAddressId,
  setBillingAddressId,
  shippingAddressId,
  setShippingAddressId,
  billingAddresses,
  shippingAddresses,
  addressesLoading,
  readOnly,
  errors,
  clearError,
  mode = "all",
}: {
  accountId: string
  contactId: string
  setContactId: (id: string) => void
  billingAddressId: string
  setBillingAddressId: (id: string) => void
  shippingAddressId: string
  setShippingAddressId: (id: string) => void
  billingAddresses: AccountAddressWire[]
  shippingAddresses: AccountAddressWire[]
  addressesLoading: boolean
  readOnly: boolean
  errors: Record<string, string | undefined>
  clearError: (key: string) => void
  /** `'contact'` renders only the Contact picker (used inside the Order
   *  Details card). `'addresses'` renders only the Billing + Shipping pickers
   *  (used inside the standalone Addresses card). `'all'` keeps the legacy
   *  bundled layout for callers that haven't migrated yet. */
  mode?: "contact" | "addresses" | "all"
}) {
  const showContact = mode === "contact" || mode === "all"
  const showAddresses = mode === "addresses" || mode === "all"
  return (
    <>
      {showContact && (
      <div className="space-y-2">
        <Label>
          {S.form.contact.label} <span className="text-destructive">*</span>
        </Label>
        <DealContactSelect
          value={contactId || null}
          onValueChange={(id) => {
            setContactId(id ?? "")
            clearError("contactId")
          }}
          accountId={accountId || undefined}
          disabled={readOnly || !accountId}
          placeholder={accountId ? S.form.contact.placeholder : S.form.contact.placeholderNoAccount}
        />
        <FieldError id="so-contact-error" message={errors.contactId} />
      </div>
      )}

      {showAddresses && (
        <div className="grid grid-cols-1 gap-6 sm:col-span-2 lg:grid-cols-2">
          <AddressPickerSection
            kind="Billing"
            required
            accountId={accountId}
            addresses={billingAddresses}
            selectedId={billingAddressId}
            onSelect={(id) => {
              setBillingAddressId(id)
              clearError("billingAddressId")
            }}
            loading={addressesLoading}
            readOnly={readOnly}
            errorMsg={errors.billingAddressId}
            errorId="so-billing-error"
          />
          <AddressPickerSection
            kind="Shipping"
            required
            accountId={accountId}
            addresses={shippingAddresses}
            selectedId={shippingAddressId}
            onSelect={(id) => {
              setShippingAddressId(id)
              clearError("shippingAddressId")
            }}
            loading={addressesLoading}
            readOnly={readOnly}
            errorMsg={errors.shippingAddressId}
            errorId="so-shipping-error"
          />
        </div>
      )}
    </>
  )
}
