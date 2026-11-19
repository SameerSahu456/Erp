import { useEffect, useRef, useState } from 'react'
import { Eye, FileText, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/common/files/FileUpload'
import { Typography } from '@/components/ui/typography'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'
import {
  FilePreviewDialog,
  useAttachments,
  useDeleteAttachment,
  type AttachmentWire,
  type FilePreviewTarget,
} from '@modules/attachments'
import {
  capAttachmentBatch,
  useAttachmentUpload,
} from '../../hooks/attachments/useAttachmentUpload'
import { CHECKLIST_PHOTO_FIELD_STRINGS } from './checklist-photo-field.strings'

// Mirrors the backend `_WMS_OPS_DOC_MIMES` (images + PDF) on warehouse_operations.
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

interface ChecklistPhotoFieldProps {
  /** The warehouse_operation id photos hang off. Without it the field can't
   *  upload (a photo item on an op that never opened a run) — it renders a hint. */
  opId?: string
  /** Template item key — namespaces the document_type so multiple photo items
   *  on one op don't collide (`checklist_<key>`). */
  itemKey: string
  /** Current answer = the attachment ids of this item's photos. */
  value: string[]
  /** Reports the live attachment-id list up as the item's answer. */
  onChange: (attachmentIds: string[]) => void
  /** Optional cap on THIS field's photo count (tighter than the shared op
   *  bucket). Used by the failed-check evidence field (5). */
  maxCount?: number
  /** Optional per-file size cap in MB (tighter than the bucket's 20 MB). */
  maxSizeMb?: number
}

/** A `photo`-kind checklist answer: uploads images against the op under a
 *  per-item document_type and reports the resulting attachment ids as the
 *  answer value. Row layout mirrors `PODocumentsSection` / `StagePhotoUpload`
 *  so every attachment surface in the app shares one look — file card row
 *  with View + Remove per photo. */
export function ChecklistPhotoField({
  opId,
  itemKey,
  // `value` is intentionally not destructured — the answer is derived from the
  // live server attachments (see `photos` below), not held in the parent's form
  // state. We keep it on the props contract so ChecklistFields' generic wiring
  // stays uniform across text / number / photo item kinds.
  onChange,
  maxCount,
  maxSizeMb,
}: ChecklistPhotoFieldProps) {
  const documentType = `checklist_${itemKey}`
  const list = useAttachments('warehouse_operations', opId, { enabled: !!opId })
  const { limit, runUpload, isUploading } = useAttachmentUpload('warehouse_operations')
  const remove = useDeleteAttachment()
  // In-app preview target, null when the dialog is closed.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null)

  const photos: AttachmentWire[] = (list.data ?? []).filter(
    (a) => a.document_type === documentType,
  )
  const ids = photos.map((a) => a.id)
  const key = ids.join(',')

  // Keep the latest onChange in a ref so the sync effect doesn't refire when the
  // parent passes a new closure each render (mirrors StagePhotoUpload).
  const cb = useRef(onChange)
  useEffect(() => {
    cb.current = onChange
  }, [onChange])

  // Report the derived id list up whenever the set of attachments changes,
  // gated on its stable join key so `ids` (a fresh array each render) doesn't
  // cause an infinite loop.
  useEffect(() => {
    cb.current(key ? key.split(',') : [])
  }, [key])

  if (!opId) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <p>{CHECKLIST_PHOTO_FIELD_STRINGS.noOpHint}</p>
      </Typography>
    )
  }

  const handleFiles = async (files: File[]) => {
    // Oversized files never reach here — FileUpload rejects them inline (maxSize).
    let batch = files
    // Optional per-field count cap (tighter than the shared op bucket), counted
    // against THIS field's current photos, e.g. the 5-photo evidence field.
    if (maxCount != null) {
      const room = maxCount - photos.length
      if (room <= 0) {
        toast.error(CHECKLIST_PHOTO_FIELD_STRINGS.fieldMaxReached(maxCount))
        return
      }
      if (batch.length > room) {
        toast.error(CHECKLIST_PHOTO_FIELD_STRINGS.fieldLimitPartial(maxCount, batch.length - room))
        batch = batch.slice(0, room)
      }
    }
    if (batch.length === 0) return
    // Every photo item on this op shares ONE backend bucket, so cap against the
    // op's TOTAL attachments (all checklist_* + stage photos), not just this
    // item's — otherwise we'd wave through files the server will 422. `runUpload`
    // then uploads silently and fires ONE summary toast (per-file errors still
    // surface individually).
    const accepted = capAttachmentBatch({
      files: batch,
      currentCount: (list.data ?? []).length,
      limit,
      copy: CHECKLIST_PHOTO_FIELD_STRINGS,
    })
    await runUpload(accepted, {
      entityId: opId,
      documentType,
      summary: CHECKLIST_PHOTO_FIELD_STRINGS.photosUploaded,
    })
  }

  function view(att: AttachmentWire) {
    setPreview({ name: att.document_name, contentType: att.content_type, wire: att })
  }

  return (
    <div className="space-y-3">
      <FileUpload
        accept={ACCEPT}
        maxSize={maxSizeMb != null ? maxSizeMb * 1024 * 1024 : undefined}
        multiple
        value={[]}
        onChange={handleFiles}
      />
      {maxCount != null && (
        <Typography variant="helper" tone="muted" asChild>
          <p>{CHECKLIST_PHOTO_FIELD_STRINGS.countHint(maxCount)}</p>
        </Typography>
      )}
      {isUploading && (
        <Typography variant="helper" tone="muted" asChild>
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />{' '}
            {CHECKLIST_PHOTO_FIELD_STRINGS.uploading}
          </span>
        </Typography>
      )}
      {photos.length > 0 && (
        // Cap the list height and scroll when many photos are attached, so the
        // checklist form stays usable instead of growing unbounded (CP-545 #5).
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {photos.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0">
                  <Typography variant="body-strong" truncate className="min-w-0">
                    {att.document_name}
                  </Typography>
                  <Typography variant="helper" tone="muted">
                    {att.content_type}
                  </Typography>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => view(att)}>
                  <Eye className="size-4" data-icon="inline-start" />
                  {CHECKLIST_PHOTO_FIELD_STRINGS.viewPhoto}
                </Button>
                <ConfirmDialog
                  title={CHECKLIST_PHOTO_FIELD_STRINGS.removeDialog.title}
                  description={CHECKLIST_PHOTO_FIELD_STRINGS.removeDialog.description(
                    att.document_name,
                  )}
                  confirmLabel={CHECKLIST_PHOTO_FIELD_STRINGS.removeDialog.confirmLabel}
                  variant="destructive"
                  onConfirm={() =>
                    remove.mutate({
                      id: att.id,
                      entityType: 'warehouse_operations',
                      entityId: opId,
                    })
                  }
                  trigger={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={remove.isPending}
                      aria-label={CHECKLIST_PHOTO_FIELD_STRINGS.removePhotoAria}
                    >
                      <X className="size-4" />
                    </Button>
                  }
                />
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
