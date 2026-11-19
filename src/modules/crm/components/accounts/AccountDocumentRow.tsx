import { Download, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import {
  ACCOUNT_DOC_LABELS,
  type AccountDocumentType,
} from "@/modules/crm/constants/account-documents"
import { formatIST_date } from "@shared/lib/date"
import type { AttachmentWire } from "@modules/attachments"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AccountDocumentRowActions {
  onPick: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}

interface AccountDocumentRowProps {
  slot: AccountDocumentType
  current?: AttachmentWire
  busy: boolean
  canDelete: boolean
  actions: AccountDocumentRowActions
}

// One canonical document slot (PAN / GST / Aadhaar / MSME / Bank statement).
// Selecting a file uploads (or replaces) it immediately — there is no staged
// "pending" step or separate upload panel. Pure presenter.
export function AccountDocumentRow({
  slot,
  current,
  busy,
  canDelete,
  actions,
}: AccountDocumentRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-border bg-card p-3">
      {/* Slot icon — tinted when a document is on record. */}
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          current ? "bg-primary/10 text-primary" : "bg-secondary/70 text-muted-foreground",
        )}
      >
        <FileText className="size-4" strokeWidth={2} />
      </span>

      {/* Label + status line */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-tight">{ACCOUNT_DOC_LABELS[slot]}</p>
        {busy ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {S.documents.working}
          </span>
        ) : current ? (
          <Typography variant="helper" truncate className="mt-0.5">
            {current.document_name} · {formatBytes(current.size_bytes)} · {S.documents.uploaded}{" "}
            {formatIST_date(current.created_at)}
          </Typography>
        ) : (
          <span className="mt-0.5 block text-xs italic text-muted-foreground/70">
            {S.documents.notUploaded}
          </span>
        )}
      </div>

      {/* Actions — adapt to the slot's state, all in this one row. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {current ? (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={actions.onPreview}
              title={S.documents.preview}
              aria-label={S.documents.previewFor(ACCOUNT_DOC_LABELS[slot])}
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={actions.onDownload}
              title={S.documents.download}
              aria-label={S.documents.downloadFor(ACCOUNT_DOC_LABELS[slot])}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={actions.onPick}
              disabled={busy}
              title={S.documents.replaceDocument}
              aria-label={S.documents.replaceFor(ACCOUNT_DOC_LABELS[slot])}
            >
              <Upload className="size-3.5" />
            </Button>
            {canDelete && (
              <Button
                variant="danger-light"
                size="icon-sm"
                onClick={actions.onDelete}
                disabled={busy}
                title={S.documents.delete}
                aria-label={S.documents.deleteFor(ACCOUNT_DOC_LABELS[slot])}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={actions.onPick} disabled={busy}>
            <Upload className="mr-1 size-3.5" />
            {S.documents.chooseFile}
          </Button>
        )}
      </div>
    </li>
  )
}
