import { Eye, FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import type { DispatchDocRow } from "./DispatchDocumentsField";
import { DISPATCH_DOCUMENTS_STRINGS as D } from "./dispatch-documents.strings";

// Show ~5 rows before the list scrolls internally.
const SCROLL_AFTER = 5;

interface DispatchDocumentsListProps {
  rows: DispatchDocRow[];
  editable: boolean;
  loading: boolean;
  labelFor: (value: string) => string;
  onRemove: (row: DispatchDocRow) => void;
}

/** Uploaded documents — shown below the type picker; scrolls internally past
 *  five rows. */
export function DispatchDocumentsList({
  rows,
  editable,
  loading,
  labelFor,
  onRemove,
}: DispatchDocumentsListProps) {
  if (loading) {
    return <div className="h-12 animate-pulse rounded-md bg-muted" />;
  }
  if (rows.length === 0) {
    return editable ? null : (
      <Typography variant="body" tone="muted">
        {D.noDocs}
      </Typography>
    );
  }
  return (
    <ul
      className={cn(
        "space-y-2",
        rows.length > SCROLL_AFTER && "max-h-80 overflow-y-auto pr-1",
      )}
    >
      {rows.map((row) => (
        <DispatchDocumentItem
          key={row.key}
          row={row}
          editable={editable}
          typeLabel={labelFor(row.documentType)}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}

interface DispatchDocumentItemProps {
  row: DispatchDocRow;
  editable: boolean;
  typeLabel: string;
  onRemove: (row: DispatchDocRow) => void;
}

function DispatchDocumentItem({
  row,
  editable,
  typeLabel,
  onRemove,
}: DispatchDocumentItemProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0">
          <Typography variant="body-strong" truncate className="min-w-0">
            {row.name}
          </Typography>
          <Typography variant="helper" tone="muted">
            {typeLabel}
          </Typography>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={row.onView}>
          <Eye className="size-4" data-icon="inline-start" />
          {D.view}
        </Button>
        {editable && (
          <ConfirmDialog
            title={D.removeTitle}
            description={D.removeDesc(row.name)}
            confirmLabel={D.removeConfirm}
            cancelLabel={D.cancel}
            variant="destructive"
            onConfirm={() => onRemove(row)}
            trigger={
              <Button variant="outline" size="sm" aria-label={D.remove}>
                <X className="size-4" />
              </Button>
            }
          />
        )}
      </div>
    </li>
  );
}
