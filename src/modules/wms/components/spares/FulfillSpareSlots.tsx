import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect, type AsyncSelectOption } from '@/components/ui/async-select'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import type { StockItemListRow } from '@modules/ims'

import { makeUnitOptions } from '../../hooks/spares/fulfillSpareOptions'
import { qtyText, unitLabel } from './fulfill-spare-helpers'
import { SPARES_STRINGS as S } from './spares.strings'

const V = S.fulfillDialogView

interface Props {
  slots: string[]
  remaining: number
  inStockCount: number
  chosenCount: number
  partVariantId: string
  warehouseId: string | null | undefined
  open: boolean
  labelFor: (id: string) => string
  onPick: (index: number, opt: AsyncSelectOption | null) => void
}

function UnitOption({ u }: { u: StockItemListRow }) {
  return (
    // The serial is what the operator picks by, so it never shrinks; a long
    // variant name truncates instead, full text on hover. The variant is its
    // name + SKU (the SKU carries the condition), as Move Stock shows it.
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 font-mono font-medium">{u.serial_number}</span>
      <Typography variant="caption" tone="muted" asChild>
        <TruncatedText
          value={`${u.variant_name || u.part_name}${u.sku_code ? ` · ${u.sku_code}` : ''} · ${S.fulfillDialog.fieldQty} ${qtyText(u)}`}
          className="min-w-0 max-w-full"
        />
      </Typography>
    </span>
  )
}

/** One serial picker per still-needed unit; every filled slot = one line. */
export function FulfillSpareSlots(p: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label required>{V.serialFieldLabel}</Label>
        <Typography variant="caption" tone="muted" asChild>
          <span>{V.chosenCount(p.chosenCount, p.remaining, p.inStockCount)}</span>
        </Typography>
      </div>
      {p.slots.map((sid, i) => {
        // Units chosen in OTHER slots are excluded from this slot's list (its
        // own pick stays, so it can render highlighted).
        const excludeIds = p.slots.filter((s, idx) => idx !== i && !!s)
        const useUnitOptions = makeUnitOptions(p.partVariantId, p.warehouseId, excludeIds, p.open)
        return (
          <div key={i} className="flex items-center gap-2.5">
            <Typography variant="helper" tone="muted" asChild>
              <span className="w-14 shrink-0">{V.unitRow(i + 1)}</span>
            </Typography>
            <div className="min-w-0 flex-1">
              <AsyncSelect<StockItemListRow>
                value={sid ? { id: sid, label: p.labelFor(sid) } : null}
                onValueChange={(opt) => p.onPick(i, opt)}
                useOptions={useUnitOptions}
                toLabel={unitLabel}
                renderItem={(u) => <UnitOption u={u} />}
                placeholder={V.slotPlaceholder}
                searchPlaceholder={V.slotSearchPlaceholder}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
