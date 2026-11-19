import { useState } from "react";

import type { FilePreviewTarget } from "@modules/attachments";
import type { DispatchDocRow } from "../../components/dispatches/DispatchDocumentsField";
import { DISPATCH_DOC_TYPES } from "../../components/dispatches/dispatch-detail.strings";
import type { StagedDoc } from "../../components/dispatches/dispatch-create-helpers";

/** Documents staged on the create form — uploaded once the dispatch exists. */
export function useDispatchStagedDocs(initialDocType: string = DISPATCH_DOC_TYPES[0].value) {
  const [docType, setDocType] = useState<string>(initialDocType);
  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([]);
  // In-app preview target, null when the dialog is closed.
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);

  // Append newly dropped files under the currently-selected document type.
  const addDocs = (files: File[]) =>
    setStagedDocs((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        document_type: docType,
      })),
    ]);
  const removeDocById = (id: string) =>
    setStagedDocs((prev) => prev.filter((d) => d.id !== id));
  // Preview a staged (not-yet-uploaded) file in-app — its real name
  // shows in the dialog title, not a blob id.
  const viewDoc = (file: File) =>
    setPreview({ name: file.name, contentType: file.type, file });
  const docRows: DispatchDocRow[] = stagedDocs.map((d) => ({
    key: d.id,
    name: d.file.name,
    documentType: d.document_type,
    onView: () => viewDoc(d.file),
  }));

  return {
    docType,
    setDocType,
    stagedDocs,
    docRows,
    addDocs,
    removeDocById,
    preview,
    closePreview: () => setPreview(null),
  };
}

export type DispatchStagedDocsState = ReturnType<typeof useDispatchStagedDocs>;
