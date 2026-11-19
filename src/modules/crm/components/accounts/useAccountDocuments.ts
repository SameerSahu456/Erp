import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_MAX_BYTES,
  type AccountDocumentType,
} from "@/modules/crm/constants/account-documents"
import { useAuth } from "@shared/auth/use-auth"
import {
  deleteAttachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  type AttachmentWire,
} from "@modules/attachments"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

// All state + side-effects for the Account documents section, extracted so the
// component is a thin presenter (Coding-guideline §17). Owns the pick→upload
// flow (upload fires immediately on file select — no confirm step),
// replace-then-upload semantics, delete confirmation, and preview selection for
// the canonical doc slots (entity_type='crm_account').
export function useAccountDocuments(accountId: string) {
  const { user } = useAuth()
  const listQuery = useAttachments("crm_account", accountId)
  const uploadMut = useUploadAttachment()
  const deleteMut = useDeleteAttachment()

  const [pendingDelete, setPendingDelete] = useState<AttachmentWire | null>(null)
  const [previewing, setPreviewing] = useState<AttachmentWire | null>(null)

  // One hidden <input> shared by every row; `activeSlot` records which slot
  // the picker was opened for so the change handler routes the file home.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSlot, setActiveSlot] = useState<AccountDocumentType | null>(null)

  // Group attachments by document_type. Replace semantics keep ≤1 live row
  // per slot; if legacy history exists, the first entry is the current doc.
  const byType = useMemo(() => {
    const map = new Map<string, AttachmentWire[]>()
    for (const a of listQuery.data ?? []) {
      const arr = map.get(a.document_type) ?? []
      arr.push(a)
      map.set(a.document_type, arr)
    }
    return map
  }, [listQuery.data])

  function pickFor(slot: AccountDocumentType) {
    setActiveSlot(slot)
    fileInputRef.current?.click()
  }

  // Replace semantics: drop any active attachment(s) on this slot first so it
  // always holds exactly one current file. Old rows are soft-deleted
  // server-side, so DB history is preserved. The deletes go through the raw
  // `deleteAttachment` (not the mutation) so they don't each fire a "File
  // deleted" toast — the user only sees the upload's success toast.
  async function uploadToSlot(slot: AccountDocumentType, file: File) {
    const existing = byType.get(slot) ?? []
    try {
      for (const old of existing) {
        await deleteAttachment(old.id)
      }
      await uploadMut.mutateAsync({
        file,
        document_type: slot,
        entity_type: "crm_account",
        entity_id: accountId,
      })
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
      else toast.error(S.toast.docReplaceFailed)
    }
  }

  // Upload fires immediately on select — no separate confirm/upload click.
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
    await uploadToSlot(slot, file)
  }

  // Backend lets the uploader delete; superusers bypass. Mirror that so the
  // button doesn't appear for viewers who'd otherwise get a 403 on click.
  function canDelete(att: AttachmentWire): boolean {
    if (!user) return false
    if (user.is_superuser) return true
    return att.uploaded_by === user.id
  }

  async function handleConfirmDelete() {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    try {
      await deleteMut.mutateAsync({
        id: target.id,
        entityType: "crm_account",
        entityId: accountId,
      })
    } catch {
      /* hook handles toast */
    }
  }

  return {
    listQuery,
    byType,
    fileInputRef,
    handleFileChange,
    pickFor,
    uploadMut,
    deleteMut,
    canDelete,
    previewing,
    setPreviewing,
    pendingDelete,
    setPendingDelete,
    handleConfirmDelete,
  }
}
