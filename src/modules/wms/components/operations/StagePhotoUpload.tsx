import { useState } from 'react'
import { CheckCircle2, Eye, FileText, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { FileUpload } from '@/components/common/files/FileUpload'
import { FilePreviewDialog, type FilePreviewTarget } from '@modules/attachments'
import { WMS_ATTACHMENT_MAX } from '../../constants/attachment-limits'
import { capAttachmentBatch } from '../../hooks/attachments/useAttachmentUpload'
import { STAGE_PHOTO_UPLOAD_STRINGS } from './stage-photo-upload.strings'

const VISIBLE_PHOTOS = 5

interface StagePhotoUploadProps {
  /** Buffered photo files, owned by the parent form. */
  value: File[]
  onChange: (files: File[]) => void
  label?: string
  /** Drop the required `*` and the "At least 1 required" hint — the photo
   *  becomes optional. The inspection / repair / QC stage photos are
   *  non-mandatory (server-side too). */
  optional?: boolean
  /** Max photos the operation accepts — one shared bucket quota on the backend.
   *  Defaults to the warehouse-operations photo cap. */
  maxCount?: number
  /** Optional per-file size cap in MB (tighter than the bucket's 20 MB). */
  maxSizeMb?: number
}

/** Photo-evidence picker for a stage-completing action. Required by default (a
 *  red `*` + "At least 1 required"); pass `optional` to drop both — the WMS
 *  stage completions no longer gate on a photo.
 *
 *  This does NOT upload on select — it only buffers the chosen files in the
 *  parent's state. The parent uploads them when the operator clicks Complete
 *  (so nothing hits the API while the form is being edited, and Cancel/discard
 *  leaves no orphan attachment behind). Row layout mirrors PODocumentsSection. */
export function StagePhotoUpload({
  value,
  onChange,
  label = STAGE_PHOTO_UPLOAD_STRINGS.defaultLabel,
  optional = false,
  maxCount = WMS_ATTACHMENT_MAX.operationPhoto,
  maxSizeMb,
}: StagePhotoUploadProps) {
  const count = value.length
  // In-app preview target, null when the dialog is closed.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null)

  // Cap the buffer at the operation's shared photo quota (via the shared upload
  // rules) so the operator can't stage more than the backend will accept — which
  // would 422 each extra file on Complete, one toast apiece. Server stays the
  // source of truth.
  const addFiles = (files: File[]) => {
    let batch = files
    if (maxSizeMb != null) {
      const sized = batch.filter((f) => f.size <= maxSizeMb * 1024 * 1024)
      if (sized.length < batch.length) {
        toast.error(STAGE_PHOTO_UPLOAD_STRINGS.tooLarge(maxSizeMb, batch.length - sized.length))
      }
      batch = sized
    }
    const accepted = capAttachmentBatch({
      files: batch,
      currentCount: value.length,
      limit: maxCount,
      copy: STAGE_PHOTO_UPLOAD_STRINGS,
    })
    if (accepted.length > 0) onChange([...value, ...accepted])
  }
  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  // Preview the buffered (not-yet-uploaded) file in-app.
  const view = (file: File) =>
    setPreview({ name: file.name, contentType: file.type, file })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="body-strong" asChild>
          <span>
            {label}
            {!optional && <span className="text-destructive"> *</span>}
          </span>
        </Typography>
        <Typography variant="helper" tone={count > 0 ? 'success' : 'muted'} asChild>
          <span className="inline-flex items-center gap-1">
            {count > 0 && <CheckCircle2 className="size-3.5" />}
            {count > 0 && STAGE_PHOTO_UPLOAD_STRINGS.countAdded(count)}
            {count === 0 && optional && STAGE_PHOTO_UPLOAD_STRINGS.optional}
            {count === 0 && !optional && STAGE_PHOTO_UPLOAD_STRINGS.atLeastOneRequired}
          </span>
        </Typography>
      </div>

      <FileUpload accept="image/*" multiple value={[]} onChange={addFiles} />

      {value.length > 0 && (
        // Five rows show at once (5 × 67px rows + 4 gaps ≈ 23rem); past that the list
        // scrolls inside itself so a big batch never pushes the rest of the form away.
        <ul className={cn('space-y-2', value.length > VISIBLE_PHOTOS && 'max-h-[23rem] overflow-y-auto pr-1')}>
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0">
                  <Typography variant="body-strong" truncate className="min-w-0">
                    {file.name}
                  </Typography>
                  <Typography variant="helper" tone="muted">
                    {STAGE_PHOTO_UPLOAD_STRINGS.fileSize((file.size / 1024).toFixed(0))}
                  </Typography>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => view(file)}>
                  <Eye className="size-4" data-icon="inline-start" />
                  {STAGE_PHOTO_UPLOAD_STRINGS.viewPhoto}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeAt(index)}
                  aria-label={STAGE_PHOTO_UPLOAD_STRINGS.removePhotoAria}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FilePreviewDialog
        target={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </div>
  )
}
