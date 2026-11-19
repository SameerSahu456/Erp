import { useEffect } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useFinalizePreview } from '../../hooks/inwards/useInwards'
import { deriveFinalizePreview } from './finalize-preview-helpers'
import {
  FinalizeConfirmLabel,
  FinalizePreviewBody,
  FinalizePreviewStatus,
} from './FinalizePreviewParts'
import { INWARDS_STRINGS } from './inwards.strings'

/** Pre-finalize confirmation. On open it dry-runs the finalize pipeline
 *  (no commit) and shows exactly what will happen — plus any per-line
 *  validation errors (e.g. an off-PO line) that would block the real
 *  finalize. Confirm is only enabled when the preview says it will succeed. */
export function FinalizePreviewDialog({
  batchId,
  stagedTotal,
  open,
  onOpenChange,
  onConfirm,
  confirming,
  blockingIssues = [],
}: {
  batchId: string
  stagedTotal: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  confirming: boolean
  // Client-side blockers the backend preview doesn't check (it's summary-only)
  // — e.g. off-PO lines that the real finalize rejects. Block confirm on these.
  blockingIssues?: string[]
}) {
  const preview = useFinalizePreview()
  const { mutate } = preview

  // Re-run the dry-run each time the dialog opens (state may have changed).
  useEffect(() => {
    if (open && batchId) mutate(batchId)
  }, [open, batchId, mutate])

  const data = preview.data
  const view = deriveFinalizePreview(data, blockingIssues)
  const { blocked, blockReason } = view
  const settled = !preview.isPending && !preview.isError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{INWARDS_STRINGS.batchDevices.finalizeDialogTitle}</DialogTitle>
          <DialogDescription>
            {INWARDS_STRINGS.finalizePreview.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <FinalizePreviewStatus isPending={preview.isPending} isError={preview.isError} />
        {settled && data ? <FinalizePreviewBody view={view} /> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            {INWARDS_STRINGS.finalizePreview.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  onClick={onConfirm}
                  disabled={!data || blocked || preview.isPending || confirming}
                >
                  <FinalizeConfirmLabel confirming={confirming} stagedTotal={stagedTotal} />
                </Button>
              </TooltipTrigger>
              {blockReason && !preview.isPending && !confirming && (
                <TooltipContent>{blockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
