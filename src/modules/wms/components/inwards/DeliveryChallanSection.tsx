import { useState } from 'react'

import { Typography } from '@/components/ui/typography'
import {
  FilePreviewDialog,
  useAttachments,
  useDeleteAttachment,
  type FilePreviewTarget,
} from '@modules/attachments'

import {
  capAttachmentBatch,
  useAttachmentUpload,
} from '../../hooks/attachments/useAttachmentUpload'
import { INWARDS_STRINGS } from './inwards.strings'
import { ChallanRowItem, ChallanUploadArea, type ChallanRow } from './DeliveryChallanParts'

const CHALLAN_DOC_TYPE = 'delivery_challan'

interface DeliveryChallanSectionProps {
  /** LIVE mode: the GRN batch the challan(s) hang off (uploads/deletes hit
   *  the backend immediately). Omit in staged mode. */
  batchId?: string
  /** When false, hides the add/remove controls (view-only). Default true. */
  editable?: boolean
  /** STAGED mode (create form, before the batch exists): the files held in the
   *  form's state. When provided the section operates on these instead of the
   *  backend, and `onStagedChange` reports adds/removes. Mirrors
   *  PODocumentsSection so the two flows behave identically. */
  stagedFiles?: File[]
  onStagedChange?: (files: File[]) => void
  /** LIVE mode: called after a challan is uploaded or deleted, so an edit form
   *  can mark itself dirty (live uploads don't flow through form state). */
  onLiveChange?: () => void
}

/** Lists the delivery-challan attachments on a GRN batch. In LIVE mode
 *  (`batchId` set) uploads/deletes hit the backend; in STAGED mode
 *  (`stagedFiles` provided) it operates on the form's file list so the
 *  create form can preview + view files before the batch even exists.
 *  Mirrors the two-mode pattern in `PODocumentsSection`. */
export function DeliveryChallanSection({
  batchId,
  editable = true,
  stagedFiles,
  onStagedChange,
  onLiveChange,
}: DeliveryChallanSectionProps) {
  const staged = stagedFiles !== undefined
  // Live queries/mutations are inert in staged mode (batchId absent).
  const list = useAttachments('grn_batches', batchId ?? '')
  const { limit, runUpload, isUploading } = useAttachmentUpload('grn_batches')
  const remove = useDeleteAttachment()
  // In-app preview target, null when the dialog is closed.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null)

  const rows: ChallanRow[] = staged
    ? (stagedFiles ?? []).map((f, i) => ({
        id: `staged-${i}-${f.name}`,
        name: f.name,
        type: f.type || 'file',
        file: f,
        index: i,
      }))
    : (list.data ?? [])
        .filter((a) => a.document_type === CHALLAN_DOC_TYPE)
        .map((a) => ({
          id: a.id,
          name: a.document_name,
          type: a.content_type,
          wire: a,
        }))

  const isLoading = !staged && list.isLoading
  const hasRows = rows.length > 0

  function view(row: ChallanRow) {
    // Preview in-app: a staged file previews from memory; a live one
    // is fetched with auth inside the dialog. The title is the real file name.
    setPreview({ name: row.name, contentType: row.type, wire: row.wire, file: row.file })
  }

  async function handleFiles(files: File[]) {
    // Enforce the backend's per-batch cap up front. Count what's
    // already attached — staged files in create mode, or in edit mode ALL of
    // the batch's live attachments (every document_type shares the one 20-file
    // bucket, so invoice/inspection docs count too, not just challans) — and
    // only accept up to the remaining slots so no doomed POST fires.
    const currentCount = staged ? (stagedFiles ?? []).length : (list.data ?? []).length
    const accepted = capAttachmentBatch({
      files,
      currentCount,
      limit,
      copy: INWARDS_STRINGS.deliveryChallan,
    })
    if (accepted.length === 0) return
    if (staged) {
      // Buffer in the form's list until the batch is created; upload happens
      // post-create in useInwardForm.
      onStagedChange?.([...(stagedFiles ?? []), ...accepted])
      return
    }
    if (!batchId) return
    // Each file becomes its own delivery-challan attachment; upload silently and
    // report the batch once (per-file errors still surface individually).
    await runUpload(accepted, {
      entityId: batchId,
      documentType: CHALLAN_DOC_TYPE,
      summary: INWARDS_STRINGS.deliveryChallan.uploaded,
    })
    onLiveChange?.()
  }

  function removeStaged(index: number) {
    onStagedChange?.((stagedFiles ?? []).filter((_, i) => i !== index))
  }

  function removeLive(row: ChallanRow) {
    remove.mutate({
      id: row.id,
      entityType: 'grn_batches',
      entityId: batchId ?? '',
    })
    onLiveChange?.()
  }

  return (
    <div className="space-y-3">
      {editable && (
        <ChallanUploadArea
          hasRows={hasRows}
          showUploading={!staged && isUploading}
          onFiles={handleFiles}
        />
      )}
      {isLoading && <div className="h-12 animate-pulse rounded-md bg-muted" />}
      {!isLoading && hasRows && (
        <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <ChallanRowItem
              key={row.id}
              row={row}
              editable={editable}
              staged={staged}
              removePending={remove.isPending}
              onView={view}
              onRemoveStaged={removeStaged}
              onRemoveLive={removeLive}
            />
          ))}
        </ul>
      )}
      {!isLoading && !hasRows && (
        <Typography variant="body" tone="muted">
          {INWARDS_STRINGS.deliveryChallan.emptyState}
        </Typography>
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
