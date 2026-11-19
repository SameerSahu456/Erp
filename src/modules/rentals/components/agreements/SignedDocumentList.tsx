import { FileCheck2, FileText, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import type { AttachmentWire, FilePreviewTarget } from "@modules/attachments";

import { AGREEMENTS_STRINGS } from "./agreements.strings";

const S = AGREEMENTS_STRINGS.agreement.signatures;

interface SignedDocumentListProps {
  files: readonly AttachmentWire[];
  removing: boolean;
  onPreview: (target: FilePreviewTarget) => void;
  /** Omitted for a viewer without the paperwork grant: the list is then
   *  read-only, with no trash button to 403 on. */
  onRemove?: (id: string) => void;
}

/** The uploaded signed documents, each previewable and — with the grant —
 *  removable. */
export function SignedDocumentList({ files, removing, onPreview, onRemove }: SignedDocumentListProps) {
  if (files.length === 0) return <EmptyState icon={FileText} title={S.documentEmpty} className="py-6" />;
  return (
    <ul className="space-y-1">
      {files.map((file) => (
        <li key={file.id} className="flex min-w-0 items-center gap-2">
          <FileCheck2 className="size-4 shrink-0 text-success" />
          <Button
            variant="link"
            size="sm"
            className="min-w-0 flex-1 justify-start truncate p-0"
            onClick={() => onPreview({ name: file.document_name, contentType: file.content_type, wire: file })}
          >
            {file.document_name}
          </Button>
          {onRemove ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label={S.remove}
              disabled={removing}
              onClick={() => onRemove(file.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
