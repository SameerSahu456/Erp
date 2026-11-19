import { useEffect, type ChangeEvent } from "react"
import { useForm, type Resolver, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"

import { contactSchema, type ContactFormInput } from "../../schemas"
import type { VendorContact } from "../../api"
import { VENDORS_STRINGS } from "./vendors.strings"

const S = VENDORS_STRINGS.detail.contacts.dialog

// Strip non-phone characters at type-time so a phone field can never hold text
// (mirrors the vendor form's helper).
function phoneInputProps(reg: UseFormRegisterReturn) {
  return {
    ...reg,
    inputMode: "tel" as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = e.target.value.replace(/[^\d+()\-\s]/g, "")
      return reg.onChange(e)
    },
  }
}

const EMPTY: ContactFormInput = { name: "", email: undefined, phone: undefined }

interface VendorContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Edit mode when provided; add mode otherwise.
  contact?: VendorContact | null
  onSubmit: (values: ContactFormInput) => Promise<void>
  saving: boolean
}

export function VendorContactDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
  saving,
}: VendorContactDialogProps) {
  const isEdit = !!contact
  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactSchema) as Resolver<ContactFormInput>,
    defaultValues: EMPTY,
    mode: "onTouched",
  })

  // Reset on open so add starts blank and edit prefills the picked contact.
  useEffect(() => {
    if (open) {
      form.reset(
        contact
          ? {
              name: contact.name,
              email: contact.email ?? undefined,
              phone: contact.phone ?? undefined,
            }
          : EMPTY,
      )
    }
  }, [open, contact, form])

  const errors = form.formState.errors

  async function submit(values: ContactFormInput) {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? S.editTitle : S.addTitle}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button type="button" variant="outline" onClick={requestClose} disabled={saving}>
            {S.cancel}
          </Button>
          <Button type="submit" form="vendor-contact-form" disabled={saving}>
            {saving ? S.saving : S.save}
          </Button>
        </>
      )}
    >
      <form id="vendor-contact-form" onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="vc-name">
            {S.name} <span className="text-destructive">*</span>
          </Label>
          <Input id="vc-name" {...form.register("name")} placeholder={S.namePlaceholder} autoFocus />
          {errors.name && (
            <Typography variant="helper" tone="danger" asChild>
              <p>{errors.name.message}</p>
            </Typography>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vc-phone">{S.phone}</Label>
            <Input id="vc-phone" {...phoneInputProps(form.register("phone"))} placeholder={S.phonePlaceholder} />
            {errors.phone && (
              <Typography variant="helper" tone="danger" asChild>
                <p>{errors.phone.message}</p>
              </Typography>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vc-email">{S.email}</Label>
            <Input id="vc-email" type="email" {...form.register("email")} placeholder={S.emailPlaceholder} />
            {errors.email && (
              <Typography variant="helper" tone="danger" asChild>
                <p>{errors.email.message}</p>
              </Typography>
            )}
          </div>
        </div>
      </form>
    </OperationDialog>
  )
}
