import { useState } from "react"
import { Plus, Trash2, Star, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import type {
  AccountAddressWire,
  AddressType,
  AddressUpsertPayload,
} from "../../api"
import {
  useAccountAddresses,
  useCreateAccountAddress,
  useDeleteAccountAddress,
  useSetAccountAddressDefault,
  useUpdateAccountAddress,
} from "../../hooks/accounts/useAccounts"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

// ── Draft model used by Create mode ───────────────────────────────────
// In create mode there's no account_id yet, so addresses live in the
// component's local state and ride along inside the POST /accounts body
// (`addresses[]`, max 20). Each draft has a synthetic local id used only
// for React keys / list operations — never sent to the server.

export interface DraftAddress {
  localId: string
  // Wire value sent to the API: "Billing" | "Shipping" | "Both".
  type: AddressType
  // Column this row lives under (never "Both") — kept stable so a row toggled
  // to "Both" stays in its original column instead of vanishing from both.
  baseType: "Billing" | "Shipping"
  label: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

let _localCounter = 0
const nextLocalId = () => {
  _localCounter += 1
  return `draft-${Date.now()}-${_localCounter}`
}

export function blankDraft(type: "Billing" | "Shipping"): DraftAddress {
  return {
    localId: nextLocalId(),
    type,
    baseType: type,
    label: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  }
}

export function draftsToWirePayload(
  drafts: DraftAddress[],
): AddressUpsertPayload[] {
  return drafts
    .filter((d) => d.line1.trim() && d.city.trim() && d.state.trim() && d.pincode.trim())
    .map((d) => ({
      address_type: d.type,
      line1: d.line1.trim(),
      city: d.city.trim(),
      state: d.state.trim(),
      pincode: d.pincode.trim(),
      label: d.label.trim() || null,
      line2: d.line2.trim() || null,
      is_default: d.isDefault,
    }))
}

// ── Component ────────────────────────────────────────────────────────

interface AccountAddressesEditorProps {
  /** When omitted, component runs in "draft" mode and surfaces edits via
   *  `onDraftsChange`. When provided, all CRUD goes against the live
   *  /accounts/{id}/addresses routes. */
  accountId?: string
  drafts?: DraftAddress[]
  onDraftsChange?: (next: DraftAddress[]) => void
}

export function AccountAddressesEditor(props: AccountAddressesEditorProps) {
  if (props.accountId) {
    return <LiveAddressesEditor accountId={props.accountId} />
  }
  return (
    <DraftAddressesEditor
      drafts={props.drafts ?? []}
      onDraftsChange={props.onDraftsChange ?? (() => {})}
    />
  )
}

// ── Draft mode (Create) ──────────────────────────────────────────────

function DraftAddressesEditor({
  drafts,
  onDraftsChange,
}: {
  drafts: DraftAddress[]
  onDraftsChange: (next: DraftAddress[]) => void
}) {
  function add(type: "Billing" | "Shipping") {
    onDraftsChange([...drafts, blankDraft(type)])
  }

  function remove(localId: string) {
    onDraftsChange(drafts.filter((d) => d.localId !== localId))
  }

  function patch(localId: string, patch: Partial<DraftAddress>) {
    onDraftsChange(
      drafts.map((d) => (d.localId === localId ? { ...d, ...patch } : d)),
    )
  }

  function toggleDefault(localId: string, baseType: "Billing" | "Shipping") {
    const target = drafts.find((d) => d.localId === localId)
    if (!target) return
    const willBeDefault = !target.isDefault
    onDraftsChange(
      drafts.map((d) => {
        // Peers are grouped by the column (baseType), not the wire type.
        if (d.baseType !== baseType) return d
        if (d.localId === localId) return { ...d, isDefault: willBeDefault }
        // Only clear peers when promoting a new default; on un-set leave others alone.
        return willBeDefault ? { ...d, isDefault: false } : d
      }),
    )
  }

  return (
    <AddressesLayout
      billing={drafts.filter((d) => d.baseType === "Billing")}
      shipping={drafts.filter((d) => d.baseType === "Shipping")}
      onAdd={add}
      keyOf={(d) => d.localId}
      renderRow={(d) => (
        <DraftRow
          draft={d}
          onChange={(patchObj) => patch(d.localId, patchObj)}
          onMakeDefault={() => toggleDefault(d.localId, d.baseType)}
          onRemove={() => remove(d.localId)}
        />
      )}
    />
  )
}

function DraftRow({
  draft,
  onChange,
  onMakeDefault,
  onRemove,
}: {
  draft: DraftAddress
  onChange: (patch: Partial<DraftAddress>) => void
  onMakeDefault: () => void
  onRemove: () => void
}) {
  return (
    <AddressRowShell
      labelInput={
        <Input
          placeholder={
            draft.type === "Billing"
              ? S.addresses.labelPlaceholderBilling
              : S.addresses.labelPlaceholderShipping
          }
          value={draft.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-56"
        />
      }
      isDefault={draft.isDefault}
      onMakeDefault={onMakeDefault}
      onRemove={onRemove}
    >
      <FieldGrid>
        <Field label={S.addresses.line1} required>
          <Input
            placeholder={S.addresses.line1Placeholder}
            value={draft.line1}
            onChange={(e) => onChange({ line1: e.target.value })}
          />
        </Field>
        <Field label={S.addresses.line2}>
          <Input
            placeholder={S.addresses.line2Placeholder}
            value={draft.line2}
            onChange={(e) => onChange({ line2: e.target.value })}
          />
        </Field>
        <Field label={S.addresses.city} required>
          <Input
            placeholder={S.addresses.cityPlaceholder}
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </Field>
        <Field label={S.addresses.state} required>
          <Input
            placeholder={S.addresses.statePlaceholder}
            value={draft.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </Field>
        <Field label={S.addresses.pincode} required>
          <Input
            placeholder={S.addresses.pincodePlaceholder}
            value={draft.pincode}
            onChange={(e) => onChange({ pincode: e.target.value })}
          />
        </Field>
      </FieldGrid>
      <div className="mt-3 flex items-center gap-2">
        <Select
          value={draft.type}
          onValueChange={(v) => v && onChange({ type: v as AddressType })}
        >
          <SelectTrigger id={`addr-type-${draft.localId}`} className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* Section the row was added under (Billing OR Shipping) +
                Both — never both sections at once. */}
            <SelectItem value={draft.baseType}>{draft.baseType}</SelectItem>
            <SelectItem value="Both">{S.addresses.both}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </AddressRowShell>
  )
}

// ── Live mode (Edit) ─────────────────────────────────────────────────

// Discriminated row model for the live editor: a persisted address that PATCHes
// on save, or an unsaved draft that stays local until the user fills it and
// clicks "Add address" (which validates, then POSTs). Adding no longer creates
// a placeholder "-" record on the server.
type LiveItem =
  | { kind: "saved"; address: AccountAddressWire }
  | { kind: "draft"; draft: DraftAddress }

function LiveAddressesEditor({ accountId }: { accountId: string }) {
  const { data: addresses, isLoading, isError } = useAccountAddresses(accountId)
  const create = useCreateAccountAddress(accountId)
  const update = useUpdateAccountAddress(accountId)
  const setDefault = useSetAccountAddressDefault(accountId)
  const remove = useDeleteAccountAddress(accountId)

  // New rows the user is still filling in. They exist only in local state
  // until saved — nothing is written to the server on "Add".
  const [drafts, setDrafts] = useState<DraftAddress[]>([])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {S.addresses.loading}
      </div>
    )
  }
  if (isError) {
    return (
      <Typography
        variant="body"
        tone="danger"
        className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
      >
        {S.addresses.loadError}
      </Typography>
    )
  }

  const list = addresses ?? []
  // A "Both"-typed address serves billing and shipping at once, so it appears
  // under each column (matching the detail view + SalesOrderFormPage). Strict
  // equality previously dropped it from both lists, hiding it from the editor.
  // Draft rows append after the saved ones in their own column.
  const billing: LiveItem[] = [
    ...list
      .filter((a) => a.address_type === "Billing" || a.address_type === "Both")
      .map((a): LiveItem => ({ kind: "saved", address: a })),
    ...drafts
      .filter((d) => d.baseType === "Billing")
      .map((d): LiveItem => ({ kind: "draft", draft: d })),
  ]
  const shipping: LiveItem[] = [
    ...list
      .filter((a) => a.address_type === "Shipping" || a.address_type === "Both")
      .map((a): LiveItem => ({ kind: "saved", address: a })),
    ...drafts
      .filter((d) => d.baseType === "Shipping")
      .map((d): LiveItem => ({ kind: "draft", draft: d })),
  ]

  function addDraft(type: "Billing" | "Shipping") {
    setDrafts((prev) => [...prev, blankDraft(type)])
  }
  function patchDraft(localId: string, patch: Partial<DraftAddress>) {
    setDrafts((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d)),
    )
  }
  function removeDraft(localId: string) {
    setDrafts((prev) => prev.filter((d) => d.localId !== localId))
  }
  // Validation lives in the row; by the time this runs the required fields are
  // present. On success drop the draft — the refetched list renders it as a
  // saved row.
  function saveDraft(d: DraftAddress) {
    create.mutate(
      {
        address_type: d.type,
        label: d.label.trim() || null,
        line1: d.line1.trim(),
        line2: d.line2.trim() || null,
        city: d.city.trim(),
        state: d.state.trim(),
        pincode: d.pincode.trim(),
        is_default: d.isDefault,
      },
      { onSuccess: () => removeDraft(d.localId) },
    )
  }

  return (
    <AddressesLayout
      billing={billing}
      shipping={shipping}
      onAdd={addDraft}
      // Saved rows key on id + is_default + updated_at so a row remounts
      // whenever the persisted record changes (resyncs local edit state with
      // the server — critical for "Both" addresses rendered in both columns).
      // Draft rows key on their stable local id.
      keyOf={(item) =>
        item.kind === "saved"
          ? `${item.address.id}-${item.address.is_default}-${item.address.updated_at}`
          : `draft-${item.draft.localId}`
      }
      renderRow={(item, column) =>
        item.kind === "draft" ? (
          <NewLiveAddressRow
            draft={item.draft}
            saving={create.isPending}
            onChange={(patch) => patchDraft(item.draft.localId, patch)}
            onSave={() => saveDraft(item.draft)}
            onRemove={() => removeDraft(item.draft.localId)}
          />
        ) : (
          <LiveRow
            address={item.address}
            columnType={column}
            onSave={(patch, nextDefault) => {
              if (nextDefault === true) {
                // Promote: persist the field edits, then call the dedicated
                // /default endpoint (it promotes + clears same-type peers).
                update.mutate(
                  { addressId: item.address.id, body: patch },
                  { onSuccess: () => setDefault.mutate(item.address.id) },
                )
              } else if (nextDefault === false) {
                // Demote: /default only promotes, so clear the flag via PATCH.
                update.mutate({
                  addressId: item.address.id,
                  body: { ...patch, is_default: false },
                })
              } else {
                update.mutate({ addressId: item.address.id, body: patch })
              }
            }}
            onRemove={() => remove.mutate(item.address.id)}
          />
        )
      }
    />
  )
}

