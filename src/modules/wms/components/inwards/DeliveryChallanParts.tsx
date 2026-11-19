import { Eye, FileText, Loader2, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { FileUpload } from '@/components/common/files/FileUpload'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'
import type { AttachmentWire } from '@modules/attachments'

import { INWARDS_STRINGS } from './inwards.strings'

const CHALLAN_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const
// Mirrors the backend document bucket (attachment_policy.py): 20 MB per file.
const CHALLAN_MAX_BYTES = 20 * 1024 * 1024
// Upload guideline under the dropzone, derived from the constants above so it can't drift.
const CHALLAN_HINT = INWARDS_STRINGS.deliveryChallan.uploadSizeHint(
  CHALLAN_MAX_BYTES / (1024 * 1024),
)

/** One row, normalised across the LIVE (uploaded attachment) and STAGED
 *  (unsaved File) cases so the list renders the same in both. */
export interface ChallanRow {
  id: string
  name: string
  type: string
  wire?: AttachmentWire
  file?: File
  index?: number
}

interface ChallanUploadAreaProps {
  hasRows: boolean
  showUploading: boolean
  onFiles: (files: File[]) => void | Promise<void>
}

export function ChallanUploadArea({ hasRows, showUploading, onFiles }: ChallanUploadAreaProps) {
  return (
    <div className="space-y-1.5">
      <Typography variant="caption" tone="muted">
        {hasRows
          ? INWARDS_STRINGS.deliveryChallan.addMore
          : INWARDS_STRINGS.deliveryChallan.uploadPrompt}
        {INWARDS_STRINGS.deliveryChallan.multipleFilesSuffix}
      </Typography>
      <FileUpload
        accept={CHALLAN_MIMES.join(',')}
        maxSize={CHALLAN_MAX_BYTES}
        multiple
        value={[]}
        onChange={onFiles}
      />
      <Typography variant="helper" tone="muted">
        {CHALLAN_HINT}
      </Typography>
      {showUploading && (
        <Typography variant="helper" tone="muted" asChild>
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> {INWARDS_STRINGS.deliveryChallan.uploading}
          </span>
        </Typography>
      )}
    </div>
  )
}

interface ChallanRowItemProps {
  row: ChallanRow
  editable: boolean
  staged: boolean
  removePending: boolean
  onView: (row: ChallanRow) => void
  onRemoveStaged: (index: number) => void
  onRemoveLive: (row: ChallanRow) => void
}

export function ChallanRowItem(p: ChallanRowItemProps) {
  const { row } = p
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0">
          <Typography variant="body-strong" truncate className="min-w-0">
            {row.name}
          </Typography>
          <Typography variant="helper" tone="muted">
            {row.type}
          </Typography>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => p.onView(row)}>
          <Eye className="size-4" data-icon="inline-start" />
          {INWARDS_STRINGS.deliveryChallan.view}
        </Button>
        {p.editable &&
          (p.staged ? (
            // Staged file: remove from the form's list directly.
            <Button
              variant="destructive"
              size="sm"
              onClick={() => p.onRemoveStaged(row.index ?? 0)}
              aria-label={INWARDS_STRINGS.deliveryChallan.removeAriaLabel}
            >
              <X className="size-4" />
            </Button>
          ) : (
            // Live: confirm before the destructive backend delete.
            <ConfirmDialog
              title={INWARDS_STRINGS.deliveryChallan.removeDialogTitle}
              description={INWARDS_STRINGS.deliveryChallan.removeDialogDescription(row.name)}
              confirmLabel={INWARDS_STRINGS.deliveryChallan.removeConfirmLabel}
              variant="destructive"
              onConfirm={() => p.onRemoveLive(row)}
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={p.removePending}
                  aria-label={INWARDS_STRINGS.deliveryChallan.removeAriaLabel}
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          ))}
      </div>
    </li>
  )
}
