import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAttachment,
  fetchAttachments,
  uploadAttachment,
  type Attachment,
  type AttachmentEntityType,
  type UploadAttachmentParams,
} from "@shared/api/attachments";

const KEY = ["attachments"] as const;

function attachmentsKey(
  entityType: AttachmentEntityType,
  entityId: string,
): readonly unknown[] {
  return [...KEY, entityType, entityId] as const;
}

export function useAttachments(
  entityType: AttachmentEntityType,
  entityId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<Attachment[]>({
    queryKey: attachmentsKey(entityType, entityId),
    queryFn: () => fetchAttachments({ entity_type: entityType, entity_id: entityId }),
    enabled: (options?.enabled ?? true) && !!entityId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: UploadAttachmentParams) => uploadAttachment(params),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: attachmentsKey(variables.entity_type, variables.entity_id),
      });
    },
  });
}

export function useDeleteAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: attachmentsKey(entityType, entityId) });
    },
  });
}
