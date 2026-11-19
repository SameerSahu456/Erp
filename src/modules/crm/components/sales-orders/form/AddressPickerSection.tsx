import { useState } from "react"
import { Loader2, MapPin, Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"
import { cn } from "@/lib/utils"

import { AddressFormDialog } from "../../AddressFormDialog"
import type { AccountAddressWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

// Radio-list address picker matching the erp-demo layout: header with
// section title + "+ Add" button, card-style rows with label / source
// chip / line1+line2 / city/state/pincode, and an empty state that prompts
// the user to add one. Single-select per section because the SO has one
// `billing_address_id` and one `shipping_address_id`. Picks reuse the
// existing `useCreateAccountAddress` mutation so the new address lands on
// the account immediately and auto-selects on success.
export function AddressPickerSection({
  kind,
  required,
  accountId,
  addresses,
  selectedId,
  onSelect,
  loading,
  readOnly,
  errorMsg,
  errorId,
}: {
  kind: "Billing" | "Shipping"
  required?: boolean
  accountId: string
  addresses: AccountAddressWire[]
  selectedId: string
  onSelect: (id: string) => void
  loading: boolean
  readOnly: boolean
  errorMsg?: string
  errorId: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Address being edited (null = create). Drives the dialog's edit mode.
  const [editingAddress, setEditingAddress] = useState<AccountAddressWire | null>(null)
  const accountReady = !!accountId

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {kind}{S.addressPicker.addressSuffix} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={readOnly || !accountReady}
          onClick={() => {
            setEditingAddress(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1 size-3" /> {S.addressPicker.add}
        </Button>
      </div>

      {!accountReady ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <MapPin className="mx-auto mb-1.5 size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{S.addressPicker.pickAccountFirst}</p>
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline size-3 animate-spin" /> {S.addressPicker.loading}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <MapPin className="mx-auto mb-1.5 size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {S.addressPicker.noneAvailable(kind.toLowerCase())}
          </p>
          <p className="text-xs text-muted-foreground">
            {S.addressPicker.clickAddPrompt}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const checked = selectedId === addr.id
            return (
              <label
                key={addr.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  checked ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  readOnly && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="radio"
                  name={`so-${kind.toLowerCase()}-address`}
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => onSelect(addr.id)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">
                      {addr.label ?? addr.address_type}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{S.addressPicker.account}</Badge>
                    {addr.address_type === "Both" && (
                      <Badge variant="outline" className="text-[10px]">{S.addressPicker.both}</Badge>
                    )}
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[10px]">{S.addressPicker.default}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {addr.city}, {addr.state} — {addr.pincode}
                  </p>
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      // Inside a <label>; stop the click from toggling the radio.
                      e.preventDefault()
                      e.stopPropagation()
                      setEditingAddress(addr)
                      setDialogOpen(true)
                    }}
                    aria-label={S.addressPicker.editAddress(addr.label ?? S.addressPicker.editFallbackLabel)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </label>
            )
          })}
        </div>
      )}

      <FieldError id={errorId} message={errorMsg} />

      <AddressFormDialog
        mode="persist"
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next)
          if (!next) setEditingAddress(null)
        }}
        accountId={accountId}
        defaultType={kind}
        initialValues={editingAddress}
        onCreated={(id) => onSelect(id)}
      />
    </div>
  )
}
