import { useState } from "react";

import {
  FilePreviewDialog,
  useAttachments,
  useDeleteAttachment,
  type AttachmentWire,
  type FilePreviewTarget,
} from "@modules/attachments";

import { useAttachmentUpload } from "../../hooks/attachments/useAttachmentUpload";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";
import {
  DispatchDocumentsField,
  type DispatchDocRow,
} from "./DispatchDocumentsField";

/** Dispatch-request documents on the detail page. A thin adapter over the shared
 *  {@link DispatchDocumentsField}: maps saved attachments to rows and wires the
 *  view / upload / delete handlers. `editable` is false only for a terminal
 *  (cancelled) dispatch, which then renders a view-only list. */
export function DispatchAttachmentsSection({
  dispatchId,
  editable = false,
}: {
  dispatchId: string;
  editable?: boolean;
}) {
  const listQ = useAttachments("dispatch_requests", dispatchId);
  const { runUpload, isUploading } = useAttachmentUpload("dispatch_requests");
  const deleteMut = useDeleteAttachment();
  const [docType, setDocType] = useState<string>("invoice");
  // The file being previewed in-app, or null when the dialog is shut.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);

  const attachments = listQ.data ?? [];

  function view(att: AttachmentWire) {
    setPreview({ name: att.document_name, contentType: att.content_type, wire: att });
  }

  async function handleFiles(picked: File[]) {
    // The count cap is enforced by DispatchDocumentsField before files reach
    // here; `runUpload` uploads silently and fires ONE summary toast (per-file
    // errors still surface individually).
    await runUpload(picked, {
      entityId: dispatchId,
      documentType: docType,
      summary: S.docsUploaded,
    });
  }

  const rows: DispatchDocRow[] = attachments.map((att) => ({
    key: att.id,
    name: att.document_name,
    documentType: att.document_type,
    onView: () => void view(att),
  }));

  return (
    <>
      <DispatchDocumentsField
        docType={docType}
        onDocTypeChange={setDocType}
        rows={rows}
        onAddFiles={handleFiles}
        onRemove={(row) =>
          deleteMut.mutate({
            id: row.key,
            entityType: "dispatch_requests",
            entityId: dispatchId,
          })
        }
        editable={editable}
        loading={listQ.isLoading}
        uploading={isUploading}
      />
      <FilePreviewDialog
        target={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    </>
  );
}
