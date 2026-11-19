import { useState } from "react";
import { Download, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { DateRangePicker } from "@/components/common/pickers/DateRangePicker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";

import type { InvoiceExportFormat } from "../../api/invoice-files";
import {
  useExportInvoices,
  useInvoiceRangePdfLoader,
} from "../../hooks/invoices/useInvoiceFiles";
import { PdfPreview } from "./PdfPreview";
import { fromRange, toRange } from "../../lib/dateRange";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

/** Base UI's `Select.Value` prints the raw VALUE unless the root is handed
 *  this map — without it the closed trigger read "json" while the open list
 *  read "Data (JSON)". One map also keeps the two in step. */
const FORMAT_LABELS: Record<InvoiceExportFormat, string> = {
  json: S.export.formats.json,
  xlsx: S.export.formats.xlsx,
  pdf: S.export.formats.pdf,
  line_items: S.export.formats.lineItems,
};

const FORMAT_HINTS: Record<InvoiceExportFormat, string> = {
  json: S.export.formats.jsonHint,
  xlsx: S.export.formats.xlsxHint,
  pdf: S.export.formats.pdfHint,
  line_items: S.export.formats.lineItemsHint,
};

export interface ExportInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportInvoicesDialog({
  open,
  onOpenChange,
}: ExportInvoicesDialogProps) {
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [format, setFormat] = useState<InvoiceExportFormat>("json");
  const exporter = useExportInvoices();
  const busy = exporter.isPending;
  const [previewOpen, setPreviewOpen] = useState(false);
  // Stable per window: the viewer refetches when the range moves, never on
  // an unrelated re-render.
  const loadRangePdf = useInvoiceRangePdfLoader(range.from, range.to);

  // Both ends are required — an open-ended window would export the whole
  // register, which is not what "between these dates" means.
  const ready = Boolean(range.from && range.to) && !busy;

  function handleExport() {
    if (!range.from || !range.to) {
      toast.error(S.export.needRange);
      return;
    }
    if (range.from > range.to) {
      // Caught here as well as server-side: the API 400s on this, but the
      // picker can produce it and a toast beats a failed request.
      toast.error(S.export.inverted);
      return;
    }
    exporter.mutate(
      { date_from: range.from, date_to: range.to, format },
      {
        onSuccess: (file) => {
          toast.success(S.export.done(file.filename));
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={S.export.title}
      description={S.export.description}
      // A picked date window and format are real input: closing via Esc,
      // the backdrop, the x or Cancel now prompts instead of discarding
      // silently. `OperationDialog` routes all four through one guard.
      isDirty={Boolean(range.from || range.to)}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={busy}>
            {C.cancel}
          </Button>
          <Button onClick={handleExport} disabled={!ready}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {busy ? S.export.exporting : S.export.submit}
          </Button>
        </>
      )}
    >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="export-range">{S.export.range}</Label>
            <DateRangePicker
              id="export-range"
              value={toRange(range)}
              onChange={(next) => setRange(fromRange(next))}
              placeholder={S.export.range}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="export-format">{S.export.format}</Label>
            <Select
              items={FORMAT_LABELS}
              value={format}
              onValueChange={(v) => setFormat(v as InvoiceExportFormat)}
            >
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(FORMAT_LABELS) as InvoiceExportFormat[]
                ).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Typography variant="helper" tone="muted">
              {FORMAT_HINTS[format]}
            </Typography>
          </div>

          {/* PDF only, and that is the whole point: this renders the same
              server-resolved documents `format=pdf` prints, so what is
              previewed IS what downloads. Offering it beside `json` or
              `xlsx` showed a rendered tax invoice and then handed over a
              Tally voucher or a spreadsheet — the preview would have been
              of a file the user was not getting. Those two formats say
              what they are in the hint above instead. */}
          <div className="min-w-0 space-y-2">
            {/* Same shape as the detail page's: label first, trailing icon,
                slashed while open. */}
            {/* Rendered conditionally, NOT via the `hidden` attribute:
                `Button` is `inline-flex` from its own class, which beats
                the user-agent `[hidden] { display: none }` — the button
                would have stayed on screen. */}
            {format === "pdf" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={!range.from || !range.to}
                onClick={() => setPreviewOpen((v) => !v)}
              >
                {S.preview.action}
                {previewOpen ? (
                  <EyeOff className="size-4" data-icon="inline-end" />
                ) : (
                  <Eye className="size-4" data-icon="inline-end" />
                )}
              </Button>
            ) : null}

            {/* Both ends, or the loader would ask the API for an open window. */}
            {previewOpen && format === "pdf" && range.from && range.to ? (
              // The REAL file, in the browser's own viewer — the same
              // `PdfPreview` the invoice detail page uses. It used to
              // render an HTML facsimile of the first three invoices,
              // which meant a second renderer for the same document and
              // a preview that stopped short of what you were about to
              // download. The viewer shows every page of the actual
              // export, so there is nothing left to cap.
              <div className="h-[60vh] min-h-0 overflow-hidden rounded-lg border border-border bg-muted">
                <PdfPreview
                  load={loadRangePdf}
                  title={S.preview.rangeFrameTitle}
                  className="size-full"
                />
              </div>
            ) : null}
          </div>
        </div>
    </OperationDialog>
  );
}

export default ExportInvoicesDialog;
