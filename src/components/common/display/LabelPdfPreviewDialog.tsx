/**
 * A device barcode label as a print-ready PDF, embedded so Chrome's own PDF
 * viewer provides Print and Save. Embedding is the one delivery the browser
 * never blocks (popups, auto-downloads and hidden-iframe PDF prints all fail
 * silently). For a 1:1 label, print at Actual size (100%), not Fit to paper,
 * with the paper set to your label size in the printer driver.
 */
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { BARCODE_TEXT_STRINGS as S } from './barcode-text.strings'

export function LabelPdfPreviewDialog({
  url,
  onClose,
}: {
  /** Object URL of the generated PDF; null keeps the dialog closed. */
  url: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(url)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{S.preview.title}</DialogTitle>
        </DialogHeader>

        {url ? (
          <object
            data={url}
            type="application/pdf"
            className="h-[60vh] w-full rounded-md border border-border"
            aria-label={S.preview.title}
          >
            {/* Shown only where no inline PDF viewer exists. */}
            <a href={url} download={S.preview.filename}>
              {S.preview.download}
            </a>
          </object>
        ) : null}

        <DialogFooter>
          {/* A plain anchor with `download`: a direct user gesture, so it is
              never treated as an automatic (blocked) download. */}
          <Button render={<a href={url ?? undefined} download={S.preview.filename} />} variant="outline">
            <Download className="size-4" />
            {S.preview.download}
          </Button>
          <Button onClick={onClose}>{S.preview.done}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
