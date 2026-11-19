import { useState } from "react";
import { Paperclip } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import {
  FilePreviewDialog,
  useAttachments,
  useDeleteAttachment,
  type AttachmentWire,
  type EntityType,
  type FilePreviewTarget,
} from "@modules/attachments";

import { useAttachmentUpload } from "../../hooks/attachments/useAttachmentUpload";
import {
  DispatchDocumentsField,
  type DispatchDocRow,
} from "../dispatches/DispatchDocumentsField";

interface EntityDocumentsCardProps {
  entityType: EntityType;
  entityId: string;
  /** The document types this record takes. The first is picked by default. */
  docTypes: readonly { value: string; label: string }[];
  title: string;
  /** One toast for a batch: per-file success is silenced, per-file errors still show. */
  uploadedSummary: (uploaded: number) => string;
  /** Upload and remove; off shows the list only. */
  editable?: boolean;
  /** Muted count beside the title (e.g. "1 file"); omitted → no count. */
  countLabel?: (count: number) => string;
  /** Upload button instead of the empty-state dropzone. */
  compact?: boolean;
}

/**
 * A record's saved documents, rendered through the shared WMS documents field
 * ({@link DispatchDocumentsField}) so every documents card reads the same.
 */
export function EntityDocumentsCard({
  entityType,
  entityId,
  docTypes,
  title,
  uploadedSummary,
  editable = true,
  countLabel,
  compact = false,
}: EntityDocumentsCardProps) {
  const list = useAttachments(entityType, entityId);
  const { runUpload, isUploading } = useAttachmentUpload(entityType);
  const remove = useDeleteAttachment();
  const [docType, setDocType] = useState<string>(docTypes[0]?.value ?? "");
  // In-app preview target, null when the dialog is closed.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);

  function view(doc: AttachmentWire) {
    setPreview({ name: doc.document_name, contentType: doc.content_type, wire: doc });
  }

  async function addFiles(files: File[]) {
    // The count cap is enforced by DispatchDocumentsField before files reach here.
    await runUpload(files, { entityId, documentType: docType, summary: uploadedSummary });
  }

  const rows: DispatchDocRow[] = (list.data ?? []).map((doc) => ({
    key: doc.id,
    name: doc.document_name,
    documentType: doc.document_type,
    onView: () => void view(doc),
  }));

  return (
    <Card>
      <CardHeader>
        {/* Icon inside the title, like the Logistics card, so both sit on the left. */}
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4 text-primary" />
          {title}
          {countLabel && rows.length > 0 && (
            <Typography variant="helper" tone="muted" asChild>
              <span>{countLabel(rows.length)}</span>
            </Typography>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DispatchDocumentsField
          docTypes={docTypes}
          docType={docType}
          onDocTypeChange={setDocType}
          rows={rows}
          onAddFiles={(files) => void addFiles(files)}
          onRemove={(row) => remove.mutate({ id: row.key, entityType, entityId })}
          editable={editable}
          compact={compact}
          loading={list.isLoading}
          uploading={isUploading}
        />
      </CardContent>
      <FilePreviewDialog
        target={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    </Card>
  );
}
