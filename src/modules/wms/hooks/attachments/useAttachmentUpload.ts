import { useCallback } from "react"
import { toast } from "sonner"

import { useUploadAttachment, type EntityType } from "@modules/attachments"

import { WMS_ATTACHMENT_MAX } from "../../constants/attachment-limits"

/**
 * Single source of truth for WMS attachment upload behaviour — the count limit,
 * the client-side cap, and the toast rules — so every upload surface behaves
 * identically and a limit change lands everywhere at once.
 *
 * Why a hook (+ a pure helper) rather than a bare constant: the *number* already
 * lives in one place (`WMS_ATTACHMENT_MAX`), but the CONDITIONS around it (how we
 * count against it, how we toast a partial/blocked batch, how we upload N files
 * with ONE success toast) were duplicated across ~7 components. This centralises
 * them, and `attachmentLimit()` is the seam to later swap the static value for a
 * server-driven policy (a `useQuery` here) without touching a single call site.
 */

// entity_type -> max files it accepts across ALL document_type slots. Every WMS
// entity declares exactly ONE MIME bucket on the backend, so all its slots share
// this one quota (see attachment-limits.ts). Change a value there and it flows to
// every consumer through this resolver.
const ENTITY_LIMIT: Partial<Record<EntityType, number>> = {
  grn_batches: WMS_ATTACHMENT_MAX.dispatchDoc,
  dispatch_requests: WMS_ATTACHMENT_MAX.dispatchDoc,
  warehouse_transfers: WMS_ATTACHMENT_MAX.dispatchDoc,
  sales_return_requests: WMS_ATTACHMENT_MAX.dispatchDoc,
  warehouse_operations: WMS_ATTACHMENT_MAX.operationPhoto,
}

/** The max number of files `entityType` accepts (its shared bucket quota). */
export function attachmentLimit(entityType: EntityType): number {
  return ENTITY_LIMIT[entityType] ?? WMS_ATTACHMENT_MAX.dispatchDoc
}

/** Copy for the count-limit toasts. Each surface passes its own co-located
 *  strings (§16.12) so the message reads in that surface's voice. */
export interface CapCopy {
  /** Shown when the entity is already at the cap — nothing can be added. */
  maxReached: (max: number) => string
  /** Shown when only some of the picked files fit — `dropped` were not added. */
  limitPartial: (max: number, dropped: number) => string
}

/**
 * Cap a freshly-picked batch against the remaining quota. Pure (no React) so it
 * works for both live uploads and staged buffering. Toasts once when the batch
 * is blocked or trimmed, then returns only the files that fit — never fire a
 * doomed upload that the backend 422s once per file.
 */
export function capAttachmentBatch({
  files,
  currentCount,
  limit,
  copy,
}: {
  files: File[]
  /** How many already count against this entity's bucket (ALL slots combined). */
  currentCount: number
  limit: number
  copy: CapCopy
}): File[] {
  if (files.length === 0) return []
  const remaining = limit - currentCount
  if (remaining <= 0) {
    toast.error(copy.maxReached(limit))
    return []
  }
  if (files.length > remaining) {
    toast.error(copy.limitPartial(limit, files.length - remaining))
    return files.slice(0, remaining)
  }
  return files
}

interface RunUploadOptions {
  entityId: string
  documentType: string
  /** One aggregate success message for the whole batch, given the count that
   *  actually uploaded (e.g. `(n) => n === 1 ? "Photo uploaded" : \`${n} photos…\`). */
  summary: (uploaded: number) => string
}

/**
 * WMS attachment upload hook. Exposes the entity's `limit` and a `runUpload`
 * that uploads an ALREADY-CAPPED batch with the two toast rules baked in:
 *   • success  → the per-file toast is silenced (`silent: true`); ONE summary
 *                toast fires for the count that succeeded.
 *   • error    → each failed file still toasts individually (the shared upload
 *                hook's `onError`, which `silent` does not suppress).
 *
 * Cap the batch with {@link capAttachmentBatch} (using `limit`) before calling
 * `runUpload`, or use it directly where the picker already capped.
 */
export function useAttachmentUpload(entityType: EntityType) {
  const upload = useUploadAttachment()
  const limit = attachmentLimit(entityType)

  const runUpload = useCallback(
    async (files: File[], { entityId, documentType, summary }: RunUploadOptions): Promise<number> => {
      let uploaded = 0
      for (const file of files) {
        try {
          await upload.mutateAsync({
            file,
            document_type: documentType,
            entity_type: entityType,
            entity_id: entityId,
            silent: true,
          })
          uploaded += 1
        } catch {
          // The shared hook's onError already toasted this file's failure.
        }
      }
      if (uploaded > 0) toast.success(summary(uploaded))
      return uploaded
    },
    [upload, entityType],
  )

  return { limit, runUpload, isUploading: upload.isPending }
}
