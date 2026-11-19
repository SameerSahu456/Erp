import { useState } from "react";
import { FileCheck2, Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  FilePreviewDialog,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  type FilePreviewTarget,
} from "@modules/attachments";

import { PO_DOCUMENT } from "../../constants/billing";
import { useRefreshOrderPurchaseOrderDocuments } from "../../hooks/purchase-orders/usePurchaseOrders";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const DOC = S.document;
/** One PO row = one paper. Filed against the PO row so each extension
 *  keeps its own document. */
const ENTITY_TYPE = PO_DOCUMENT.entityType;
const DOCUMENT_TYPE = PO_DOCUMENT.documentType;
const ACCEPT = PO_DOCUMENT.accept;

interface PoDocumentCellProps {
  purchaseOrderId: string;
  canEdit: boolean;
}

/** The customer's PO document for one PO row: open it, attach it, or
 *  remove it. */
export function PoDocumentCell({
  purchaseOrderId,
  canEdit,
}: PoDocumentCellProps) {
  const files = useAttachments(ENTITY_TYPE, purchaseOrderId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();
  // The order's Attachments section lists PO papers too.
  const refreshOrderDocuments = useRefreshOrderPurchaseOrderDocuments();
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);
  const items = files.data ?? [];

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared first: re-picking the same file fires no change event, so a
    // failed upload could not otherwise be retried.
    event.target.value = "";
    if (!file) return;
    upload.mutate(
      {
        file,
        document_type: DOCUMENT_TYPE,
        entity_type: ENTITY_TYPE,
        entity_id: purchaseOrderId,
        silent: true,
      },
      // Errors surface once, from the hook's own onError toast.
      {
        onSuccess: () => {
          toast.success(DOC.uploaded);
          refreshOrderDocuments();
        },
      },
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {items.length === 0 && !canEdit ? (
        <Typography variant="helper" tone="muted">
          {DOC.none}
        </Typography>
      ) : null}
      {items.map((file) => (
        <div key={file.id} className="flex min-w-0 items-center gap-1">
          <FileCheck2 className="size-4 shrink-0 text-success" />
          <Button
            variant="link"
            size="sm"
            className="min-w-0 flex-1 justify-start truncate p-0"
            onClick={() =>
              setPreview({
                name: file.document_name,
                contentType: file.content_type,
                wire: file,
              })
            }
          >
            {file.document_name}
          </Button>
          {canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label={DOC.remove}
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(
                  {
                    id: file.id,
                    entityType: ENTITY_TYPE,
                    entityId: purchaseOrderId,
                  },
                  { onSuccess: refreshOrderDocuments },
                )
              }
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}
      {canEdit && items.length === 0 ? (
        <label className="inline-flex">
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPick}
            disabled={upload.isPending}
          />
          <Button
            variant="outline"
            size="sm"
            render={<span />}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
            {upload.isPending ? DOC.uploading : DOC.upload}
          </Button>
        </label>
      ) : null}
      <FilePreviewDialog
        target={preview}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
      />
    </div>
  );
}
