import { useState } from 'react'
import { Boxes, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'

import {
  componentsFromTemplate,
  makeComponent,
  type BomComponentDraft,
  type ManualLine,
} from './model'
import { BomComponentRow } from './BomComponentRow'
import { useBomComponentTracking } from './useBomComponentTracking'
import { INWARDS_STRINGS } from '../inwards.strings'

const S = INWARDS_STRINGS.bomEditor

/** Inline assembly editor for a bom-eligible line: the operator searches and
 *  picks each component variant (like a line), with a serial + qty per row.
 *  "Load template" seeds from the variant's reference BOM; "Clear" empties it. */
export function BomAssembly({
  line,
  duplicateSerials,
  onChange,
}: {
  line: ManualLine
  /** Normalized serials entered 2+ times across the batch — a component serial
   *  in this set is flagged as a duplicate. */
  duplicateSerials: Set<string>
  onChange: (next: BomComponentDraft[]) => void
}) {
  const rows = line.components
  // Loading the template replaces the whole assembly, so when rows already
  // exist we confirm first (ConfirmDialog) rather than a native window.confirm.
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const setRow = (rowKey: string, partial: Partial<BomComponentDraft>) =>
    onChange(rows.map((c) => (c.rowKey === rowKey ? { ...c, ...partial } : c)))
  const addRow = () => onChange([...rows, makeComponent()])
  // A BOM row the operator removes is NOT deleted: it is recorded as missing so
  // procurement sees the shortfall (inward-verification D1). An added row is
  // simply dropped, along with any alternative pointing at a dropped row.
  const removeRow = (rowKey: string) => {
    const row = rows.find((c) => c.rowKey === rowKey)
    if (row?.fromTemplate) return setRow(rowKey, { missing: true })
    onChange(rows.filter((c) => c.rowKey !== rowKey))
  }
  const restoreRow = (rowKey: string) =>
    onChange(
      rows.map((c) => {
        if (c.rowKey === rowKey) return { ...c, missing: false }
        return c.insteadOfKey === rowKey ? { ...c, insteadOfKey: null } : c
      }),
    )
  const missingRows = rows.filter((c) => c.missing)
  const applyTemplate = () => onChange(componentsFromTemplate(line.bom))
  const loadTemplate = () => {
    if (rows.length > 0) {
      setReplaceConfirmOpen(true)
      return
    }
    applyTemplate()
  }

  // Display only; splitting tracked rows runs for every line in useInwardLineItems.
  const trackingByPartId = useBomComponentTracking(rows)

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Boxes className="size-4 text-muted-foreground" />
          <Typography variant="caption" tone="muted">
            {S.assemblySummary(rows.length)}
          </Typography>
        </span>
        <div className="flex items-center gap-2">
          {line.bom.length === 0 ? (
            // Disabled with a styled why-tooltip, never a native `title=`
            // (§0.9/§0.14). The trigger wraps a span so the disabled button
            // still surfaces the reason on hover.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={<span className="inline-flex cursor-not-allowed" />}
                >
                  <Button type="button" variant="outline" size="sm" disabled>
                    {S.loadTemplateButton}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{S.loadTemplateEmptyTitle}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadTemplate}
            >
              {S.loadTemplateButton}
            </Button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_4rem_auto] items-center gap-2 px-1">
          <Typography variant="caption" tone="muted">
            {S.columnPartNumber}
          </Typography>
          <Typography variant="caption" tone="muted">
            {S.columnSerialNumber}
          </Typography>
          <Typography variant="caption" tone="muted" className="text-right">
            {S.columnQty}
          </Typography>
          <span className="w-6" />
        </div>
      )}

      {rows.map((c) => (
        <BomComponentRow
          key={c.rowKey}
          component={c}
          trackingByPartId={trackingByPartId}
          duplicateSerials={duplicateSerials}
          missingRows={missingRows}
          onSet={(partial) => setRow(c.rowKey, partial)}
          onRemove={() => removeRow(c.rowKey)}
          onRestore={() => restoreRow(c.rowKey)}
        />
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-4" data-icon="inline-start" />
        {S.addComponent}
      </Button>

      <ConfirmDialog
        open={replaceConfirmOpen}
        onOpenChange={setReplaceConfirmOpen}
        variant="destructive"
        title={S.replaceDialogTitle}
        description={S.replaceDialogDescription(rows.length)}
        confirmLabel={S.replaceConfirmLabel}
        cancelLabel={S.replaceCancelLabel}
        onConfirm={applyTemplate}
      />
    </div>
  )
}
