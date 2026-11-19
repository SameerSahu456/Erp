import { useState } from "react";
import { Link } from "react-router-dom";
import { ReceiptText } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { usePermission } from "@shared/rbac";

import type { CreditNote } from "../../api/credit-notes";
import type { RentalInvoiceLine } from "../../api/invoices";
import { useCreditNotes } from "../../hooks/invoices/useCreditNotes";
import { formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { RecordCreditNoteDialog } from "./RecordCreditNoteDialog";
import { RetryLoadError } from "../shared/RetryLoadError";

const C = S.invoices.creditNotes;

interface InvoiceCreditNotesCardProps {
  invoiceId: string;
  lines: RentalInvoiceLine[];
  /** A voided invoice takes no credit — there is nothing left to credit. */
  voided: boolean;
}

function CreditNoteItem({ note }: { note: CreditNote }) {
  return (
    <li className="flex min-w-0 items-start gap-3 py-2">
      <div className="min-w-0 flex-1 space-y-0.5">
        {/* Opens the credit note's own page. */}
        <Link to={`/rentals/credit-notes/${note.id}`} className="block min-w-0 hover:underline">
          <Typography variant="mono" truncate className="min-w-0">
            {note.cn_number ?? C.notIssued}
          </Typography>
        </Link>
        <Typography variant="helper" tone="muted" className="[overflow-wrap:anywhere]">
          {S.creditNotes.noteMeta(formatRentalDay(note.cn_date), note.reason)}
        </Typography>
      </div>
      <Typography variant="body-strong" className="shrink-0">
        {formatINR(Number(note.amount))}
      </Typography>
    </li>
  );
}

function CreditNotesContent({ query }: { query: ReturnType<typeof useCreditNotes> }) {
  if (query.isLoading) return <Skeleton className="h-16 w-full" />;
  if (query.isError) {
    return <RetryLoadError error={query.error} fallback={C.loadError} onRetry={() => void query.refetch()} compact />;
  }
  const rows = query.data ?? [];
  if (rows.length === 0) return <EmptyState icon={ReceiptText} title={C.sectionEmpty} className="py-6" />;
  return (
    <ul className="divide-y">
      {rows.map((note) => (
        <CreditNoteItem key={note.id} note={note} />
      ))}
    </ul>
  );
}

/** The credit notes recorded against one invoice, and the Record action
 *  (accounts — `rentals:credit_note_create`). */
export function InvoiceCreditNotesCard({ invoiceId, lines, voided }: InvoiceCreditNotesCardProps) {
  const notes = useCreditNotes(invoiceId);
  const { canAny } = usePermission();
  const [recording, setRecording] = useState(false);
  const canRecord = !voided && lines.length > 0 && canAny(rentalsCan.createCreditNote);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle>{C.sectionTitle}</CardTitle>
          <CardDescription>{C.sectionDescription}</CardDescription>
        </div>
        {canRecord ? (
          <Button size="sm" variant="outline" onClick={() => setRecording(true)}>
            <ReceiptText className="size-4" />
            {C.record}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <CreditNotesContent query={notes} />
      </CardContent>
      {recording ? (
        <RecordCreditNoteDialog invoiceId={invoiceId} lines={lines} onClose={() => setRecording(false)} />
      ) : null}
    </Card>
  );
}
