import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/common/files/FileUpload";

import { WMS_ATTACHMENT_MAX } from "../../constants/attachment-limits";
import { capAttachmentBatch } from "../../hooks/attachments/useAttachmentUpload";
import { DispatchDocumentsList } from "./DispatchDocumentsList";
import { DISPATCH_DOC_TYPES } from "./dispatch-detail.strings";
import { DISPATCH_DOCUMENTS_STRINGS as D } from "./dispatch-documents.strings";

// Same accept/size contract on both surfaces (mirrors the backend document
// bucket in attachment_policy.py): PDF / JPG / PNG, 20 MB per file.
const DOC_MIMES = ["application/pdf", "image/jpeg", "image/png"] as const;
const DOC_ACCEPT = DOC_MIMES.join(",");
const DOC_MAX_BYTES = 20 * 1024 * 1024;

/** One document row to render — a staged File (form) or a saved attachment
 *  (detail); the parent supplies a stable key, the display name, its type, and
 *  the view/remove actions so this field stays presentation-only. */
export interface DispatchDocRow {
  key: string;
  name: string;
  documentType: string;
  onView: () => void;
}

interface DispatchDocumentsFieldProps {
  /** The document-type options this field offers. Defaults to the dispatch set;
   *  warehouse transfers pass their own (challan / e-way / POD, no invoice — a
   *  transfer between our own warehouses is not a sale, spec D15). */
  docTypes?: readonly { value: string; label: string }[];
  /** Selected document type for the NEXT upload. */
  docType: string;
  onDocTypeChange: (value: string) => void;
  rows: DispatchDocRow[];
  /** Validated files to add (accept + size already checked here). */
  onAddFiles: (files: File[]) => void;
  onRemove: (row: DispatchDocRow) => void;
  /** Edit surfaces expose the picker/upload/remove; read-only (e.g. a cancelled
   *  dispatch) shows a view-only list. */
  editable?: boolean;
  /** The list is still loading (detail page). */
  loading?: boolean;
  /** An upload is in flight (detail page). */
  uploading?: boolean;
  /** Max documents this entity accepts across ALL slots — one shared bucket
   *  quota on the backend. Defaults to the dispatch/transfer/GRN cap. */
  maxCount?: number;
  /** Always the compact "Upload" button beside the type picker, never the big
   *  empty-state dropzone (the warehouse-transfer Attachments card). */
  compact?: boolean;
}

/** Shared WMS documents field. Empty + editable → the big dropzone (the
 *  default). Once a document exists the dropzone collapses to an "Upload" button
 *  beside the type picker, and the list scrolls internally past five rows. Used
 *  by the dispatch create form + detail page AND the warehouse-transfer detail
 *  (which passes its own `docTypes`) so every surface reads identically. */
export function DispatchDocumentsField({
  docTypes = DISPATCH_DOC_TYPES,
  docType,
  onDocTypeChange,
  rows,
  onAddFiles,
  onRemove,
  editable = true,
  loading = false,
  uploading = false,
  maxCount = WMS_ATTACHMENT_MAX.dispatchDoc,
  compact = false,
}: DispatchDocumentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasDocs = rows.length > 0;
  const showButton = hasDocs || compact;
  const labelFor = (value: string) =>
    docTypes.find((d) => d.value === value)?.label ?? value;

  // Enforce the backend's per-entity count cap up front — every document_type
  // here shares ONE bucket quota, so `rows` (all current docs) is the count to
  // check. `capAttachmentBatch` (the shared upload rules) accepts only up to the
  // remaining slots and toasts once, so no doomed POST 422s (which the upload
  // hook would toast per file). Both entry points — the dropzone and the
  // "Upload" button — funnel through here.
  function capThenEmit(files: File[]) {
    const accepted = capAttachmentBatch({
      files,
      currentCount: rows.length,
      limit: maxCount,
      copy: D,
    });
    if (accepted.length > 0) onAddFiles(accepted);
  }

  // Validate the "Upload" button's picked files the same way FileUpload does
  // for the dropzone, so both entry points reject bad types / oversized files.
  function acceptFiles(files: File[]) {
    const ok: File[] = [];
    for (const f of files) {
      if (!DOC_MIMES.includes(f.type as (typeof DOC_MIMES)[number])) {
        toast.error(D.badType(f.name));
      } else if (f.size > DOC_MAX_BYTES) {
        toast.error(D.tooBig(f.name));
      } else {
        ok.push(f);
      }
    }
    if (ok.length > 0) capThenEmit(ok);
  }

  return (
    <div className="space-y-3">
      {editable && (
        <>
          {/* Type picker + (once documents exist) a compact Upload button that
              replaces the big dropzone. */}
          <div className="flex items-end gap-3">
            <div className="grid flex-1 gap-1.5 sm:max-w-xs">
              <Label>{D.docType}</Label>
              <Select
                value={docType}
                onValueChange={(v) => v && onDocTypeChange(v)}
              >
                <SelectTrigger className="w-full" clearable={false}>
                  <SelectValue>{labelFor(docType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showButton && (
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="size-4" data-icon="inline-start" />
                {uploading ? D.uploading : D.upload}
              </Button>
            )}
          </div>

          {/* Empty state: the big dropzone (validates accept + size itself). */}
          {!showButton && (
            <FileUpload
              accept={DOC_ACCEPT}
              maxSize={DOC_MAX_BYTES}
              multiple
              value={[]}
              onChange={capThenEmit}
            />
          )}

          {/* Hidden input driven by the Upload button (add-more path). */}
          <input
            ref={inputRef}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (picked.length > 0) acceptFiles(picked);
            }}
          />
        </>
      )}

      <DispatchDocumentsList
        rows={rows}
        editable={editable}
        loading={loading}
        labelFor={labelFor}
        onRemove={onRemove}
      />
    </div>
  );
}
