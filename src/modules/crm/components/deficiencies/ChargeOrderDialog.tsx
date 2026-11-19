import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { useCategoryOptions } from "@modules/ims"

import type { CustomerDeficiencyWire } from "../../api"
import { DEFICIENCY_TYPE_LABEL, type DeficiencyType } from "../../constants/deficiency"
import { useRaiseChargeOrder } from "../../hooks/deficiencies/useDeficiencies"
import { DEFICIENCIES_STRINGS } from "./deficiencies.strings"

const S = DEFICIENCIES_STRINGS.charge
const DEFAULT_GST = "18"

interface Draft {
  rate: string
  tax: string
  description: string
  /** Only asked for when the deficiency carries none — the order line needs one. */
  category: AsyncSelectOption | null
}

const isNumber = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0

/** Price each picked deficiency and raise ONE draft charge order (R15). */
export function ChargeOrderDialog({
  rows,
  onClose,
}: {
  rows: readonly CustomerDeficiencyWire[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const raise = useRaiseChargeOrder()
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.id,
        { rate: r.suggested_amount ?? "", tax: DEFAULT_GST, description: r.description, category: null },
      ]),
    ),
  )
  const patch = (id: string, part: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...part } }))
  const valid = rows.every(
    (r) =>
      isNumber(drafts[r.id].rate) &&
      isNumber(drafts[r.id].tax) &&
      (r.category_id != null || drafts[r.id].category != null),
  )

  const confirm = async () => {
    const order = await raise.mutateAsync(
      rows.map((r) => ({
        deficiency_id: r.id,
        rate: drafts[r.id].rate,
        tax_rate: drafts[r.id].tax,
        description: drafts[r.id].description.trim() || null,
        category_id: r.category_id ?? drafts[r.id].category?.id ?? null,
      })),
    )
    onClose()
    navigate(`/crm/sales-orders/${order.id}`)
  }

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.title}
      description={S.description}
      isDirty
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={raise.isPending}>
            {S.cancel}
          </Button>
          <Button onClick={() => void confirm()} disabled={!valid || raise.isPending}>
            {S.confirm}
          </Button>
        </>
      )}
    >
      <ul className="max-h-[28rem] space-y-4 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 rounded-md border p-3">
            <Typography variant="body-strong" className="min-w-0 truncate">
              {DEFICIENCY_TYPE_LABEL[r.deficiency_type as DeficiencyType] ?? r.deficiency_type}
              {r.serial_number ? ` · ${r.serial_number}` : ""}
            </Typography>
            <div className="grid gap-2 sm:grid-cols-[1fr_6rem_5rem]">
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`charge-desc-${r.id}`}>{S.lineDescription}</Label>
                <Input id={`charge-desc-${r.id}`} value={drafts[r.id].description} onChange={(e) => patch(r.id, { description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label required htmlFor={`charge-rate-${r.id}`}>{S.rate}</Label>
                <Input id={`charge-rate-${r.id}`} inputMode="decimal" value={drafts[r.id].rate} onChange={(e) => patch(r.id, { rate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label required htmlFor={`charge-tax-${r.id}`}>{S.tax}</Label>
                <Input id={`charge-tax-${r.id}`} inputMode="decimal" value={drafts[r.id].tax} onChange={(e) => patch(r.id, { tax: e.target.value })} />
              </div>
            </div>
            {r.category_id == null && (
              <div className="space-y-1">
                <Label required>{S.category}</Label>
                <AsyncSelect
                  value={drafts[r.id].category}
                  onValueChange={(v) => patch(r.id, { category: v })}
                  useOptions={useCategoryOptions}
                  loadOnOpen
                  toLabel={(c) => c.name}
                  placeholder={S.categoryPlaceholder}
                  className="w-full"
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {!valid && (
        <Typography variant="helper" tone="muted">
          {S.invalid}
        </Typography>
      )}
    </OperationDialog>
  )
}
