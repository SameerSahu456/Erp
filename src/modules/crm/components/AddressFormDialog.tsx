import { useEffect, useState } from "react"
import { Building2, Loader2, MapPin, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { UnsavedChangesDialog } from "@/components/common/dialogs/UnsavedChangesDialog"
import { useFormErrors } from "@/hooks/use-form-errors"
import { deepEqual } from "@/lib/deep-equal"
import { validatePincode } from "@/shared/lib/validation"
import { GST_REGEX } from "./accounts/accountForm.constants"

import type { AccountAddressWire } from "../api"
import type { AccountAddress } from "../types"
import {
  useCreateAccountAddress,
  useUpdateAccountAddress,
} from "../hooks/accounts/useAccounts"
import {
  ACCOUNT_CONTACTS_STRINGS as S,
  ADDRESS_TYPE_LABELS,
} from "./account-contacts.strings"

type AddressType = "Billing" | "Shipping" | "Both"

type CommonProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The section the dialog was opened from; the Type select scopes to
  // [defaultType, "Both"] so a row added under Billing can be Billing OR Both,
  // never Shipping (and vice-versa).
  defaultType: "Billing" | "Shipping"
}

// PERSIST flow (Sales Order / demo close-won): the account already exists, so
// the address is created/updated via the API immediately and the new id is
// reported back so the parent radio list can auto-select it.
type PersistProps = CommonProps & {
  mode: "persist"
  accountId: string
  /** When set, the dialog opens in edit mode and PATCHes this address. */
  initialValues?: AccountAddressWire | null
  onCreated: (id: string) => void
}

// STAGE flow (close-won wizard): no account write here — the address object is
// handed back to the parent, which decides persistence. Optionally offers a
// pick-from-existing-account-addresses list.
type StageProps = CommonProps & {
  mode: "stage"
  /** When set, the dialog opens in edit mode pre-seeded from this row. */
  initialValues?: AccountAddress | null
  onAdd: (address: AccountAddress) => void
  /** Account addresses to pick from (enables the From-Account toggle). */
  accountAddresses?: AccountAddress[]
  /** Already-added address ids so we can grey them out in the pick list. */
  existingIds?: string[]
}

export type AddressFormDialogProps = PersistProps | StageProps