function LiveRow({
  address,
  columnType,
  onSave,
  onRemove,
}: {
  address: AccountAddressWire
  // Section this copy is rendered under. A "Both" address appears in both
  // columns; unchecking "Both" reverts it to this column's single type.
  columnType: "Billing" | "Shipping"
  onSave: (patch: Partial<AddressUpsertPayload>, nextDefault?: boolean) => void
  onRemove: () => void
}) {
  const [label, setLabel] = useState(address.label ?? "")
  const [line1, setLine1] = useState(address.line1)
  const [line2, setLine2] = useState(address.line2 ?? "")
  const [city, setCity] = useState(address.city)
  const [state, setState] = useState(address.state)
  const [pincode, setPincode] = useState(address.pincode)
  // The default flag is staged locally — toggling the star marks the row
  // dirty; it is persisted only when the user clicks "Save changes".
  const [isDefault, setIsDefault] = useState(address.is_default)
  // "Both" makes this address serve billing AND shipping; staged locally and
  // persisted on save. When set, the address shows under both columns.
  const [isBoth, setIsBoth] = useState(address.address_type === "Both")

  // Wire type this row will save as: "Both" when the box is ticked, otherwise
  // the column it lives under (so a Both→single toggle lands in the right one).
  const nextType: AddressType = isBoth ? "Both" : columnType

  const defaultChanged = isDefault !== address.is_default
  const dirty =
    defaultChanged ||
    nextType !== address.address_type ||
    label !== (address.label ?? "") ||
    line1 !== address.line1 ||
    line2 !== (address.line2 ?? "") ||
    city !== address.city ||
    state !== address.state ||
    pincode !== address.pincode

  function handleSave() {
    if (!line1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      toast.error(S.toast.addressCoreRequired)
      return
    }
    // Backend's AddressUpdate schema requires the 5 core fields on every
    // PATCH (it's NOT a true partial update — see schemas/address.py).
    onSave(
      {
        address_type: nextType,
        label: label.trim() || null,
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
      defaultChanged ? isDefault : undefined,
    )
  }

  return (
    <AddressRowShell
      labelInput={
        <Input
          placeholder={
            address.address_type === "Billing"
              ? S.addresses.labelPlaceholderBilling
              : S.addresses.labelPlaceholderShipping
          }
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-56"
        />
      }
      isDefault={isDefault}
      onMakeDefault={() => setIsDefault((v) => !v)}
      onRemove={onRemove}
    >
      <FieldGrid>
        <Field label={S.addresses.line1} required>
          <Input value={line1} onChange={(e) => setLine1(e.target.value)} />
        </Field>
        <Field label={S.addresses.line2}>
          <Input value={line2} onChange={(e) => setLine2(e.target.value)} />
        </Field>
        <Field label={S.addresses.city} required>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label={S.addresses.state} required>
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </Field>
        <Field label={S.addresses.pincode} required>
          <Input value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </Field>
      </FieldGrid>
      <div className="mt-3 flex items-center justify-between gap-3">
        {/* Spacer keeps "Save changes" pinned right while the checkbox below is hidden. */}
        <span />
        {/* Temporarily hidden: "Use for both billing & shipping" toggle.
        <Label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={isBoth}
            onCheckedChange={(v) => setIsBoth(v === true)}
          />
          {S.addresses.useForBoth}
        </Label>
        */}
        <Button
          type="button"
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty}
          onClick={handleSave}
        >
          {S.addresses.saveChanges}
        </Button>
      </div>
    </AddressRowShell>
  )
}

