import { X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect } from '@/components/ui/async-select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useVariantsListInfinite, type VariantListItem, partOptionDescription } from '@modules/ims'
import { cn } from '@/lib/utils'
import { useNumberField } from '@/hooks/use-number-field'

import { INWARDS_STRINGS } from '../inwards.strings'
import { InsteadOfPicker, MissingBomRow } from './BomComponentExtras'
import { componentHasDuplicateSerial, type BomComponentDraft } from './model'

const ROW_GRID = 'grid grid-cols-[1fr_1fr_4rem_auto] items-center gap-2'

/** One assembly component: variant picker | serial (or "by quantity") | qty | ✕.
 *  Tracking is resolved by the parent and passed in `trackingByPartId`; an
 *  unresolved part (`undefined`) keeps both inputs open as a safe default.
 *  A BOM row's ✕ records it missing (undoable); an added row's ✕ drops it
 *  (inward-verification D1). */
export function BomComponentRow(props: {
  component: BomComponentDraft
  trackingByPartId: Record<string, boolean>
  duplicateSerials: Set<string>
  /** BOM rows marked not inside — an added part may replace one (D7). */
  missingRows: BomComponentDraft[]
  onSet: (partial: Partial<BomComponentDraft>) => void
  onRemove: () => void
  onRestore: () => void
}) {
  const { component: c, missingRows, onSet } = props
  if (c.missing) return <MissingBomRow component={c} onRestore={props.onRestore} />
  if (c.fromTemplate) return <BomComponentFields {...props} />
  return (
    <div className="space-y-1">
      <BomComponentFields {...props} />
      <InsteadOfPicker
        missingRows={missingRows}
        value={c.insteadOfKey ?? null}
        onChange={(insteadOfKey) => onSet({ insteadOfKey })}
      />
    </div>
  )
}

function BomComponentFields({
  component: c,
  trackingByPartId,
  duplicateSerials,
  onSet,
  onRemove,
}: Parameters<typeof BomComponentRow>[0]) {
  const tracked = c.componentVariantId ? trackingByPartId[c.partId] : undefined
  // Whole quantity, at least one. A tracked component is exactly one unit.
  const qtyField = useNumberField(tracked === true ? 1 : c.quantity, (n) =>
    onSet({ quantity: Math.max(1, n) }),
  )
  // The serial is optional even for a tracked part: a label inside a device is
  // often unreadable until the part is pulled out (inward-verification D10).
  const invalid = componentHasDuplicateSerial(c, duplicateSerials)
  const duplicate = invalid
  const serialInput = (
    <Input
      value={c.serial}
      onChange={(e) => onSet({ serial: e.target.value })}
      placeholder={INWARDS_STRINGS.bomComponentRow.serialPlaceholderOptional}
      aria-label={INWARDS_STRINGS.bomComponentRow.serialAriaLabel}
      aria-invalid={invalid}
      className={cn(
        'h-9 font-mono',
        invalid && 'border-destructive focus-visible:ring-destructive',
      )}
    />
  )
  return (
    <div className={ROW_GRID}>
      <AsyncSelect<VariantListItem>
        value={c.componentVariantId ? { id: c.componentVariantId, label: c.label } : null}
        onValueChange={(next) => {
          if (!next) onSet({ componentVariantId: '', partId: '', label: '' })
        }}
        onItemPick={(item) =>
          onSet({
            componentVariantId: item.id,
            partId: item.part_id,
            tracked: trackingByPartId[item.part_id],
            label: item.display_title || `${item.part_number} · ${item.name}`,
            quantity: trackingByPartId[item.part_id] ? 1 : c.quantity,
          })
        }
        useOptions={useVariantsListInfinite}
        toLabel={(item) => item.display_title || `${item.part_number} · ${item.name}`}
        getDescription={partOptionDescription}
        placeholder={INWARDS_STRINGS.bomEditor.componentSearchPlaceholder}
        searchPlaceholder={INWARDS_STRINGS.bomComponentRow.searchPlaceholder}
        className="w-full"
      />
      {tracked === false && (
        <Typography variant="helper" tone="muted" className="self-center">
          {INWARDS_STRINGS.bomComponentRow.nonTrackedByQuantity}
        </Typography>
      )}
      {tracked !== false && duplicate && (
        // The duplicate-serial reason rides a styled tooltip, never a native
        // `title=` (§0.14). The red border + aria-invalid already flag it.
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={serialInput} />
            <TooltipContent>
              {INWARDS_STRINGS.bomComponentRow.duplicateSerialTitle}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {tracked !== false && !duplicate && (
        serialInput
      )}
      <Input
        {...qtyField}
        disabled={tracked === true}
        aria-label={INWARDS_STRINGS.bomComponentRow.quantityAriaLabel}
        className="h-9 w-16 text-right"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={
          c.fromTemplate
            ? INWARDS_STRINGS.bomComponentRow.notInsideLabel
            : INWARDS_STRINGS.bomComponentRow.removeAddedLabel
        }
        className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
