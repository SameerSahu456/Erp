import { ScanLine } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { NumberFieldInputProps } from '@/hooks/use-number-field'

import { INWARDS_STRINGS } from '../inwards.strings'
import { lineSerialMode, type ManualLine } from './model'

const S = INWARDS_STRINGS.lineItems

export interface SerialFlags {
  missing: boolean
  duplicate: boolean
  serverDuplicate: boolean
}

/** First applicable serial error: missing → in-batch duplicate → already in inventory. */
function serialErrorText({ missing, duplicate, serverDuplicate }: SerialFlags): string | null {
  if (missing) return S.serialRequired
  if (duplicate) return S.serialDuplicate
  return serverDuplicate ? S.serialInInventory : null
}

export function LineSerialCell({
  line,
  flags,
  onSerialChange,
}: {
  line: ManualLine
  flags: SerialFlags
  onSerialChange: (serial: string) => void
}) {
  if (!line.variantId) {
    return (
      <Typography variant="helper" tone="muted">
        {S.selectPartFirst}
      </Typography>
    )
  }
  const invalid = flags.missing || flags.duplicate || flags.serverDuplicate
  const error = serialErrorText(flags)
  return (
    <div className="space-y-1">
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={line.serial}
          onChange={(e) => onSerialChange(e.target.value)}
          placeholder={line.tracked ? S.serialPlaceholderTracked : S.serialPlaceholderOptional}
          aria-label={S.serialAriaLabel(line.partNumber)}
          aria-invalid={invalid}
          className={cn('h-9 pl-8 font-mono', invalid && 'border-destructive focus-visible:ring-destructive')}
        />
      </div>
      {error && (
        <Typography variant="helper" tone="danger">
          {error}
        </Typography>
      )}
    </div>
  )
}

/** Qty — a serial-mode line is always 1; otherwise the editable quantity. */
export function LineQtyCell({
  line,
  qtyField,
}: {
  line: ManualLine
  qtyField: NumberFieldInputProps
}) {
  if (!line.variantId) {
    return (
      <Typography variant="body" tone="muted" numeric>
        —
      </Typography>
    )
  }
  if (lineSerialMode(line)) {
    return (
      <Typography variant="body" numeric>
        1
      </Typography>
    )
  }
  return (
    <Input
      {...qtyField}
      aria-label={S.quantityAriaLabel(line.partNumber)}
      className="ml-auto h-9 w-16 text-right"
    />
  )
}
