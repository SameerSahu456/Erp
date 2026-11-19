import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";

import type { RentalInvoiceRow } from "../../api/invoices";
import { EarlyExitChargesCard } from "../early-exit/EarlyExitChargesCard";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";
import { ListRowsSkeleton } from "./ListRowsSkeleton";

const I = S.agreement.invoices;

interface AgreementInvoicesTabProps {
  salesOrderId: string;
  rows: readonly RentalInvoiceRow[];
  isLoading: boolean;
  error: unknown;
}

/** An invoice preview plus the early-exit charges, which ride the next invoice. */
export function AgreementInvoicesTab({ salesOrderId, rows, isLoading, error }: AgreementInvoicesTabProps) {
  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{I.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <ListRowsSkeleton />
          ) : error ? (
            <LoadErrorState error={error} fallback={C.loadError} compact />
          ) : rows.length === 0 ? (
            <EmptyState icon={Receipt} title={I.empty} className="py-6" />
          ) : (
            <ul className="divide-y">
              {rows.map((invoice) => (
                <li key={invoice.id} className="flex min-w-0 items-center gap-3 py-2">
                  <Typography variant="body" className="min-w-0 flex-1 truncate" asChild>
                    <Link to={`/rentals/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoice_number}
                    </Link>
                  </Typography>
                  <Typography variant="body" className="shrink-0" asChild>
                    <span>{formatINR(Number(invoice.total))}</span>
                  </Typography>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" size="sm" className="p-0" render={<Link to={`/rentals/invoices?so=${salesOrderId}`} />}>
            {I.viewAll}
          </Button>
        </CardContent>
      </Card>
      <EarlyExitChargesCard salesOrderId={salesOrderId} />
    </div>
  );
}
