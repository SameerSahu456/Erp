import { FileText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { RichTextView } from '@/components/ui/rich-text-editor'
import { cn } from '@/lib/utils'

import { LineRow, type LineRowCtx } from './LineRow'
import type { ManualLine } from './model'
import { INWARDS_STRINGS } from '../inwards.strings'

// Past this many rows the list gets an inner scroll (§7.7) so the header,
// section footer and Save bar stay reachable.
const INNER_SCROLL_ROW_THRESHOLD = 10

const S = INWARDS_STRINGS.inwardLineItems

type Bucket = { sourceId: string; description: string; pending: number }

/** The line-items table body: empty state, the description-bucket groups
 *  (header + rows + "add part"), then the flat part-number / off-PO rows. */
export function LineItemsTable({
  descBuckets,
  flatRows,
  value,
  receivedByBucket,
  ctx,
  onAddDescRow,
}: {
  descBuckets: Bucket[]
  flatRows: ManualLine[]
  value: ManualLine[]
  receivedByBucket: Record<string, number>
  ctx: LineRowCtx
  onAddDescRow: (bucket: Bucket) => void
}) {
  const hasAnyRows = descBuckets.length > 0 || flatRows.length > 0
  if (!hasAnyRows) {
    return (
      <div className="px-3 py-8 text-center">
        <Typography variant="helper" tone="muted">
          {S.emptyState}
        </Typography>
      </div>
    )
  }
  return (
    <div
      className={cn(
        value.length > INNER_SCROLL_ROW_THRESHOLD && 'max-h-[32rem] overflow-y-auto',
      )}
    >
      {descBuckets.map((bucket) => {
        const rows = value.filter((l) => l.descriptionOnly && l.sourceId === bucket.sourceId)
        const received = receivedByBucket[bucket.sourceId] ?? 0
        const over = received > bucket.pending
        return (
          <div key={bucket.sourceId} className="border-b last:border-b-0 bg-muted/5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b bg-muted/20 px-3 py-2">
              <span className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {bucket.description ? (
                  // Render the PO line's rich-text description with its styling,
                  // exactly as the PO detail page shows it.
                  <RichTextView html={bucket.description} lines={3} className="min-w-0 flex-1" />
                ) : (
                  <Typography variant="caption" className="min-w-0 truncate">
                    {S.descriptionOnlyLine}
                  </Typography>
                )}
              </span>
              <Typography variant="caption" tone={over ? 'warning' : 'muted'} className="shrink-0">
                {over
                  ? S.overPoReceiving(received, bucket.pending)
                  : S.receivedOfPending(received, bucket.pending)}
              </Typography>
            </div>
            {rows.map((line) => (
              <LineRow key={line.key} line={line} ctx={ctx} />
            ))}
            <div className="px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onAddDescRow(bucket)}>
                <Plus className="size-4" data-icon="inline-start" />
                {S.addPartToLine}
              </Button>
            </div>
          </div>
        )
      })}
      {flatRows.map((line) => (
        <LineRow key={line.key} line={line} ctx={ctx} />
      ))}
    </div>
  )
}
