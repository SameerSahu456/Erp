/**
 * The labels, shown.
 *
 * Three ways of getting a PDF to an operator were tried and all three are at
 * the browser's discretion: a hidden iframe (Chrome's PDF viewer ignores
 * `contentWindow.print()`), a popup tab (blocked), and a programmatic download
 * (blocked as an "automatic download" once the click's gesture has expired
 * across the await). Each failed SILENTLY, which is why the button looked dead
 * while the server was happily generating labels.
 *
 * Embedding the PDF cannot be blocked. The viewer that Chrome renders inside
 * `<object>` carries its own print and save buttons, so the operator gets both
 * — and, unlike every previous attempt, can SEE that something happened.
 */
import { Download, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface LabelPreviewDialogProps {
  /** Object URL of the generated PDF; null closes the dialog. */
  url: string | null
  count: number
  filename: string
  onClose: () => void
}

export function LabelPreviewDialog({
  url,
  count,
  filename,
  onClose,
}: LabelPreviewDialogProps) {
  return (
    <Dialog open={Boolean(url)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{S.labels.previewTitle(count)}</DialogTitle>
          <DialogDescription>{S.labels.previewHint}</DialogDescription>
        </DialogHeader>

        {url ? (
          <object
            data={url}
            type="application/pdf"
            className="h-[60vh] w-full rounded-md border border-border"
            aria-label={S.labels.previewTitle(count)}
          >
            {/* Shown only where no inline PDF viewer exists. */}
            <a href={url} download={filename}>
              {S.labels.download}
            </a>
          </object>
        ) : null}

        <DialogFooter>
          {/* A plain anchor with `download`: this one IS a direct user gesture,
              so it is never treated as an automatic download. */}
          <Button
            render={<a href={url ?? undefined} download={filename} />}
            variant="outline"
          >
            <Download className="size-4" />
            {S.labels.download}
          </Button>
          <Button onClick={onClose}>
            <Printer className="size-4" />
            {S.labels.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
