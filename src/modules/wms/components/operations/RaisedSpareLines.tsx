import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { useNumberField } from '@/hooks/use-number-field'
import { cn } from '@/lib/utils'

import { type RaisedSpareLine } from '../../hooks/operations/useRaiseSpares'
import { RAISE_SPARES_DIALOG_STRINGS as S } from './raise-spares-dialog.strings'

/** Past this many lines the list scrolls instead of growing the dialog. */
const SCROLL_AFTER = 5

/** Per-line quantity input (min 1); a component so the number-field hook runs at top level. */
function SpareLineQtyInput({
  quantity,
  onQuantityChange,
}: {
  quantity: number
  onQuantityChange: (next: number) => void
}) {
  const qtyField = useNumberField(quantity, (n) => onQuantityChange(Math.max(1, n)))
  return <Input {...qtyField} className="w-20" aria-label={S.quantityAriaLabel} />
}

interface RaisedSpareLinesProps {
  lines: RaisedSpareLine[]
  onQuantityChange: (key: string, quantity: number) => void
  onRemove: (key: string) => void
}

/** The spares added so far: label (+ "described" tag), quantity, remove. */
export function RaisedSpareLines({ lines, onQuantityChange, onRemove }: RaisedSpareLinesProps) {
  if (lines.length === 0) return null
  return (
    <ul className={cn('space-y-2', lines.length > SCROLL_AFTER && 'max-h-80 overflow-y-auto pr-1')}>
      {lines.map((l) => (
        <li key={l.key} className="flex items-center gap-2 rounded-md border border-border p-2.5">
          {/* Long part numbers get cut, so the full name shows on hover. */}
          <Typography variant="body-strong" asChild>
            <TruncatedText value={l.label} className="min-w-0 max-w-full flex-1" />
          </Typography>
          {l.variantId === null && (
            <StatusBadge variant="info" className="shrink-0">
              {S.describedBadge}
            </StatusBadge>
          )}
          <SpareLineQtyInput quantity={l.quantity} onQuantityChange={(n) => onQuantityChange(l.key, n)} />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(l.key)}
            aria-label={S.removeSparePartAriaLabel}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
