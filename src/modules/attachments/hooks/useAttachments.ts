import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  deleteAttachment,
  downloadAttachmentBlob,
  fetchAttachments,
  uploadAttachment,
  type UploadAttachmentArgs,
} from "../api"
import type { AttachmentWire, EntityType } from "../types"

// Top-level cache namespace for the shared attachments router. Sub-keys are
// [entity_type, entity_id] so per-entity lists invalidate independently.
const ATTACHMENTS_KEY = ["attachments"] as const

export function attachmentsListKey(entityType: EntityType, entityId: string) {
  return [...ATTACHMENTS_KEY, entityType, entityId] as const
}

interface UseAttachmentsOptions {
  enabled?: boolean
}

export function useAttachments(
  entityType: EntityType,
  entityId: string | null | undefined,
  options?: UseAttachmentsOptions,
) {
  return useQuery({
    queryKey: attachmentsListKey(entityType, entityId ?? ""),
    queryFn: () =>
      fetchAttachments({ entity_type: entityType, entity_id: entityId as string }),
    enabled: !!entityId && (options?.enabled ?? true),
  })
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation<AttachmentWire, Error, UploadAttachmentArgs>({
    mutationFn: uploadAttachment,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: attachmentsListKey(vars.entity_type, vars.entity_id),
      })
      // A loop uploader (e.g. the stage-complete dialogs) passes `silent` and
      // shows one summary toast after the batch, so we don't spam one per file.
      if (!vars.silent) toast.success("File uploaded")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload file")
    },
  })
}

interface DeleteAttachmentVars {
  id: string
  entityType: EntityType
  entityId: string
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation<void, Error, DeleteAttachmentVars>({
    mutationFn: ({ id }) => deleteAttachment(id),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: attachmentsListKey(vars.entityType, vars.entityId),
      })
      toast.success("File deleted")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete file")
    },
  })
}

// Convenience wrapper around the blob-download helper for components that
// want to render a "Download" button without managing the async themselves.
// Toasts the error path; resolves silently on success.
export async function triggerAttachmentDownload(
  attachment: Pick<AttachmentWire, "id" | "document_name" | "content_type">,
): Promise<void> {
  try {
    await downloadAttachmentBlob(attachment)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to download file"
    toast.error(message)
  }
}
