import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { type ManualReceiveState } from './manual-receive-lines-helpers'
import { normalizeSerial } from './inward-lines/model'
import { useManualReceiveLines } from './useManualReceiveLines'
import { ManualReceiveRow } from './ManualReceiveRow'
import { INWARDS_STRINGS } from './inwards.strings'

// Shared column template (mirrors the PO / return line-items tables).
const LINE_GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_5rem_2.5rem] gap-3'

// Past this many rows the list gets an inner scroll (§7.7) so the header row and
// the Save bar below stay reachable.
const INNER_SCROLL_ROW_THRESHOLD = 10

export function ManualReceiveLines({
  value,
  onChange,
}: {
  value: ManualReceiveState
  onChange: (next: ManualReceiveState) => void
}) {
  const { patch, addLine, removeLine, trackingByPartId, pick, duplicateSerials } =
    useManualReceiveLines(value, onChange)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <div className={cn(LINE_GRID, 'border-b bg-muted/30 px-3 py-2')}>
          <Typography variant="caption" tone="muted">
            {INWARDS_STRINGS.manualReceiveLines.columnPartNumber}
          </Typography>
          <Typography variant="caption" tone="muted">
            {INWARDS_STRINGS.manualReceiveLines.columnSerialNumber}
          </Typography>
          <Typography variant="caption" tone="muted" className="text-right">
            {INWARDS_STRINGS.manualReceiveLines.columnQty}
          </Typography>
          <span />
        </div>

        {value.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Typography variant="helper" tone="muted">
              {INWARDS_STRINGS.manualReceiveLines.emptyState}
            </Typography>
          </div>
        ) : (
          <div
            className={cn(
              value.length > INNER_SCROLL_ROW_THRESHOLD &&
                'max-h-[32rem] overflow-y-auto',
            )}
          >
            {value.map((line) => (
              <ManualReceiveRow
                key={line.key}
                line={line}
                gridClassName={LINE_GRID}
                tracked={line.variantId ? trackingByPartId[line.partId] : undefined}
                dupSerial={
                  !!line.serial.trim() && duplicateSerials.has(normalizeSerial(line.serial))
                }
                patch={patch}
                pick={pick}
                removeLine={removeLine}
              />
            ))}
          </div>
        )}
      </div>

      <Button type="button" variant="outline" onClick={addLine}>
        <Plus className="size-4" data-icon="inline-start" />
        {INWARDS_STRINGS.lineItems.addLine}
      </Button>
    </div>
  )
}
