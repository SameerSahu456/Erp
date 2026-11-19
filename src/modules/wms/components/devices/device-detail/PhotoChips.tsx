import { useState } from 'react'
import { Camera, Download, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
  FilePreviewDialog,
  triggerAttachmentDownload,
  type FilePreviewTarget,
} from '@modules/attachments'

import type { ChecklistRunAnswer } from '../../../api'
import { CHECKLIST_RUNS_CARD_STRINGS as S } from './checklist-runs-card.strings'
import { fileKind } from './checklist-run-helpers'

/** Evidence photos as file cards with in-app View (PAGE-UI §9) and Download. */
export function PhotoChips({ photos }: { photos: ChecklistRunAnswer['photos'] }) {
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null)
  if (!photos || photos.length === 0) return null
  return (
    <>
      <ul className="space-y-2">
        {photos.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Camera className="size-4" />
              </span>
              <div className="min-w-0">
                <Typography variant="body-strong" truncate className="min-w-0">
                  {p.document_name}
                </Typography>
                <Typography variant="helper" tone="muted">
                  {fileKind(p.content_type)}
                </Typography>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview({ name: p.document_name, contentType: p.content_type, wire: p })}
              >
                <Eye className="size-4" data-icon="inline-start" />
                {S.photo.view}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => void triggerAttachmentDownload(p)}
                aria-label={S.photo.download}
              >
                <Download className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <FilePreviewDialog
        target={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </>
  )
}
