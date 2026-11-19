import { User } from "lucide-react"

import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import { isNameInput, sanitizePhoneDigits } from "@/modules/crm/lib/validation"

import type { ContactFormController } from "../../hooks/contacts/useContactForm"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { SectionHeader } from "../shared/SectionHeader"

export function ContactIdentitySection({ form }: { form: ContactFormController }) {
  const {
    name, setName,
    email, setEmail,
    phone, setPhone,
    altPhone, setAltPhone,
    errors, clearError,
  } = form

  return (
    <div className="space-y-4">
      <SectionHeader icon={User} label={CONTACTS_STRINGS.form.identity.sectionLabel} />

      <div className="space-y-1.5">
        <Label htmlFor="contact-name" className="font-ui">
          {CONTACTS_STRINGS.form.identity.name} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contact-name"
          placeholder={CONTACTS_STRINGS.form.identity.namePlaceholder}
          value={name}
          maxLength={255}
          onChange={(e) => {
            const v = e.target.value
            if (!isNameInput(v)) return
            setName(v)
            clearError("name")
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
        />
        <FieldError id="contact-name-error" message={errors.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-email" className="font-ui">
          {CONTACTS_STRINGS.form.identity.email} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contact-email"
          type="email"
          placeholder={CONTACTS_STRINGS.form.identity.emailPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            clearError("email")
            clearError("contact")
          }}
          aria-invalid={Boolean(errors.email || errors.contact)}
          aria-describedby={
            errors.email
              ? "contact-email-error"
              : errors.contact
                ? "contact-contact-error"
                : undefined
          }
        />
        <FieldError id="contact-email-error" message={errors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-phone" className="font-ui">
          {CONTACTS_STRINGS.form.identity.phone} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contact-phone"
          inputMode="tel"
          placeholder={CONTACTS_STRINGS.form.identity.phonePlaceholder}
          value={phone}
          onChange={(e) => {
            setPhone(sanitizePhoneDigits(e.target.value))
            clearError("phone")
            clearError("contact")
          }}
          maxLength={10}
          aria-invalid={Boolean(errors.phone || errors.contact)}
          aria-describedby={
            errors.phone
              ? "contact-phone-error"
              : errors.contact
                ? "contact-contact-error"
                : undefined
          }
        />
        <FieldError id="contact-phone-error" message={errors.phone} />
        <FieldError id="contact-contact-error" message={errors.contact} />
        <Typography variant="helper" asChild>
          <p>{CONTACTS_STRINGS.form.identity.contactHint}</p>
        </Typography>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-alt-phone" className="font-ui">
          {CONTACTS_STRINGS.form.identity.altPhone}
        </Label>
        <Input
          id="contact-alt-phone"
          inputMode="tel"
          placeholder={CONTACTS_STRINGS.form.identity.altPhonePlaceholder}
          value={altPhone}
          onChange={(e) => {
            setAltPhone(sanitizePhoneDigits(e.target.value))
            clearError("altPhone")
          }}
          maxLength={10}
          aria-invalid={Boolean(errors.altPhone)}
          aria-describedby={
            errors.altPhone ? "contact-alt-phone-error" : undefined
          }
        />
        <FieldError
          id="contact-alt-phone-error"
          message={errors.altPhone}
        />
      </div>
    </div>
  )
}
