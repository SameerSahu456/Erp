import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";

import type { RentalInvoiceLine } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { SectionHeader } from "../shared/SectionHeader";
import type { InvoiceTotals } from "./new-invoice-helpers";
import { PreviewLinesTable } from "./PreviewLinesTable";
import { PreviewTotals } from "./PreviewTotals";
import { RetryLoadError } from "../shared/RetryLoadError";

const L = S.newInvoice.lines;

interface LinesSectionProps {
  pricing: boolean;
  error: unknown;
  onRetry: () => void;
  lines: readonly RentalInvoiceLine[];
  totals: InvoiceTotals;
}

function LinesContent(p: LinesSectionProps) {
  if (p.pricing) return <Skeleton className="h-32 w-full" />;
  if (p.error) return <RetryLoadError error={p.error} fallback={L.failed} onRetry={p.onRetry} />;
  if (!p.lines.length) return <EmptyState icon={ListChecks} title={L.empty} />;
  return (
    <>
      <PreviewLinesTable lines={p.lines} />
      <Typography variant="helper" tone="muted">
        {L.help}
      </Typography>
      <PreviewTotals totals={p.totals} />
    </>
  );
}

/** What the engine would charge for the picked orders — never typed here. */
export function NewInvoiceLinesSection(props: LinesSectionProps) {
  return (
    <Card>
      <SectionHeader icon={ListChecks} title={L.title} subtitle={L.subtitle} />
      <CardContent className="space-y-4">
        <LinesContent {...props} />
      </CardContent>
    </Card>
  );
}
