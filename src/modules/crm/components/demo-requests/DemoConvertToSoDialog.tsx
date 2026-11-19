import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useConvertDemoRequestToOrder, useDemoDispatchedUnits } from "../../hooks/demo-requests/useDemoRequests"
import { DEMO_REQUESTS_STRINGS } from "./demo-requests.strings"

const S = DEMO_REQUESTS_STRINGS.detail.convertDialog

/** Dialog to convert a demo's dispatched units into a Sales Order — one row per
 *  serial (dispatch_request_item), each an individually selectable, priced
 *  line. Unselected units stay dispatched (returnable). Mount conditionally
 *  (`{open && <… />}`) so its state seeds fresh on every open.
 *
 *  Selection is inverted (a `deselected` set) and prices are overrides over the
 *  demo's default price, so nothing needs seeding once the async units load. */
export function DemoConvertToSoDialog({
  onOpenChange,
  demoId,
  priceByItemId,
}: {
  onOpenChange: (open: boolean) => void
  demoId: string
  /** Default sell price per demo_request_item_id, prefilled per unit. */
  priceByItemId: Record<string, number>
}) {
  const navigate = useNavigate()
  const unitsQuery = useDemoDispatchedUnits(demoId)
  const convertMutation = useConvertDemoRequestToOrder(demoId)

  const units = unitsQuery.data ?? []
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")

  const isSelected = (driId: string) => !deselected.has(driId)
  const selectedCount = units.filter((u) => isSelected(u.dispatch_request_item_id)).length
  const allSelected = units.length > 0 && selectedCount === units.length

  const defaultRate = (demoItemId: string) => String(priceByItemId[demoItemId] ?? 0)
  const rateValue = (driId: string, demoItemId: string) =>
    rateOverrides[driId] ?? defaultRate(demoItemId)

  const toggle = (driId: string) =>
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(driId)) next.delete(driId)
      else next.add(driId)
      return next
    })

  const toggleAll = () =>
    setDeselected((prev) =>
      prev.size === 0 ? new Set(units.map((u) => u.dispatch_request_item_id)) : new Set(),
    )

  async function handleSubmit() {
    const chosen = units.filter((u) => isSelected(u.dispatch_request_item_id))
    if (chosen.length === 0) {
      toast.error(S.noneSelected)
      return
    }
    const payloadUnits: { dispatch_request_item_id: string; rate: number }[] = []
    for (const unit of chosen) {
      const parsed = Number(rateValue(unit.dispatch_request_item_id, unit.demo_request_item_id))
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error(S.priceInvalid)
        return
      }
      payloadUnits.push({ dispatch_request_item_id: unit.dispatch_request_item_id, rate: parsed })
    }
    try {
      const updated = await convertMutation.mutateAsync({
        units: payloadUnits,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
      if (updated.converted_sales_order_id)
        navigate(`/crm/sales-orders/${updated.converted_sales_order_id}`)
    } catch {
      // useConvertDemoRequestToOrder already surfaces the error toast.
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{S.title}</DialogTitle>
          <DialogDescription>{S.description}</DialogDescription>
        </DialogHeader>

        {unitsQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : unitsQuery.isError ? (
          <Typography variant="body" tone="muted" className="py-4">
            {S.loadError}
          </Typography>
        ) : units.length === 0 ? (
          <Typography variant="body" tone="muted" className="py-4">
            {S.empty}
          </Typography>
        ) : (
          <div className="space-y-3 py-2">
            <label className="flex items-center gap-2">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <Typography variant="caption" tone="muted">
                {S.selectAll}
              </Typography>
            </label>

            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {units.map((unit) => {
                const driId = unit.dispatch_request_item_id
                return (
                  <li key={driId} className="space-y-2 rounded-lg border border-border bg-card p-3">
                    <label className="flex items-start gap-3">
                      <Checkbox
                        className="mt-0.5"
                        checked={isSelected(driId)}
                        onCheckedChange={() => toggle(driId)}
                      />
                      <div className="min-w-0 flex-1">
                        <Typography variant="body-strong" truncate className="min-w-0">
                          {unit.part_name}
                        </Typography>
                        <Typography variant="caption" tone="muted" truncate className="min-w-0">
                          {unit.variant_name} · {S.serialsPrefix} {unit.internal_serial}
                        </Typography>
                      </div>
                    </label>
                    <div className="space-y-1 pl-7">
                      <Typography variant="caption" tone="muted">
                        {S.priceLabel}
                      </Typography>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={rateValue(driId, unit.demo_request_item_id)}
                        disabled={!isSelected(driId)}
                        onChange={(e) =>
                          setRateOverrides((prev) => ({ ...prev, [driId]: e.target.value }))
                        }
                        className="h-8 w-40"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-1.5">
              <Typography variant="caption" tone="muted">
                {S.notesLabel}
              </Typography>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={S.notesPlaceholder}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={convertMutation.isPending}>
            {S.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertMutation.isPending || units.length === 0 || selectedCount === 0}
          >
            {convertMutation.isPending ? S.submitting : S.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
