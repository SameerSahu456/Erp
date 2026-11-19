import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import type { POExpectedLine } from '../../api'
import { type ManualLine } from './inward-lines/model'
import { useInwardLineItems } from './inward-lines/useInwardLineItems'
import { InwardLineItemsToolbar } from './inward-lines/InwardLineItemsToolbar'
import { LineItemsTable } from './inward-lines/LineItemsTable'
import { INWARDS_STRINGS } from './inwards.strings'

// Shared column template for the header (line rows live in LineRow).
const LINE_GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_5rem_2.5rem] gap-3'

// Stable empty default so the flagged-serials effect doesn't re-run on every
// render when the caller passes nothing.
const NO_FLAGGED_SERIALS: ReadonlySet<string> = new Set()

export function InwardLineItems({
  pendingLines,
  value,
  onChange,
  condition,
  flaggedSerials = NO_FLAGGED_SERIALS,
}: {
  pendingLines: POExpectedLine[]
  value: ManualLine[]
  onChange: (next: ManualLine[]) => void
  // The source PO's header condition — constrains the catalog variant picker
  // for description-only / off-PO lines to matching-condition variants.
  condition?: 'new' | 'refurbished'
  // Normalised serials the backend rejected at finalize (already in inventory).
  // A line whose serial matches is outlined red, and the first one is scrolled
  // into view when the operator lands here from a failed finalize.
  flaggedSerials?: ReadonlySet<string>
}) {
  const c = useInwardLineItems({ pendingLines, value, onChange, condition, flaggedSerials })

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <InwardLineItemsToolbar
          noPendingLines={pendingLines.length === 0}
          onDownloadTemplate={c.downloadTemplate}
          onBulkFile={c.handleBulkFile}
        />
        {/* Header */}
        <div className={cn(LINE_GRID, 'border-b bg-muted/30 px-3 py-2')}>
          <Typography variant="caption" tone="muted">{INWARDS_STRINGS.lineItems.columnPartNumber}</Typography>
          <Typography variant="caption" tone="muted">{INWARDS_STRINGS.lineItems.columnSerialNumber}</Typography>
          <Typography variant="caption" tone="muted" className="text-right">{INWARDS_STRINGS.lineItems.columnQty}</Typography>
          <span />
        </div>

        <LineItemsTable
          descBuckets={c.descBuckets}
          flatRows={c.flatRows}
          value={value}
          receivedByBucket={c.receivedByBucket}
          ctx={c.ctx}
          onAddDescRow={c.addDescRow}
        />
      </div>

      <Button type="button" variant="outline" onClick={c.addLine}>
        <Plus className="size-4" data-icon="inline-start" />
        {INWARDS_STRINGS.inwardLineItems.addLineFromPo}
      </Button>
    </div>
  )
}
