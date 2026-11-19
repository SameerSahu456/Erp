import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNumberField } from '@/hooks/use-number-field'

import { BomAssembly } from './BomAssembly'
import { INWARDS_STRINGS } from '../inwards.strings'
import {
  lineBomEligible,
  lineHasDuplicateSerial,
  lineMissingSerial,
  lineUnitCount,
  normalizeSerial,
  type ManualLine,
} from './model'
import { LinePartCell, type LineRowCtx } from './LinePartCell'
import { LineQtyCell, LineSerialCell } from './LineRowCells'

export type { LineRowCtx } from './LinePartCell'

const LINE_GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_5rem_2.5rem] gap-3'

/** One line row (part | serial | qty | ✕) + its inline BOM assembly. */
export function LineRow({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  const { patch, removeLine, bomOpenKey } = ctx
  // Whole units; resting 0 is fine — a 0-qty line contributes no units.
  const qtyField = useNumberField(line.qty, (n) => patch(line.key, { qty: n }))
  const missing = lineMissingSerial(line)
  const duplicate = lineHasDuplicateSerial(line, ctx.duplicateSerials)
  // Serial the backend rejected at finalize as already-in-inventory. Cleared
  // automatically once the operator edits the serial to something not flagged.
  const serverDuplicate =
    !!line.serial.trim() && ctx.flaggedSerials.has(normalizeSerial(line.serial))
  const bomOpen =
    bomOpenKey === line.key && lineBomEligible(line) && lineUnitCount(line) === 1

  return (
    <div className="border-b last:border-b-0" data-flagged-serial={serverDuplicate ? 'true' : undefined}>
      <div className={cn(LINE_GRID, 'items-start px-3 py-3')}>
        <LinePartCell line={line} ctx={ctx} />
        <div className="min-w-0">
          <LineSerialCell
            line={line}
            flags={{ missing, duplicate, serverDuplicate }}
            onSerialChange={(serial) => patch(line.key, { serial })}
          />
        </div>
        <div className="flex h-10 items-center justify-end">
          <LineQtyCell line={line} qtyField={qtyField} />
        </div>
        <div className="flex h-10 items-center justify-end">
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
      {bomOpen && (
        <div className="bg-muted/10 px-3 pb-3">
          <BomAssembly
            line={line}
            duplicateSerials={ctx.duplicateSerials}
            onChange={(c) => patch(line.key, { components: c })}
          />
        </div>
      )}
    </div>
  )
}