// A brand-new address row in live (edit) mode. Controlled by the parent's
// draft state; nothing is written to the server until the user fills the
// required fields and clicks "Add address". Mirrors DraftRow's inputs but
// carries its own validation + create button (vs. the create-form path, where
// the whole drafts array rides along in POST /accounts).
function NewLiveAddressRow({
  draft,
  saving,
  onChange,
  onSave,
  onRemove,
}: {
  draft: DraftAddress
  saving: boolean
  onChange: (patch: Partial<DraftAddress>) => void
  onSave: () => void
  onRemove: () => void
}) {
  // Required-field errors only surface after a save attempt, so a freshly
  // added row doesn't shout before the user has typed anything.
  const [triedSave, setTriedSave] = useState(false)
  const missing = {
    line1: !draft.line1.trim(),
    city: !draft.city.trim(),
    state: !draft.state.trim(),
    pincode: !draft.pincode.trim(),
  }
  const hasMissing = missing.line1 || missing.city || missing.state || missing.pincode

  function handleSave() {
    if (hasMissing) {
      setTriedSave(true)
      toast.error("Line 1, city, state, and pincode are required")
      return
    }
    onSave()
  }

  return (
    <AddressRowShell
      labelInput={
        <Input
          placeholder={
            draft.baseType === "Billing"
              ? "Label (e.g. HQ Billing)"
              : "Label (e.g. Warehouse)"
          }
          value={draft.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-56"
        />
      }
      isDefault={draft.isDefault}
      onMakeDefault={() => onChange({ isDefault: !draft.isDefault })}
      onRemove={onRemove}
    >
      <FieldGrid>
        <Field label="Address Line 1" required>
          <Input
            placeholder="Street address"
            value={draft.line1}
            onChange={(e) => onChange({ line1: e.target.value })}
            aria-invalid={triedSave && missing.line1}
          />
        </Field>
        <Field label="Address Line 2">
          <Input
            placeholder="Apt, suite, area (optional)"
            value={draft.line2}
            onChange={(e) => onChange({ line2: e.target.value })}
          />
        </Field>
        <Field label="City" required>
          <Input
            placeholder="City"
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value })}
            aria-invalid={triedSave && missing.city}
          />
        </Field>
        <Field label="State" required>
          <Input
            placeholder="State"
            value={draft.state}
            onChange={(e) => onChange({ state: e.target.value })}
            aria-invalid={triedSave && missing.state}
          />
        </Field>
        <Field label="Pincode" required>
          <Input
            placeholder="Pincode"
            value={draft.pincode}
            onChange={(e) => onChange({ pincode: e.target.value })}
            aria-invalid={triedSave && missing.pincode}
          />
        </Field>
      </FieldGrid>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Select
          value={draft.type}
          onValueChange={(v) => v && onChange({ type: v as AddressType })}
        >
          <SelectTrigger id={`new-addr-type-${draft.localId}`} className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={draft.baseType}>{draft.baseType}</SelectItem>
            <SelectItem value="Both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" /> Adding…
            </>
          ) : (
            "Add address"
          )}
        </Button>
      </div>
    </AddressRowShell>
  )
}

