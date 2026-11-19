import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"

import { sanitizePhoneDigits } from "../../lib/validation"
import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

export function DemoLeadContactShipping({ form }: { form: DemoRequestFormController }) {
  const { errors, clearError } = form

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="contactName">
          {S.form.contact.nameLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contactName"
          value={form.contactName}
          onChange={(e) => {
            form.setContactName(e.target.value)
            clearError("contactName")
          }}
          placeholder={S.form.contact.namePlaceholder}
          aria-invalid={Boolean(errors.contactName)}
        />
        <FieldError id="demo-contact-name-error" message={errors.contactName} />
      </div>

      {/* Phone and email are NOT individually required — validation accepts
          either one (see `contactReachRequired`), so neither carries the
          required asterisk; the hint under the email field states the rule. */}
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">{S.form.contact.phoneLabel}</Label>
        <Input
          id="contactPhone"
          inputMode="numeric"
          maxLength={10}
          value={form.contactPhone}
          onChange={(e) => {
            form.setContactPhone(sanitizePhoneDigits(e.target.value))
            clearError("contactPhone")
          }}
          placeholder={S.form.contact.phonePlaceholder}
          aria-invalid={Boolean(errors.contactPhone)}
        />
        <FieldError id="demo-contact-phone-error" message={errors.contactPhone} />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="contactEmail">{S.form.contact.emailLabel}</Label>
        <Input
          id="contactEmail"
          type="email"
          value={form.contactEmail}
          onChange={(e) => {
            form.setContactEmail(e.target.value)
            clearError("contactEmail")
          }}
          placeholder={S.form.contact.emailPlaceholder}
          aria-invalid={Boolean(errors.contactEmail)}
        />
        <FieldError id="demo-contact-email-error" message={errors.contactEmail} />
        <Typography variant="helper" asChild>
          <p>{S.form.contact.reachHint}</p>
        </Typography>
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="shippingLine1">
          {S.form.shipping.line1Label} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="shippingLine1"
          value={form.shippingLine1}
          onChange={(e) => {
            form.setShippingLine1(e.target.value)
            clearError("shippingAddress")
          }}
          placeholder={S.form.shipping.line1Placeholder}
          aria-invalid={Boolean(errors.shippingAddress)}
        />
        <FieldError id="demo-shipping-error" message={errors.shippingAddress} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shippingCity">
          {S.form.shipping.cityLabel} <span className="text-destructive">*</span>
        </Label>
        <Input id="shippingCity" value={form.shippingCity} onChange={(e) => {
          form.setShippingCity(e.target.value)
          clearError("shippingCity")
        }} />
        <FieldError id="demo-shipping-city-error" message={errors.shippingCity} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shippingState">
          {S.form.shipping.stateLabel} <span className="text-destructive">*</span>
        </Label>
        <Input id="shippingState" value={form.shippingState} onChange={(e) => {
          form.setShippingState(e.target.value)
          clearError("shippingState")
        }} />
        <FieldError id="demo-shipping-state-error" message={errors.shippingState} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shippingPincode">
          {S.form.shipping.pincodeLabel} <span className="text-destructive">*</span>
        </Label>
        <Input id="shippingPincode" value={form.shippingPincode} onChange={(e) => {
          form.setShippingPincode(e.target.value)
          clearError("shippingPincode")
        }} />
        <FieldError id="demo-shipping-pincode-error" message={errors.shippingPincode} />
      </div>
    </>
  )
}
