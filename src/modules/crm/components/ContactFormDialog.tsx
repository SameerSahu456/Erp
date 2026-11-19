import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/common/forms/FieldError"
import { useFormErrors } from "@/hooks/use-form-errors"
import {
  validateEmail,
  validateName,
  validatePhoneIndia,
} from "@/shared/lib/validation"
import { ApiError } from "@/shared/api/envelope"

import { sanitizePhoneDigits } from "../lib/validation"
import type {
  ContactListItem,
  ContactResponse,
  ContactStatus,
} from "../api"
import { useCreateContact, useUpdateContact } from "../hooks/contacts/useContacts"
import {
  ACCOUNT_CONTACTS_STRINGS as S,
  CONTACT_STATUS_LABELS,
} from "./account-contacts.strings"

// The full field set this dialog edits — identical in both modes.
export interface ContactFormValues {
  name: string
  email: string
  phone: string
  designation: string
  department: string
  status: ContactStatus
}

// Subset of a contact the persist flow can pre-seed from. Both ContactListItem
// and ContactResponse satisfy it, so callers pass whichever shape their list /
// dropdown already holds without an extra fetch.
export type EditableContact = Pick<
  ContactListItem,
  "id" | "name" | "email" | "phone" | "designation" | "department" | "status"
>

type CommonProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Account-CREATE flow: the account doesn't exist yet, so the contact is staged
// locally and rides along in the POST /accounts payload — no API call here.
type StageProps = CommonProps & {
  mode: "stage"
  // null → add a fresh row; a value → edit that already-staged row.
  initial?: ContactFormValues | null
  onSubmit: (values: ContactFormValues) => void
}

// Account-EDIT (and deals / demo-requests) flow: the account exists, so the
// contact is created/updated via the API immediately.
type PersistProps = CommonProps & {
  mode: "persist"
  accountId: string
  // null → create a new contact (pre-linked to accountId); a value → PATCH it.
  contact?: EditableContact | null
  onCreated: (contact: ContactResponse) => void
}

export type ContactFormDialogProps = StageProps | PersistProps