// ── Shared shell ─────────────────────────────────────────────────────

interface AddressesLayoutProps<T> {
  billing: T[]
  shipping: T[]
  onAdd: (type: "Billing" | "Shipping") => void
  keyOf: (item: T) => string
  // `column` tells the row which section it's being rendered under — a
  // "Both" address shows in both, so the column (not the wire type) is what
  // a row reverts to when its "Both" flag is unchecked.
  renderRow: (item: T, column: "Billing" | "Shipping") => React.ReactNode
}

function AddressesLayout<T>({
  billing,
  shipping,
  onAdd,
  keyOf,
  renderRow,
}: AddressesLayoutProps<T>) {
  return (
    <div className="space-y-6">
      <Section
        title={S.addresses.billingTitle}
        addLabel={S.addresses.addBilling}
        column="Billing"
        items={billing}
        onAdd={() => onAdd("Billing")}
        keyOf={keyOf}
        renderRow={renderRow}
        emptyText={S.addresses.emptyBilling}
      />
      <Separator />
      <Section
        title={S.addresses.shippingTitle}
        addLabel={S.addresses.addShipping}
        column="Shipping"
        items={shipping}
        onAdd={() => onAdd("Shipping")}
        keyOf={keyOf}
        renderRow={renderRow}
        emptyText={S.addresses.emptyShipping}
      />
    </div>
  )
}

