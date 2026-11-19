import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Typography } from "@/components/ui/typography"
import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_TYPES,
} from "@/modules/crm/constants/account-documents"
import { triggerAttachmentDownload } from "@modules/attachments"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountDocumentPreviewDialog } from "./AccountDocumentPreviewDialog"
import { AccountDocumentRow } from "./AccountDocumentRow"
import { useAccountDocuments } from "./useAccountDocuments"

interface AccountDocumentsSectionProps {
  accountId: string
}

// Documents section for an Account (edit mode). One unified row per canonical
// doc slot (PAN / GST / Aadhaar / MSME / Bank statement) — see AccountDocumentRow.
// All upload/replace/delete/preview state lives in useAccountDocuments.
// Backed by the shared attachments router (entity_type='crm_account').
function AccountDocumentsSection({ accountId }: AccountDocumentsSectionProps) {
  const docs = useAccountDocuments(accountId)
  const { listQuery, byType, uploadMut, deleteMut } = docs

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {S.documents.loading}
      </div>
    )
  }
  if (listQuery.isError) {
    return (
      <LoadErrorState error={listQuery.error} fallback={S.documents.loadError} />
    )
  }

  return (
    <div className="space-y-3">
      <Typography variant="helper" asChild>
        <p>
          {S.documents.sectionHint}
        </p>
      </Typography>

      {/* Shared hidden picker — `activeSlot` (in the hook) routes the file. */}
      <input
        ref={docs.fileInputRef}
        type="file"
        accept={ACCOUNT_DOC_ALLOWED_MIMES.join(",")}
        className="hidden"
        onChange={docs.handleFileChange}
      />

      <ul className="space-y-2.5">
        {ACCOUNT_DOC_TYPES.map((slot) => {
          const existing = byType.get(slot) ?? []
          const current = existing[0]
          const busy =
            (uploadMut.isPending && uploadMut.variables?.document_type === slot) ||
            (deleteMut.isPending && existing.some((a) => a.id === deleteMut.variables?.id))

          return (
            <AccountDocumentRow
              key={slot}
              slot={slot}
              current={current}
              busy={busy}
              canDelete={!!current && docs.canDelete(current)}
              actions={{
                onPick: () => docs.pickFor(slot),
                onPreview: () => current && docs.setPreviewing(current),
                onDownload: () => {
                  if (current) void triggerAttachmentDownload(current)
                },
                onDelete: () => current && docs.setPendingDelete(current),
              }}
            />
          )
        })}
      </ul>

      <AlertDialog
        open={docs.pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) docs.setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{S.documents.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {docs.pendingDelete
                ? S.documents.deleteConfirm(docs.pendingDelete.document_name)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>{S.documents.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                void docs.handleConfirmDelete()
              }}
              disabled={deleteMut.isPending}
            >
              {S.documents.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccountDocumentPreviewDialog
        attachment={docs.previewing}
        onOpenChange={(open) => {
          if (!open) docs.setPreviewing(null)
        }}
      />
    </div>
  )
}

export { AccountDocumentsSection }
