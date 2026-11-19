import { useRef } from "react"
import {
  Download,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { formatIST } from "@shared/lib/date"
import {
  triggerAttachmentDownload,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  type AttachmentWire,
  type EntityType,
} from "@modules/attachments"

import {
  CRM_ATTACHMENT_ACCEPT,
  CRM_ATTACHMENT_ALLOWED_MIMES,
  CRM_ATTACHMENT_DOCUMENT_TYPE,
  CRM_ATTACHMENT_MAX_BYTES,
  CRM_ATTACHMENT_MAX_COUNT,
} from "../../constants/crm-attachments"

interface EntityAttachmentsSectionProps {
  /** `crm_lead` or `crm_deal` — must have a backend policy registered. */
  entityType: Extract<EntityType, "crm_lead" | "crm_deal">
  entityId: string
  /** Gates upload + delete. Read-only viewers still see + download files. */
  canWrite: boolean
  className?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIconFor(contentType: string) {
  if (contentType.startsWith("image/")) return ImageIcon
  if (contentType.includes("spreadsheet") || contentType === "application/vnd.ms-excel")
    return FileSpreadsheet
  return FileText
}

// Free-form multi-file attachments for a lead or deal. Reuses the shared
// attachments API (§16.11 list query + upload/delete mutations). Files are
// validated client-side against the same limits as the backend policy so a
// bad pick is rejected before the request. Uploads tag `document_type` with
// a generic "attachment" (leads/deals have no fixed slots like accounts do).
function EntityAttachmentsSection({
  entityType,
  entityId,
  canWrite,
  className,
}: EntityAttachmentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const listQuery = useAttachments(entityType, entityId)
  const uploadMut = useUploadAttachment()
  const deleteMut = useDeleteAttachment()

  const attachments = listQuery.data ?? []
  const busy = uploadMut.isPending || deleteMut.isPending

  function openPicker() {
    inputRef.current?.click()
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const picked = Array.from(fileList)

    const remaining = CRM_ATTACHMENT_MAX_COUNT - attachments.length
    if (remaining <= 0) {
      toast.error(`This ${entityLabel(entityType)} already has the maximum of ${CRM_ATTACHMENT_MAX_COUNT} files.`)
      return
    }

    const valid: File[] = []
    for (const file of picked) {
      if (!(CRM_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(file.type)) {
        toast.error(`"${file.name}" — unsupported file type.`)
        continue
      }
      if (file.size > CRM_ATTACHMENT_MAX_BYTES) {
        toast.error(`"${file.name}" exceeds the ${formatBytes(CRM_ATTACHMENT_MAX_BYTES)} limit.`)
        continue
      }
      valid.push(file)
    }

    const toUpload = valid.slice(0, remaining)
    if (valid.length > remaining) {
      toast.error(`Only ${remaining} more file(s) can be added (max ${CRM_ATTACHMENT_MAX_COUNT}).`)
    }

    // Sequential so the per-entity count limit is respected and toasts don't
    // stack; the list query invalidates after each successful upload.
    for (const file of toUpload) {
      try {
        await uploadMut.mutateAsync({
          file,
          document_type: CRM_ATTACHMENT_DOCUMENT_TYPE,
          entity_type: entityType,
          entity_id: entityId,
        })
      } catch {
        // useUploadAttachment already toasts the error; stop the batch.
        break
      }
    }
  }

  function handleDelete(att: AttachmentWire) {
    deleteMut.mutate({ id: att.id, entityType, entityId })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Typography variant="card-title" asChild>
          <h3>
            Attachments
            {attachments.length > 0 && (
              <span className="ml-1.5 text-muted-foreground">({attachments.length})</span>
            )}
          </h3>
        </Typography>

        {canWrite && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={CRM_ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files)
                // Reset so re-picking the same file fires onChange again.
                e.target.value = ""
              }}
            />
            <Button size="sm" onClick={openPicker} disabled={busy} className="shrink-0">
              {uploadMut.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Upload className="mr-1 size-4" />
              )}
              Upload
            </Button>
          </>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading attachments…
        </div>
      ) : listQuery.isError ? (
        <LoadErrorState error={listQuery.error} fallback="Unable to load attachments." />
      ) : attachments.length === 0 ? (
        // No action here on purpose — the header "Upload" button above is the
        // single upload entry point; a second one in the empty state doubled it.
        <EmptyState
          icon={Paperclip}
          title="No attachments yet"
          description={
            canWrite
              ? "Upload quotes, proposals, specs, or photos (PDF, image, or Office files up to 20 MB)."
              : "No files have been uploaded."
          }
          // No action here on purpose — the header "Upload" button above is the
          // single upload entry point; a second one in the empty state doubled it.
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {attachments.map((att) => {
            const Icon = fileIconFor(att.content_type)
            return (
              <li key={att.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Typography variant="body-strong" className="truncate" asChild>
                    <p>{att.document_name}</p>
                  </Typography>
                  <Typography variant="helper" tone="muted" className="truncate">
                    {formatBytes(att.size_bytes)} · {formatIST(att.created_at)}
                  </Typography>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Download"
                    onClick={() => {
                      void triggerAttachmentDownload(att)
                    }}
                  >
                    <Download className="size-4" />
                  </Button>
                  {canWrite && (
                    <ConfirmDialog
                      title="Delete attachment?"
                      description={`"${att.document_name}" will be removed. This can't be undone.`}
                      confirmLabel="Delete"
                      variant="destructive"
                      onConfirm={() => handleDelete(att)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          disabled={deleteMut.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function entityLabel(entityType: "crm_lead" | "crm_deal"): string {
  return entityType === "crm_lead" ? "lead" : "deal"
}

export { EntityAttachmentsSection }