interface SectionProps<T> {
  title: string
  addLabel: string
  column: "Billing" | "Shipping"
  items: T[]
  onAdd: () => void
  keyOf: (item: T) => string
  renderRow: (item: T, column: "Billing" | "Shipping") => React.ReactNode
  emptyText: string
}

function Section<T>({
  title,
  addLabel,
  column,
  items,
  onAdd,
  keyOf,
  renderRow,
  emptyText,
}: SectionProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="body-strong" asChild>
          <h3>{title}</h3>
        </Typography>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> {addLabel}
        </Button>
      </div>
      {items.length === 0 ? (
        <Typography variant="body" tone="muted">{emptyText}</Typography>
      ) : (
        items.map((item) => <div key={keyOf(item)}>{renderRow(item, column)}</div>)
      )}
    </div>
  )
}

function AddressRowShell({
  labelInput,
  isDefault,
  onMakeDefault,
  onRemove,
  children,
}: {
  labelInput: React.ReactNode
  isDefault: boolean
  onMakeDefault: () => void
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {labelInput}
          <button
            type="button"
            onClick={onMakeDefault}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]",
              isDefault
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-border bg-card text-muted-foreground hover:bg-secondary",
            )}
            aria-pressed={isDefault}
          >
            <Star
              className={cn("size-3", isDefault && "fill-amber-500 text-amber-500")}
            />
            {isDefault ? S.addresses.default : S.addresses.makeDefault}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-ui text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