// ── One contact form, two flows ──
// Single source of truth for the "add / edit contact" mini-form UI. The fields,
// layout, validation and copy are identical regardless of flow; only the submit
// side-effect differs and is branched on `mode`:
//   • mode="stage"   → returns the values to the parent to stage locally.
//   • mode="persist" → POST/PATCHes via the contacts API, shows a spinner, and
//                      surfaces the CONTACT_EMAIL_EXISTS (409) inline.
// Replaces the former NewContactDialog (create) + InlineAddContactDialog (edit)
// so the account create and edit pages no longer drift apart.
export function ContactFormDialog(props: ContactFormDialogProps) {
  const { open, onOpenChange } = props

  // Original prop reference (stable across renders) drives the seeding effect —
  // depending on a freshly-built object would re-seed (and clear errors) on
  // every keystroke.
  const seedSource =
    props.mode === "persist"
      ? (props.contact ?? null)
      : (props.initial ?? null)
  const isEditing = seedSource !== null

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [designation, setDesignation] = useState("")
  const [department, setDepartment] = useState("")
  const [status, setStatus] = useState<ContactStatus>("Active")
  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // Persist-mode mutations. Hooks must run unconditionally, but their `.mutate`
  // is only ever called in persist mode, so they're inert when staging.
  const createMut = useCreateContact()
  const editingId =
    props.mode === "persist" ? (props.contact?.id ?? "") : ""
  const updateMut = useUpdateContact(editingId)
  const isPending = createMut.isPending || updateMut.isPending

  // The dialog stays mounted between opens, so (re)seed the fields each time it
  // opens: from the seed contact/row when editing, blank when adding.
  useEffect(() => {
    if (!open) return
    setName(seedSource?.name ?? "")
    setEmail(seedSource?.email ?? "")
    setPhone(seedSource?.phone ?? "")
    setDesignation(seedSource?.designation ?? "")
    setDepartment(seedSource?.department ?? "")
    setStatus(seedSource?.status ?? "Active")
    clearAll()
    // clearAll is stable; omitting it avoids re-seeding on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedSource])

  function reset() {
    setName("")
    setEmail("")
    setPhone("")
    setDesignation("")
    setDepartment("")
    setStatus("Active")
    clearAll()
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!name.trim()) {
      e.name = S.contactDialog.validation.nameRequired
    } else {
      const nameErr = validateName(name, { maxLength: 100, label: "Name" })
      if (nameErr) e.name = nameErr
    }
    // Backend requires at least one of email / phone (model_validator + DB
    // CHECK), so mirror that here before hitting the API.
    if (!email.trim() && !phone.trim()) {
      e.contact = S.contactDialog.validation.reachRequired
    }
    const emailErr = validateEmail(email)
    if (emailErr) e.email = emailErr
    const phoneErr = validatePhoneIndia(phone)
    if (phoneErr) e.phone = phoneErr
    if (designation.trim().length > 100) {
      e.designation = S.contactDialog.validation.designationMax
    }
    if (department.trim().length > 100) {
      e.department = S.contactDialog.validation.departmentMax
    }
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    clearAll()

    // Staging flow — hand the values back; the parent keeps them in the payload.
    if (props.mode === "stage") {
      props.onSubmit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        department: department.trim(),
        status,
      })
      reset()
      props.onOpenChange(false)
      return
    }

    // Persist flow — create or update via the API.
    const onError = (error: Error) => {
      // Existing-email (CONTACT_EMAIL_EXISTS) is no longer surfaced as an
      // "email already exists" message. The backend still enforces uniqueness,
      // so on that conflict we show a generic failure toast (no email wording)
      // instead of the backend's email-specific message.
      if (
        error instanceof ApiError &&
        error.businessCode === "CONTACT_EMAIL_EXISTS"
      ) {
        toast.error(
          isEditing
            ? S.contactDialog.toast.updateFailed
            : S.contactDialog.toast.createFailed,
        )
        return
      }
      toast.error(
        error.message ||
          (isEditing
            ? S.contactDialog.toast.updateFailed
            : S.contactDialog.toast.createFailed),
      )
    }
    const onSuccess = (saved: ContactResponse) => {
      props.onCreated(saved)
      props.onOpenChange(false)
      reset()
    }

    const fields = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      designation: designation.trim() || null,
      department: department.trim() || null,
      status,
    }

    if (isEditing) {
      // PATCH only the edited fields; updateContact() strips account links
      // defensively (backend rejects them on PATCH).
      updateMut.mutate(fields, { onSuccess, onError })
      return
    }
    createMut.mutate(
      {
        ...fields,
        account_ids: [props.accountId],
        primary_account_id: props.accountId,
      },
      { onSuccess, onError },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? S.contactDialog.editTitle
              : S.contactDialog.addTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">
              {S.contactDialog.name}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-name"
              value={name}
              placeholder={S.contactDialog.namePlaceholder}
              onChange={(e) => {
                setName(e.target.value)
                clearError("name")
              }}
              aria-invalid={Boolean(errors.name)}
              autoFocus
            />
            <FieldError id="contact-name-error" message={errors.name} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">{S.contactDialog.email}</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                placeholder={S.contactDialog.emailPlaceholder}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearError("email")
                  clearError("contact")
                }}
                aria-invalid={Boolean(errors.email || errors.contact)}
              />
              <FieldError id="contact-email-error" message={errors.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">{S.contactDialog.phone}</Label>
              <Input
                id="contact-phone"
                value={phone}
                inputMode="numeric"
                maxLength={10}
                placeholder={S.contactDialog.phonePlaceholder}
                onChange={(e) => {
                  setPhone(sanitizePhoneDigits(e.target.value))
                  clearError("phone")
                  clearError("contact")
                }}
                aria-invalid={Boolean(errors.phone || errors.contact)}
              />
              <FieldError id="contact-phone-error" message={errors.phone} />
            </div>
          </div>
          <FieldError id="contact-reach-error" message={errors.contact} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-designation">
                {S.contactDialog.designation}
              </Label>
              <Input
                id="contact-designation"
                value={designation}
                onChange={(e) => {
                  setDesignation(e.target.value)
                  clearError("designation")
                }}
                placeholder={S.contactDialog.designationPlaceholder}
                aria-invalid={Boolean(errors.designation)}
              />
              <FieldError
                id="contact-designation-error"
                message={errors.designation}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-department">
                {S.contactDialog.department}
              </Label>
              <Input
                id="contact-department"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value)
                  clearError("department")
                }}
                placeholder={S.contactDialog.departmentPlaceholder}
                aria-invalid={Boolean(errors.department)}
              />
              <FieldError
                id="contact-department-error"
                message={errors.department}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-status">{S.contactDialog.status}</Label>
            <Select
              value={status}
              onValueChange={(v) => v && setStatus(v as ContactStatus)}
            >
              <SelectTrigger id="contact-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">
                  {CONTACT_STATUS_LABELS.Active}
                </SelectItem>
                <SelectItem value="Inactive">
                  {CONTACT_STATUS_LABELS.Inactive}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {S.contactDialog.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing
              ? S.contactDialog.saveChanges
              : S.contactDialog.addContact}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
