import { toast } from "sonner"

import { useUploadAttachment } from "@modules/attachments"

import { SALES_RETURN_DOC_TYPES } from "../../constants/sales-return-status"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "../../components/sales-return-requests/sales-return-requests.strings"
import { useDispatchStagedDocs } from "../dispatches/useDispatchStagedDocs"

/** Shipping documents picked on the raise form, uploaded once the return exists. */
export function useSalesReturnStagedDocs() {
  const docs = useDispatchStagedDocs(SALES_RETURN_DOC_TYPES[0].value)
  const upload = useUploadAttachment()

  // A failed file doesn't undo the return; it can be added on the return's page.
  async function uploadTo(sretId: string) {
    if (docs.stagedDocs.length === 0) return
    const results = await Promise.allSettled(
      docs.stagedDocs.map((d) =>
        upload.mutateAsync({
          file: d.file,
          document_type: d.document_type,
          entity_type: "sales_return_requests",
          entity_id: sretId,
          silent: true,
        }),
      ),
    )
    if (results.some((r) => r.status === "rejected")) toast.error(S.form.docsUploadPartial)
  }

  return { ...docs, uploadTo }
}

export type SalesReturnStagedDocs = ReturnType<typeof useSalesReturnStagedDocs>
