import { useRef } from "react"
import { Eye, FileText, Loader2, Paperclip, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { FileUpload } from "@/components/common/files/FileUpload"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { cn } from "@/lib/utils"
import {
  fetchAttachmentBlob,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "@modules/attachments"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import {
  DOC_ROW_REM,
  INVOICE_DOC_TYPE,
  PO_DOC_MAX_BYTES,
  PO_DOC_MIMES,
  PO_DOC_HINT,
  PO_ENTITY_TYPE,
  type DocRow,
} from "./po-documents-section-helpers"

const S = PURCHASE_ORDERS_STRINGS.detail.documents

export {
  INVOICE_DOC_TYPE,
  PO_DOC_HINT,
  PO_DOC_MAX_BYTES,
  PO_DOC_MIMES,
  PO_ENTITY_TYPE,
} from "./po-documents-section-helpers"

interface PODocumentsSectionProps {
  /** The purchase order the EXISTING documents hang off. Present in edit/detail;
   *  omit in the pure create form. Existing docs are listed (view / live-delete).
   *  Whether NEW uploads persist immediately or are staged depends on whether
   *  `stagedFiles` is also passed (see below). */
  poId?: string
  /** When false, render a read-only list (no upload / remove) — the detail page,
   *  where documents are managed from the forms. */
  editable?: boolean
  /** Files staged in the form's state, uploaded only on save. Passing this makes
   *  NEW additions stage instead of uploading immediately — so a cancelled form
   *  never persists them. Combine with `poId` (edit) to show existing docs live
   *  while staging new ones; pass alone (create) before the PO exists. */
  stagedFiles?: File[]
  onStagedChange?: (files: File[]) => void
  /** Rows shown before the list scrolls internally. Default 3 (forms); the
   *  detail page passes 4. */
  visibleRows?: number
}

/** The Documents card body (header + list / drop-zone) for a PO. Self-contained:
 *  renders its own "Documents" header with an Upload button, shows the drop-zone
 *  only while empty, and lists each document with View + remove (X). Works in two
 *  modes — LIVE (poId, backend uploads) and STAGED (create form, File[]) — so
 *  every PO surface shares one component. Available in every PO status: paperwork
 *  routinely arrives after the last GRN (spec-po-close-cancel-and-documents §C). */
export function PODocumentsSection({
  poId,
  editable = true,
  stagedFiles,
  onStagedChange,
  visibleRows = 3,
}: PODocumentsSectionProps) {
  const staged = stagedFiles !== undefined
  // Live queries/mutations are inert in staged mode (poId absent).
  const list = useAttachments(PO_ENTITY_TYPE, poId ?? "")
  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()
  const inputRef = useRef<HTMLInputElement>(null)

  // Existing (already-saved) documents fetched from the backend — shown whenever
  // a PO exists (edit + detail). Empty in the pure create form (no poId).
  const liveDocs: DocRow[] = poId
    ? (list.data ?? []).map((a) => ({
        id: a.id,
        name: a.document_name,
        type: a.content_type,
        wire: a,
      }))
    : []
  // Staged (unsaved) files held in the form's state — uploaded only when the
  // form is saved. Present in create AND edit, so a cancelled edit never
  // persists a newly-added document.
  const stagedDocs: DocRow[] = staged
    ? (stagedFiles ?? []).map((f, i) => ({
        id: `staged-${i}-${f.name}`,
        name: f.name,
        type: f.type || "file",
        file: f,
        index: i,
      }))
    : []
  const docs: DocRow[] = [...liveDocs, ...stagedDocs]

  const isLoading = !!poId && list.isLoading
  const busy = upload.isPending

  async function view(doc: DocRow) {
    try {
      const blob = doc.file ?? (doc.wire ? await fetchAttachmentBlob(doc.wire) : null)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error(S.openFailed)
    }
  }

  async function addFiles(files: File[]) {
    if (!files.length) return
    if (staged) {
      onStagedChange?.([...(stagedFiles ?? []), ...files])
      return
    }
    if (!poId) return
    for (const file of files) {
      await upload
        .mutateAsync({
          file,
          document_type: INVOICE_DOC_TYPE,
          entity_type: PO_ENTITY_TYPE,
          entity_id: poId,
        })
        .catch(() => {})
    }
  }

  function removeStaged(index: number) {
    onStagedChange?.((stagedFiles ?? []).filter((_, i) => i !== index))
  }

  const hasDocs = docs.length > 0

  return (
    <div className="flex flex-1 flex-col">
      {/* Hidden picker driven by the header Upload button. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PO_DOC_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />

      {/* Header: title left; once there are documents the drop-zone gives way to
          a compact Upload button here on the right. */}
      <div className="flex items-center justify-between gap-2 px-[18px] py-3.5">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <Typography variant="card-title">{S.cardTitle}</Typography>
        </div>
        {editable && hasDocs && (
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Upload className="size-4" data-icon="inline-start" />
            )}
            {S.uploadButton}
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-border">
        {isLoading ? (
          <div className="m-[18px] h-12 animate-pulse rounded-md bg-muted" />
        ) : hasDocs ? (
          <ul
            className={cn(
              "space-y-2 p-[18px]",
              // Cap the visible rows and scroll inside once there are more, so a
              // long list never grows the card. Forms show 3; the detail page 4.
              docs.length > visibleRows && "overflow-y-auto",
            )}
            style={
              docs.length > visibleRows
                ? { maxHeight: `${visibleRows * DOC_ROW_REM}rem` }
                : undefined
            }
          >
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Typography variant="body-strong" truncate className="min-w-0">
                      {doc.name}
                    </Typography>
                    <Typography variant="helper" tone="muted">
                      {doc.type}
                    </Typography>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => view(doc)}>
                    <Eye className="size-4" data-icon="inline-start" />
                    {S.viewButton}
                  </Button>
                  {editable &&
                    (doc.file !== undefined ? (
                      // Staged (unsaved) file: drop it from the form's list —
                      // nothing to undo server-side, it was never uploaded.
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => removeStaged(doc.index ?? 0)}
                        aria-label={S.removeAriaLabel}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : (
                      // Existing (saved) document: confirm the destructive backend delete.
                      <ConfirmDialog
                        title={S.removeTitle}
                        description={S.removeDescription(doc.name)}
                        confirmLabel={S.removeConfirm}
                        variant="destructive"
                        onConfirm={() =>
                          remove.mutate({ id: doc.id, entityType: PO_ENTITY_TYPE, entityId: poId ?? "" })
                        }
                        trigger={
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={remove.isPending}
                            aria-label={S.removeAriaLabel}
                          >
                            <X className="size-4" />
                          </Button>
                        }
                      />
                    ))}
                </div>
              </li>
            ))}
          </ul>
        ) : editable ? (
          // Empty + editable: the drop-zone is the primary call to action.
          <div className="space-y-1.5 p-[18px]">
            <FileUpload
              accept={PO_DOC_MIMES.join(",")}
              maxSize={PO_DOC_MAX_BYTES}
              multiple
              value={[]}
              onChange={addFiles}
            />
            <Typography variant="helper" tone="muted">
              {PO_DOC_HINT}
              {staged ? ` · ${S.stagedNote}` : ""}
            </Typography>
          </div>
        ) : (
          // Empty + read-only (detail): centered placeholder.
          <div className="flex flex-1 items-center justify-center py-8">
            <Typography variant="body" tone="muted">
              {S.empty}
            </Typography>
          </div>
        )}
      </div>
    </div>
  )
}
