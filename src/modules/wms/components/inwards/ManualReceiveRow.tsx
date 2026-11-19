import { ScanLine, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect } from '@/components/ui/async-select'
import { useNumberField } from '@/hooks/use-number-field'
import { useVariantsListInfinite, type VariantListItem, partOptionDescription } from '@modules/ims'
import { cn } from '@/lib/utils'

import { makeLine, type ManualReceiveLine } from './manual-receive-lines-helpers'
import { INWARDS_STRINGS } from './inwards.strings'

/** Per-line quantity input for non-tracked lines. A component (not inline in
 *  the row `.map`) so the shared number-field hook runs at a component top
 *  level. Whole units; resting 0 is fine — `buildManualLines` drops a 0 line. */
function NonTrackedQtyInput({
  qty,
  onQtyChange,
  ariaLabel,
}: {
  qty: number
  onQtyChange: (next: number) => void
  ariaLabel: string
}) {
  const qtyField = useNumberField(qty, onQtyChange)
  return <Input {...qtyField} aria-label={ariaLabel} className="ml-auto h-9 w-16 text-right" />
}

interface ManualReceiveRowProps {
  line: ManualReceiveLine
  /** Column template shared with the header row. */
  gridClassName: string
  tracked: boolean | undefined
  dupSerial: boolean
  patch: (key: string, partial: Partial<ManualReceiveLine>) => void
  pick: (line: ManualReceiveLine, item: VariantListItem) => void
  removeLine: (key: string) => void
}

export function ManualReceiveRow({
  line,
  gridClassName,
  tracked,
  dupSerial,
  patch,
  pick,
  removeLine,
}: ManualReceiveRowProps) {
  return (
    <div className="border-b last:border-b-0">
      <div className={cn(gridClassName, 'items-start px-3 py-3')}>
        {/* Part Number — full catalog search */}
        <div className="min-w-0">
          <AsyncSelect<VariantListItem>
            value={line.variantId ? { id: line.variantId, label: line.label } : null}
            onValueChange={(next) => {
              if (!next) patch(line.key, { ...makeLine(), key: line.key })
            }}
            onItemPick={(item) => pick(line, item)}
            useOptions={useVariantsListInfinite}
            toLabel={(item) => item.display_title || `${item.part_number} · ${item.name}`}
            getDescription={partOptionDescription}
            placeholder={INWARDS_STRINGS.manualReceiveLines.searchPlaceholder}
            searchPlaceholder={INWARDS_STRINGS.manualReceiveLines.searchInputPlaceholder}
            className="w-full"
          />
        </div>

        {/* Serial Number — tracked only */}
        <div className="min-w-0">
          {!line.variantId && (
            <Typography variant="helper" tone="muted">
              {INWARDS_STRINGS.manualReceiveLines.selectPartFirst}
            </Typography>
          )}
          {!!line.variantId && tracked === false && (
            <Typography variant="helper" tone="muted">
              {INWARDS_STRINGS.manualReceiveLines.nonTrackedByQuantity}
            </Typography>
          )}
          {!!line.variantId && tracked !== false && (
            <div className="space-y-1">
              <div className="relative">
                <ScanLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={line.serial}
                  onChange={(e) => patch(line.key, { serial: e.target.value })}
                  placeholder={INWARDS_STRINGS.manualReceiveLines.serialPlaceholder}
                  aria-label={INWARDS_STRINGS.manualReceiveLines.serialAriaLabel(line.label)}
                  aria-invalid={dupSerial}
                  className={cn(
                    'h-9 pl-8 font-mono',
                    dupSerial && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
              </div>
              {dupSerial && (
                <Typography variant="helper" tone="danger">
                  {INWARDS_STRINGS.manualReceiveLines.duplicateSerial}
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Qty — tracked is 1; non-tracked is the entered quantity */}
        <div className="text-right">
          {!line.variantId && (
            <Typography variant="body" tone="muted" numeric>
              —
            </Typography>
          )}
          {!!line.variantId && tracked === true && (
            <Typography variant="body" numeric>
              1
            </Typography>
          )}
          {!!line.variantId && tracked !== true && (
            <NonTrackedQtyInput
              qty={line.qty}
              onQtyChange={(n) => patch(line.key, { qty: n })}
              ariaLabel={INWARDS_STRINGS.manualReceiveLines.quantityAriaLabel(line.label)}
            />
          )}
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={() => removeLine(line.key)}
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
