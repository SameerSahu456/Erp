import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select"

import { useAddMIResponse, useVendorOptions } from "@modules/procurement"

import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function AddMIResponseDialog({
  miId,
  itemId,
  onSaved,
}: {
  miId: string
  itemId: string
  onSaved: () => void
}) {
  const addMut = useAddMIResponse(miId)
  const [vendor, setVendor] = useState<AsyncSelectOption | null>(null)
  const [costPrice, setCostPrice] = useState("")
  const [qtyAvailable, setQtyAvailable] = useState("")
  const [availableDate, setAvailableDate] = useState("")
  const [pmNotes, setPmNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Availability can't be in the past — floor the picker at today (local date).
  const now = new Date()
  const todayInput = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  function reset() {
    setVendor(null)
    setCostPrice("")
    setQtyAvailable("")
    setAvailableDate("")
    setPmNotes("")
    setError(null)
  }

  async function handleSave() {
    setError(null)
    if (!vendor) return setError(S.addResponse.errors.vendorRequired)
    const cp = Number(costPrice)
    if (!Number.isFinite(cp) || cp < 0)
      return setError(S.addResponse.errors.costMin)
    const qty = parseInt(qtyAvailable, 10)
    if (!Number.isFinite(qty) || qty < 0)
      return setError(S.addResponse.errors.qtyMin)

    try {
      await addMut.mutateAsync({
        itemId,
        body: {
          vendor_id: vendor.id,
          cost_price: cp,
          qty_available: qty,
          available_date: availableDate || undefined,
          pm_notes: pmNotes.trim() || undefined,
        },
      })
      reset()
      onSaved()
    } catch {
      // hook already toasts
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{S.addResponse.title}</DialogTitle>
      </DialogHeader>
      {/* min-w-0: DialogContent is a CSS grid whose items default to
          min-width:auto — without this, wide description text refuses to
          shrink and widens the modal past its capped width. */}
      <div className="min-w-0 space-y-4 py-2">
        <div className="space-y-1.5">
          <Label className="font-ui" htmlFor="resp-vendor">
            {S.addResponse.vendorLabel} <span className="text-destructive">*</span>
          </Label>
          {/* API-backed vendor picker per §16.11 — same dropdown the
              procurement Vendors page uses. Sends `vendor_id` UUID. */}
          <AsyncSelect
            id="resp-vendor"
            value={vendor}
            onValueChange={setVendor}
            useOptions={useVendorOptions}
            loadOnOpen
            toLabel={(v) => v.name}
            placeholder={S.addResponse.vendorPlaceholder}
            searchPlaceholder={S.addResponse.vendorSearchPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-ui">
              {S.addResponse.qtyAvailableLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              decimals={0}
              value={qtyAvailable}
              onChange={(e) => setQtyAvailable(e.target.value)}
              placeholder={S.addResponse.qtyPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-ui">
              {S.addResponse.costLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder={S.addResponse.costPlaceholder}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-ui">{S.addResponse.availableDateLabel}</Label>
          <DatePicker
            value={availableDate}
            min={todayInput}
            onChange={setAvailableDate}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-ui">{S.addResponse.descriptionLabel}</Label>
          <RichTextEditor
            value={pmNotes}
            onChange={(html) => setPmNotes(html)}
            placeholder={S.addResponse.descriptionPlaceholder}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            reset()
            onSaved()
          }}
        >
          {S.addResponse.cancel}
        </Button>
        <Button onClick={handleSave} disabled={addMut.isPending}>
          {addMut.isPending ? S.addResponse.saving : S.addResponse.save}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
