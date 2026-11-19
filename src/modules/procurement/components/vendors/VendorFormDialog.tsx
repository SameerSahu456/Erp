import { useEffect, type ChangeEvent } from "react"
import { useForm, type Resolver, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"

import { useCreateVendor, useUpdateVendor } from "../../hooks/vendors/useVendors"
import { vendorFormSchema, type VendorFormInput } from "../../schemas"
import type { Vendor, VendorStatus } from "../../api"
import { VENDOR_STATUS_LABELS } from "../../constants/vendor-status"
import { VENDORS_STRINGS } from "./vendors.strings"

interface VendorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When provided, the dialog is in edit mode and prefills from this record.
  vendor?: Vendor | null
  // Fires after a successful create/update with the saved record so callers
  // can navigate or refetch their detail view.
  onSaved?: (saved: Vendor) => void
}

const DEFAULT_VALUES: VendorFormInput = {
  name: "",
  // Required primary-contact fields default to "" (an empty required input),
  // not undefined, so RHF treats them as controlled from the start.
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  gst_number: undefined,
  status: "active",
  notes: undefined,
  line1: undefined,
  line2: undefined,
  city: undefined,
  state: undefined,
  pincode: undefined,
}

// Restrict a phone <Input> to phone-valid characters (digits, +, -, (), space)
// AT TYPE-TIME — letters and other symbols are stripped as the user types, so a
// phone field can never contain text. Wraps an RHF register() return.
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

