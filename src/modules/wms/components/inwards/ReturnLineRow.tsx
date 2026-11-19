import { useMemo } from 'react'
import { X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect, makeStaticAsyncOptions, type AsyncQueryShape } from '@/components/ui/async-select'
import { useNumberField } from '@/hooks/use-number-field'
import { cn } from '@/lib/utils'

import { INWARDS_STRINGS } from './inwards.strings'
import {
  lineUnits,
  RETURN_LINE_GRID,
  type ReturnLine,
  type ReturnUnitOption,
  type ReturnVariantOption,
} from './return-line-items-helpers'

const S = INWARDS_STRINGS.returnLineItems

/** Qty input for non-tracked return lines, capped at the pending units. A component
 *  so the number-field hook runs at top level. */
function ReturnQtyInput({
  qty,
  max,
  onQtyChange,
  ariaLabel,
}: {
  qty: number
  max: number
  onQtyChange: (next: number) => void
  ariaLabel: string
}) {
  const qtyField = useNumberField(qty, onQtyChange, { max })
  return <Input {...qtyField} aria-label={ariaLabel} className="ml-auto h-9 w-16 text-right" />
}

interface ReturnLineRowProps {
  line: ReturnLine
  /** Returnable units still selectable on this line (others' picks removed). */
  serialUnits: ReturnUnitOption[]
  /** Units of each variant still to inward after every line's pick. */
  leftByVariant: ReadonlyMap<string, number>
  useVariantOptions: (search: string) => AsyncQueryShape<ReturnVariantOption>
  onPatch: (partial: Partial<ReturnLine>) => void
  onPickVariant: (variantId: string) => void
  onPickSerial: (unit: ReturnUnitOption | null) => void
  onRemove: () => void
}

const CLEARED_LINE: Partial<ReturnLine> = {
  variantId: null,
  label: '',
  tracked: false,
  pending: 0,
  serial: '',
  stockItemId: null,
  qty: 0,
}

/** Part Number — searchable picker over the returnable variants. */
function ReturnVariantCell({
  line,
  leftByVariant,
  useVariantOptions,
  onPatch,
  onPickVariant,
}: Pick<
  ReturnLineRowProps,
  'line' | 'leftByVariant' | 'useVariantOptions' | 'onPatch' | 'onPickVariant'
>) {
  return (
    <div className="min-w-0 space-y-1">
      <AsyncSelect<ReturnVariantOption>
        value={line.variantId ? { id: line.variantId, label: line.label } : null}
        onValueChange={(next) => {
          if (!next) onPatch(CLEARED_LINE)
        }}
        onItemPick={(item) => onPickVariant(item.variantId)}
        useOptions={useVariantOptions}
        toLabel={(o) => o.label}
        placeholder={S.variantSearchPlaceholder}
        searchPlaceholder={S.variantSearchInputPlaceholder}
        className="w-full"
        renderItem={(o) => (
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            <Typography variant="caption" tone="muted" numeric className="shrink-0">
              {INWARDS_STRINGS.poSourcePicker.pending(leftByVariant.get(o.variantId) ?? o.units.length)}
            </Typography>
          </span>
        )}
      />
      {line.variantId && (
        <Typography variant="helper" tone="muted" numeric>
          {line.tracked ? S.serialized : S.quantity}{' '}
          · {INWARDS_STRINGS.returnSourcePicker.pendingReturn(
            leftByVariant.get(line.variantId) ?? line.pending,
          )}
        </Typography>
      )}
    </div>
  )
}

function ReturnSerialPicker({
  line,
  useSerialOptions,
  onPickSerial,
}: Pick<ReturnLineRowProps, 'line' | 'onPickSerial'> & {
  useSerialOptions: (search: string) => AsyncQueryShape<ReturnUnitOption>
}) {
  return (
    <div className="space-y-1">
      <AsyncSelect<ReturnUnitOption>
        value={line.stockItemId ? { id: line.stockItemId, label: line.serial } : null}
        onValueChange={(next) => {
          if (!next) onPickSerial(null)
        }}
        onItemPick={onPickSerial}
        useOptions={useSerialOptions}
        toLabel={(u) => u.serial}
        clearable={!line.tracked}
        placeholder={S.serialSelectPlaceholder}
        searchPlaceholder={S.serialSearchPlaceholder}
        className="w-full font-mono"
        renderItem={(u) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-mono">{u.serial}</span>
            {u.manufacturerSerial && (
              <Typography variant="caption" tone="muted" className="truncate">
                {u.manufacturerSerial}
              </Typography>
            )}
          </span>
        )}
      />
      {!line.tracked && !line.stockItemId && (
        <Typography variant="helper" tone="muted">
          {S.nonTrackedScanHint}
        </Typography>
      )}
    </div>
  )
}

/** Qty — tracked is 1; non-tracked is the entered quantity. */
function ReturnQtyCell({ line, onPatch }: Pick<ReturnLineRowProps, 'line' | 'onPatch'>) {
  if (!line.variantId) {
    return (
      <Typography variant="body" tone="muted" numeric>
        —
      </Typography>
    )
  }
  if (line.tracked) {
    const used = lineUnits(line) > 0
    return (
      <Typography variant="body" numeric tone={used ? 'default' : 'muted'}>
        {used ? 1 : 0}
      </Typography>
    )
  }
  return (
    <ReturnQtyInput
      qty={line.qty}
      max={line.pending}
      onQtyChange={(n) => onPatch({ qty: n })}
      ariaLabel={S.quantityAriaLabel(line.label)}
    />
  )
}

/** One return line: part picker, serial picker (constrained to this line's
 *  returnable units), quantity, remove. */
export function ReturnLineRow({
  line,
  serialUnits,
  leftByVariant,
  useVariantOptions,
  onPatch,
  onPickVariant,
  onPickSerial,
  onRemove,
}: ReturnLineRowProps) {
  // Stable per unit list — a fresh options hook each render would refetch /
  // reset the picker's internal state.
  const useSerialOptions = useMemo(
    () => makeStaticAsyncOptions(serialUnits, (u) => `${u.serial} ${u.manufacturerSerial}`),
    [serialUnits],
  )
  const hasPickableUnit = serialUnits.length > 0 || !!line.stockItemId
  return (
    <div className="border-b last:border-b-0">
      <div className={cn(RETURN_LINE_GRID, 'items-start px-3 py-3')}>
        <ReturnVariantCell
          line={line}
          leftByVariant={leftByVariant}
          useVariantOptions={useVariantOptions}
          onPatch={onPatch}
          onPickVariant={onPickVariant}
        />

        {/* Serial — a picker constrained to the returnable units of THIS line,
            so a non-returnable serial can't be entered. On a non-tracked line the
            pick is optional (clearable) — it pins the exact unit. */}
        <div className="min-w-0">
          {!line.variantId && (
            <Typography variant="helper" tone="muted">
              {S.selectPartFirst}
            </Typography>
          )}
          {!!line.variantId && !hasPickableUnit && (
            <Typography variant="helper" tone="muted">
              {S.noReturnableUnits}
            </Typography>
          )}
          {!!line.variantId && hasPickableUnit && (
            <ReturnSerialPicker
              line={line}
              useSerialOptions={useSerialOptions}
              onPickSerial={onPickSerial}
            />
          )}
        </div>

        <div className="text-right">
          <ReturnQtyCell line={line} onPatch={onPatch} />
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onRemove}
            aria-label={INWARDS_STRINGS.lineItems.removeLineLabel}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
