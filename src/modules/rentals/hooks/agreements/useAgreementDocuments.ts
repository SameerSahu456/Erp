import { toast } from "sonner";

import { useAttachments, useDeleteAttachment, useUploadAttachment } from "@modules/attachments";

import { AGREEMENTS_HOOKS_STRINGS as S } from "./agreements-hooks.strings";

/** Filed against the AGREEMENT, not a signature row — one scan carries every
 *  party's signature. */
const ENTITY_TYPE = "rental_agreements" as const;
const DOCUMENT_TYPE = "signed_agreement";

/** The agreement's signed documents: list, upload, remove. Errors surface
 *  once, through the attachments hooks' own `onError`. */
export function useAgreementDocuments(agreementId: string) {
  const documents = useAttachments(ENTITY_TYPE, agreementId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();

  return {
    files: documents.data ?? [],
    isLoading: documents.isLoading,
    uploading: upload.isPending,
    removing: remove.isPending,
    upload(file: File) {
      upload.mutate(
        { file, document_type: DOCUMENT_TYPE, entity_type: ENTITY_TYPE, entity_id: agreementId, silent: true },
        { onSuccess: () => toast.success(S.documentUploaded) },
      );
    },
    remove(id: string) {
      remove.mutate({ id, entityType: ENTITY_TYPE, entityId: agreementId });
    },
  };
}