function vendorToForm(vendor: Vendor): VendorFormInput {
  return {
    name: vendor.name,
    contact_name: vendor.contact_name ?? "",
    contact_email: vendor.contact_email ?? "",
    contact_phone: vendor.contact_phone ?? "",
    gst_number: vendor.gst_number ?? undefined,
    status: vendor.status,
    notes: vendor.notes ?? undefined,
    line1: vendor.line1 ?? undefined,
    line2: vendor.line2 ?? undefined,
    city: vendor.city ?? undefined,
    state: vendor.state ?? undefined,
    pincode: vendor.pincode ?? undefined,
  }
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: VendorFormDialogProps) {
  const isEdit = !!vendor
  const create = useCreateVendor()
  const update = useUpdateVendor(vendor?.id ?? "")

  const form = useForm<VendorFormInput>({
    // The schema uses .transform() so zod's input type (optional keys) differs
    // from its output/`VendorFormInput` (present-but-undefined). The resolver
    // does produce `VendorFormInput` at runtime, so this cast is accurate.
    resolver: zodResolver(vendorFormSchema) as Resolver<VendorFormInput>,
    defaultValues: vendor ? vendorToForm(vendor) : DEFAULT_VALUES,
    // Surface email/phone/name errors as the user fills the form, not only on
    // submit.
    mode: "onTouched",
  })

  // Reset form whenever the dialog opens — picks up the latest `vendor` data
  // and clears stale errors from a previous open.
  useEffect(() => {
    if (open) {
      form.reset(vendor ? vendorToForm(vendor) : DEFAULT_VALUES)
    }
  }, [open, vendor, form])

  const errors = form.formState.errors
  const status = form.watch("status")

  async function onSubmit(values: VendorFormInput) {
    // Zod's transform pipeline already collapses blank strings to undefined.
    // Translate undefined → null on PATCH so blank fields explicitly clear
    // (backend treats undefined as "no-op", null as "set to NULL").
    const payload = {
      name: values.name,
      contact_name: isEdit ? (values.contact_name ?? null) : values.contact_name,
      contact_email: isEdit ? (values.contact_email ?? null) : values.contact_email,
      contact_phone: isEdit ? (values.contact_phone ?? null) : values.contact_phone,
      gst_number: isEdit ? (values.gst_number ?? null) : values.gst_number,
      status: values.status,
      notes: isEdit ? (values.notes ?? null) : values.notes,
      line1: isEdit ? (values.line1 ?? null) : values.line1,
      line2: isEdit ? (values.line2 ?? null) : values.line2,
      city: isEdit ? (values.city ?? null) : values.city,
      state: isEdit ? (values.state ?? null) : values.state,
      pincode: isEdit ? (values.pincode ?? null) : values.pincode,
      // NOTE: no `contacts` key — additional contacts are managed on the detail
      // page (VendorContactsCard). Omitting it leaves the set untouched, so an
      // edit here never wipes contacts.
    }

    if (isEdit && vendor) {
      const saved = await update.mutateAsync(payload)
      onSaved?.(saved)
    } else {
      const saved = await create.mutateAsync(payload)
      onSaved?.(saved)
    }
    onOpenChange(false)
  }

  const isPending = create.isPending || update.isPending

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? VENDORS_STRINGS.form.titleEdit : VENDORS_STRINGS.form.titleCreate}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={requestClose}
            disabled={isPending}
          >
            {VENDORS_STRINGS.form.actions.cancel}
          </Button>
          <Button type="submit" form="vendor-form" disabled={isPending}>
            {isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {isPending
              ? VENDORS_STRINGS.form.actions.saving
              : isEdit
                ? VENDORS_STRINGS.form.actions.saveChanges
                : VENDORS_STRINGS.form.actions.createVendor}
          </Button>
        </>
      )}
    >
      <form id="vendor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="vendor-name">
              {VENDORS_STRINGS.form.fields.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vendor-name"
              {...form.register("name")}
              placeholder={VENDORS_STRINGS.form.fields.namePlaceholder}
              autoFocus
            />
            {errors.name && (
              <Typography variant="helper" tone="danger" asChild><p>{errors.name.message}</p></Typography>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-contact-name">
                {VENDORS_STRINGS.form.fields.contactName}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor-contact-name"
                {...form.register("contact_name")}
                placeholder={VENDORS_STRINGS.form.fields.contactNamePlaceholder}
              />
              {errors.contact_name && (
                <Typography variant="helper" tone="danger" asChild><p>{errors.contact_name.message}</p></Typography>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-contact-phone">
                {VENDORS_STRINGS.form.fields.phone}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor-contact-phone"
                {...phoneInputProps(form.register("contact_phone"))}
                placeholder={VENDORS_STRINGS.form.fields.phonePlaceholder}
              />
              {errors.contact_phone && (
                <Typography variant="helper" tone="danger" asChild><p>{errors.contact_phone.message}</p></Typography>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-contact-email">
              {VENDORS_STRINGS.form.fields.email}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vendor-contact-email"
              type="email"
              {...form.register("contact_email")}
              placeholder={VENDORS_STRINGS.form.fields.emailPlaceholder}
            />
            {errors.contact_email && (
              <Typography variant="helper" tone="danger" asChild><p>{errors.contact_email.message}</p></Typography>
            )}
          </div>

          {/* Status is a lifecycle field set after creation — a new vendor is
              always created active, so the picker only appears when editing. */}
          <div className={`grid grid-cols-1 gap-4 ${isEdit ? "sm:grid-cols-[1fr_180px]" : ""}`}>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-gst">{VENDORS_STRINGS.form.fields.gstNumber}</Label>
              <Input
                id="vendor-gst"
                {...form.register("gst_number")}
                placeholder={VENDORS_STRINGS.form.fields.gstPlaceholder}
                className="font-mono"
              />
              {errors.gst_number ? (
                <Typography variant="helper" tone="danger" asChild><p>{errors.gst_number.message}</p></Typography>
              ) : (
                <Typography variant="helper" asChild><p>{VENDORS_STRINGS.form.fields.gstHelper}</p></Typography>
              )}
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="vendor-status">{VENDORS_STRINGS.form.fields.status}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => v && form.setValue("status", v as VendorStatus)}
                >
                  <SelectTrigger id="vendor-status" className="w-full">
                    <SelectValue>{VENDOR_STATUS_LABELS[status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{VENDOR_STATUS_LABELS.active}</SelectItem>
                    <SelectItem value="inactive">{VENDOR_STATUS_LABELS.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Postal address — shown on the PO detail's Vendor card. */}
          <div className="space-y-3 border-t border-border pt-4">
            <Typography variant="body-strong" asChild>
              <p>{VENDORS_STRINGS.form.fields.addressSection}</p>
            </Typography>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-line1">{VENDORS_STRINGS.form.fields.line1}</Label>
              <Input
                id="vendor-line1"
                {...form.register("line1")}
                placeholder={VENDORS_STRINGS.form.fields.line1Placeholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-line2">{VENDORS_STRINGS.form.fields.line2}</Label>
              <Input
                id="vendor-line2"
                {...form.register("line2")}
                placeholder={VENDORS_STRINGS.form.fields.line2Placeholder}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-city">{VENDORS_STRINGS.form.fields.city}</Label>
                <Input
                  id="vendor-city"
                  {...form.register("city")}
                  placeholder={VENDORS_STRINGS.form.fields.cityPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-state">{VENDORS_STRINGS.form.fields.state}</Label>
                <Input
                  id="vendor-state"
                  {...form.register("state")}
                  placeholder={VENDORS_STRINGS.form.fields.statePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-pincode">{VENDORS_STRINGS.form.fields.pincode}</Label>
                <Input
                  id="vendor-pincode"
                  {...form.register("pincode")}
                  placeholder={VENDORS_STRINGS.form.fields.pincodePlaceholder}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-notes">{VENDORS_STRINGS.form.fields.notes}</Label>
            <Textarea
              id="vendor-notes"
              {...form.register("notes")}
              placeholder={VENDORS_STRINGS.form.fields.notesPlaceholder}
              rows={3}
              className="resize-none"
            />
          </div>
      </form>
    </OperationDialog>
  )
}
