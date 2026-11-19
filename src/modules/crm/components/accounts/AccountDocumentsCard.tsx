import { useMemo, useRef, useState } from "react"
import { Eye, FileText, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { cn } from "@/lib/utils"
import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_LABELS,
  ACCOUNT_DOC_MAX_BYTES,
  ACCOUNT_DOC_TYPES,
  type AccountDocumentType,
} from "@/modules/crm/constants/account-documents"
import {
  deleteAttachment,
  useAttachments,
  useUploadAttachment,
  type AttachmentWire,
} from "@modules/attachments"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountDocumentPreviewDialog } from "./AccountDocumentPreviewDialog"

interface AccountDocumentsCardProps {
  accountId: string
}

// Compact "Documents" card for the Account overview — one row per canonical
// doc slot (PAN / GST / Aadhaar / …). It replaces the standalone Documents
// tab: clicking a file name previews it in place; "Change" / "Upload" opens
// the file picker and saves the slot immediately (replace semantics — the
// old file is soft-deleted server-side so history is kept).
function AccountDocumentsCard({ accountId }: AccountDocumentsCardProps) {
  const listQuery = useAttachments("crm_account", accountId)
  const uploadMut = useUploadAttachment()

  // One hidden <input> shared by every row; `activeSlot` records which slot
  // the picker was opened for so the change handler knows where to put it.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSlot, setActiveSlot] = useState<AccountDocumentType | null>(null)
  const [previewing, setPreviewing] = useState<AttachmentWire | null>(null)

  // Current file per slot. A type can carry replaced/older copies, so pick the
  // most recent by `created_at` (ISO-8601 sorts lexicographically) rather than
  // relying on list order — that's the live document for the field.
  const currentBySlot = useMemo(() => {
    const map = new Map<string, AttachmentWire>()
    for (const a of listQuery.data ?? []) {
      const existing = map.get(a.document_type)
      if (!existing || a.created_at > existing.created_at) {
        map.set(a.document_type, a)
      }
    }
    return map
  }, [listQuery.data])

  function pickFor(slot: AccountDocumentType) {
    setActiveSlot(slot)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const slot = activeSlot
    // Reset so re-picking the same file path re-fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = ""
    setActiveSlot(null)
    if (!file || !slot) return
    if (!ACCOUNT_DOC_ALLOWED_MIMES.includes(file.type as never)) {
      toast.error(S.toast.docTypeNotAllowed)
      return
    }
    if (file.size > ACCOUNT_DOC_MAX_BYTES) {
      toast.error(S.toast.docTooLarge)
      return
    }
    // Replace: drop the current file on this slot, then upload the new one.
    const existing = currentBySlot.get(slot)
    try {
      if (existing) await deleteAttachment(existing.id)
      await uploadMut.mutateAsync({
        file,
        document_type: slot,
        entity_type: "crm_account",
        entity_id: accountId,
      })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : S.toast.docSaveFailed,
      )
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[15px] font-semibold tracking-tight">{S.documents.title}</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCOUNT_DOC_ALLOWED_MIMES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {S.documents.loading}
        </div>
      ) : listQuery.isError ? (
        <LoadErrorState error={listQuery.error} fallback={S.documents.loadError} />
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {ACCOUNT_DOC_TYPES.map((slot) => {
            const current = currentBySlot.get(slot)
            const busy =
              uploadMut.isPending &&
              uploadMut.variables?.document_type === slot
            return (
              <div key={slot} className="flex items-start gap-3 py-2">
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                  <FileText className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {ACCOUNT_DOC_LABELS[slot]}
                  </dt>
                  <dd className="mt-0.5 flex items-center gap-1.5">
                    {busy ? (
                      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        {S.documents.saving}
                      </span>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[13.5px]",
                            current
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {current ? current.document_name : S.documents.notUploaded}
                        </span>
                        {/* Preview — icon only; shown only when a file exists. */}
                        {current && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0"
                            onClick={() => setPreviewing(current)}
                            title={S.documents.preview}
                            aria-label={S.documents.previewFor(ACCOUNT_DOC_LABELS[slot])}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        )}
                        {/* Upload / replace — icon only. */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => pickFor(slot)}
                          title={current ? S.documents.replaceDocument : S.documents.uploadDocument}
                          aria-label={
                            current
                              ? S.documents.replaceFor(ACCOUNT_DOC_LABELS[slot])
                              : S.documents.uploadFor(ACCOUNT_DOC_LABELS[slot])
                          }
                        >
                          <Upload className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </dd>
                </div>
              </div>
            )
          })}
        </dl>
      )}

      <AccountDocumentPreviewDialog
        attachment={previewing}
        onOpenChange={(open) => {
          if (!open) setPreviewing(null)
        }}
      />
    </div>
  )
}

export { AccountDocumentsCard }