// ── One address form, two flows ──
// Single source of truth for the "add / edit address" modal. Fields, layout,
// placeholders, the mandatory-Label rule, validation and the dirty-discard
// guard are identical regardless of flow; only the submit side-effect differs
// and is branched on `mode`:
//   • mode="persist" → POST/PATCHes via the account-address API, shows a spinner.
//   • mode="stage"   → hands the address object back via onAdd; can also offer a
//                      pick-from-account list.
// Replaces the former InlineAddAddressDialog (persist) + AddAddressDialog
// (stage) so Sales Order, the demo close-won forms, and the close-won wizard no
// longer drift apart.
export function AddressFormDialog(props: AddressFormDialogProps) {
  const { open, onOpenChange, defaultType } = props
  const isEditing = !!props.initialValues

  const accountAddresses =
    props.mode === "stage" ? props.accountAddresses : undefined
  const existingIds = props.mode === "stage" ? (props.existingIds ?? []) : []
  const hasAccountAddresses = !!accountAddresses && accountAddresses.length > 0

  // Pick-from-account is only meaningful for the stage create flow.
  const [pickMode, setPickMode] = useState<"pick" | "manual">(
    !isEditing && hasAccountAddresses ? "pick" : "manual",
  )

  const [label, setLabel] = useState("")
  const [addressType, setAddressType] = useState<AddressType>(defaultType)
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  // The GSTIN registered at THIS location (multi-state customers have one
  // per state). Optional; the invoice falls back to the account's GSTIN.
  const [gstin, setGstin] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // Persist-mode mutations. Hooks must run unconditionally, but their `.mutate`
  // is only ever called in persist mode, so they're inert when staging.
  const persistAccountId = props.mode === "persist" ? props.accountId : ""
  const createMut = useCreateAccountAddress(persistAccountId)
  const updateMut = useUpdateAccountAddress(persistAccountId)
  const pending = createMut.isPending || updateMut.isPending

  // Edit-mode: trust the saved type. A "Both" row keeps "Both"; otherwise anchor
  // to the section's defaultType so the dropdown options stay coherent.
  const seededType: AddressType = (() => {
    if (!props.initialValues) return defaultType
    const saved =
      props.mode === "persist"
        ? props.initialValues.address_type
        : props.initialValues.type
    return saved === "Both" ? "Both" : defaultType
  })()

  // Resync the form from props on each open (the dialog stays mounted). The
  // effect depends on the original prop reference, never a derived object, so it
  // doesn't re-seed (and wipe errors) on every keystroke.
  const seedSource = props.initialValues ?? null
  useEffect(() => {
    if (!open) return
    if (seedSource) {
      // Both shapes carry the same fields under different casing.
      const isDefaultSeed =
        "is_default" in seedSource ? seedSource.is_default : !!seedSource.isDefault
      setLabel(seedSource.label ?? "")
      setLine1(seedSource.line1)
      setLine2(seedSource.line2 ?? "")
      setCity(seedSource.city)
      setState(seedSource.state)
      setPincode(seedSource.pincode)
      setGstin(seedSource.gstin ?? "")
      setIsDefault(isDefaultSeed)
      setAddressType(seededType)
      setPickMode("manual")
    } else {
      setLabel("")
      setLine1("")
      setLine2("")
      setCity("")
      setState("")
      setPincode("")
      setGstin("")
      setIsDefault(false)
      setAddressType(defaultType)
      setPickMode(hasAccountAddresses ? "pick" : "manual")
    }
    clearAll()
    // clearAll is stable; omit to avoid re-running on every error change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedSource])

  function reset() {
    setLabel("")
    setLine1("")
    setLine2("")
    setCity("")
    setState("")
    setPincode("")
    setGstin("")
    setIsDefault(false)
    setAddressType(defaultType)
    setPickMode(!isEditing && hasAccountAddresses ? "pick" : "manual")
    clearAll()
  }

  // Dirty check: compare current values against the seeded baseline (blank in
  // create mode; the original row in edit mode). Only the manual form can be
  // dirty.
  const baselineDefault =
    seedSource && "is_default" in seedSource
      ? seedSource.is_default
      : !!(seedSource as AccountAddress | null)?.isDefault
  const baselineValues = {
    label: seedSource?.label ?? "",
    type: seededType,
    line1: seedSource?.line1 ?? "",
    line2: seedSource?.line2 ?? "",
    city: seedSource?.city ?? "",
    state: seedSource?.state ?? "",
    pincode: seedSource?.pincode ?? "",
    gstin: seedSource?.gstin ?? "",
    isDefault: !!baselineDefault,
  }
  const currentValues = {
    label,
    type: addressType,
    line1,
    line2,
    city,
    state,
    pincode,
    gstin,
    isDefault,
  }
  const isDirty = pickMode === "manual" && !deepEqual(currentValues, baselineValues)

  // Local discard-confirm state. Closing a modal is NOT navigation, so this
  // deliberately does not use `useUnsavedChangesGuard` (which guards page
  // navigation via history sentinels).
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    const V = S.addressDialog.validation
    if (!label.trim()) e.label = V.labelRequired
    else if (label.trim().length > 100) e.label = V.labelMax
    if (!line1.trim()) e.line1 = V.line1Required
    else if (line1.trim().length > 255) e.line1 = V.line1Max
    if (line2.trim().length > 255) e.line2 = V.line2Max
    if (!city.trim()) e.city = V.cityRequired
    else if (city.trim().length > 100) e.city = V.cityMax
    if (!state.trim()) e.state = V.stateRequired
    else if (state.trim().length > 100) e.state = V.stateMax
    if (!pincode.trim()) e.pincode = V.pincodeRequired
    else {
      const pinErr = validatePincode(pincode)
      if (pinErr) e.pincode = pinErr
    }
    if (gstin && !GST_REGEX.test(gstin)) e.gstin = V.gstinFormat
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      if (props.mode === "stage") {
        toast.error(S.addressDialog.validation.fixHighlighted)
      }
      return
    }
    clearAll()

    // Stage flow — hand the address object back; the parent keeps it.
    if (props.mode === "stage") {
      props.onAdd({
        // Preserve the id on edit so the parent's upsert keeps the row in
        // place; generate a fresh id for brand-new entries.
        id:
          props.initialValues?.id ??
          `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: addressType,
        label: label.trim(),
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstin: gstin || undefined,
        isDefault,
      })
      reset()
      props.onOpenChange(false)
      return
    }

    // Persist flow — create or update via the API.
    const body = {
      address_type: addressType,
      label: label.trim() || null,
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      gstin: gstin || null,
      is_default: isDefault,
    }
    const onSuccess = (saved: { id: string }) => {
      props.onCreated(saved.id)
      props.onOpenChange(false)
      reset()
    }
    if (isEditing && props.initialValues) {
      updateMut.mutate(
        { addressId: props.initialValues.id, body },
        { onSuccess },
      )
      return
    }
    createMut.mutate(body, { onSuccess })
  }

  function handlePick(addr: AccountAddress) {
    if (props.mode !== "stage") return
    props.onAdd({ ...addr })
    reset()
    props.onOpenChange(false)
  }

  const closeAndReset = () => {
    reset()
    onOpenChange(false)
  }

  // Cancel / overlay-click / Escape: confirm first only when the form is dirty
  // (and not mid-save), otherwise close straight away.
  const attemptClose = () => {
    if (pending) return
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    closeAndReset()
  }

  const showPickList =
    props.mode === "stage" && pickMode === "pick" && hasAccountAddresses

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          attemptClose()
          return
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            {isEditing
              ? S.addressDialog.editTitle
              : S.addressDialog.addTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle — stage flow only, when account addresses exist and not
            editing. */}
        {props.mode === "stage" && hasAccountAddresses && !isEditing && (
          <div className="flex w-fit rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setPickMode("pick")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pickMode === "pick"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Building2 className="size-3.5" />
              {S.addressDialog.fromAccount}
            </button>
            <button
              type="button"
              onClick={() => setPickMode("manual")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pickMode === "manual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Plus className="size-3.5" />
              {S.addressDialog.newAddress}
            </button>
          </div>
        )}

        {/* Pick from account */}
        {showPickList && accountAddresses && (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {accountAddresses.map((addr) => {
              const alreadyAdded = existingIds.includes(addr.id)
              return (
                <button
                  key={addr.id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handlePick(addr)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    alreadyAdded
                      ? "cursor-not-allowed bg-muted/30 opacity-50"
                      : "hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Typography variant="body-strong" asChild>
                      <span>{addr.label}</span>
                    </Typography>
                    <Badge variant="outline" className="text-[10px]">
                      {addr.type}
                    </Badge>
                    {addr.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        {S.addressDialog.default}
                      </Badge>
                    )}
                    {alreadyAdded && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px]"
                      >
                        {S.addressDialog.alreadyAdded}
                      </Badge>
                    )}
                  </div>
                  <Typography variant="helper" asChild>
                    <p>{addr.line1}</p>
                  </Typography>
                  {addr.line2 && (
                    <Typography variant="helper" asChild>
                      <p>{addr.line2}</p>
                    </Typography>
                  )}
                  <Typography variant="helper" asChild>
                    <p>
                      {addr.city}, {addr.state} &mdash; {addr.pincode}
                    </p>
                  </Typography>
                </button>
              )
            })}
          </div>
        )}

        {/* Manual entry form */}
        {!showPickList && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="addr-label">
                  {S.addressDialog.label}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addr-label"
                  placeholder={S.addressDialog.labelPlaceholder}
                  maxLength={100}
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value)
                    clearError("label")
                  }}
                  aria-invalid={Boolean(errors.label)}
                />
                <FieldError id="addr-label-error" message={errors.label} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-type">
                  {S.addressDialog.type}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={addressType}
                  onValueChange={(v) => v && setAddressType(v as AddressType)}
                >
                  <SelectTrigger id="addr-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={defaultType}>
                      {ADDRESS_TYPE_LABELS[defaultType]}
                    </SelectItem>
                    <SelectItem value="Both">
                      {S.addressDialog.both}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addr-line1">
                {S.addressDialog.line1}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addr-line1"
                placeholder={S.addressDialog.line1Placeholder}
                maxLength={255}
                value={line1}
                onChange={(e) => {
                  setLine1(e.target.value)
                  clearError("line1")
                }}
                aria-invalid={Boolean(errors.line1)}
              />
              <FieldError id="addr-line1-error" message={errors.line1} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addr-line2">
                {S.addressDialog.line2}
              </Label>
              <Input
                id="addr-line2"
                placeholder={S.addressDialog.line2Placeholder}
                maxLength={255}
                value={line2}
                onChange={(e) => {
                  setLine2(e.target.value)
                  clearError("line2")
                }}
                aria-invalid={Boolean(errors.line2)}
              />
              <FieldError id="addr-line2-error" message={errors.line2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="addr-city">
                  {S.addressDialog.city}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addr-city"
                  placeholder={S.addressDialog.cityPlaceholder}
                  maxLength={100}
                  value={city}
                  onChange={(e) => {
                    // Letters, spaces and hyphens only — no digits/symbols.
                    setCity(e.target.value.replace(/[^A-Za-z\s-]/g, ""))
                    clearError("city")
                  }}
                  aria-invalid={Boolean(errors.city)}
                />
                <FieldError id="addr-city-error" message={errors.city} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-state">
                  {S.addressDialog.state}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addr-state"
                  placeholder={S.addressDialog.statePlaceholder}
                  maxLength={100}
                  value={state}
                  onChange={(e) => {
                    // Letters, spaces and hyphens only — no digits/symbols.
                    setState(e.target.value.replace(/[^A-Za-z\s-]/g, ""))
                    clearError("state")
                  }}
                  aria-invalid={Boolean(errors.state)}
                />
                <FieldError id="addr-state-error" message={errors.state} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-pin">
                  {S.addressDialog.pincode}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addr-pin"
                  placeholder={S.addressDialog.pincodePlaceholder}
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    // Digits only.
                    setPincode(e.target.value.replace(/\D/g, ""))
                    clearError("pincode")
                  }}
                  aria-invalid={Boolean(errors.pincode)}
                />
                <FieldError id="addr-pin-error" message={errors.pincode} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addr-gstin">
                {S.addressDialog.gstin}
              </Label>
              <Input
                id="addr-gstin"
                placeholder={S.addressDialog.gstinPlaceholder}
                maxLength={15}
                value={gstin}
                onChange={(e) => {
                  // GSTINs are upper-case alphanumerics.
                  setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))
                  clearError("gstin")
                }}
                aria-invalid={Boolean(errors.gstin)}
              />
              <Typography variant="helper">{S.addressDialog.gstinHint}</Typography>
              <FieldError id="addr-gstin-error" message={errors.gstin} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="addr-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
              />
              <Label htmlFor="addr-default" className="cursor-pointer">
                {S.addressDialog.setAsDefault}
              </Label>
            </div>
          </div>
        )}

        {!showPickList && (
          <DialogFooter>
            <Button variant="outline" onClick={attemptClose} disabled={pending}>
              {S.addressDialog.cancel}
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : isEditing ? (
                <Pencil className="mr-1.5 size-3.5" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              {isEditing
                ? S.addressDialog.saveChanges
                : S.addressDialog.addAddress}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          closeAndReset()
        }}
      />
    </Dialog>
  )
}
