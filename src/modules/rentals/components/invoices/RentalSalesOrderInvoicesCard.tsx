import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { usePermission } from "@shared/rbac";

import { rentalsCan } from "../../permissions";
import { useRentalInvoices } from "../../hooks/invoices/useRentalInvoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { RetryLoadError } from "../shared/RetryLoadError";
import { SoInvoicesTable } from "./SoInvoicesTable";

const SO = S.soInvoices;

/** Invoices the card lists before deferring to the register — a summary on
 *  a busy page, not a replacement for it. Also the page size asked for. */
const SHOWN = 12;

export interface RentalSalesOrderInvoicesCardProps {
  salesOrderId: string;
  /** The CRM sales order's `sellable_type`. Only a rental order raises
   *  rental invoices — a plain sale has none, so the card hides. */
  sellableType: string;
}

function CardFrame({ viewAll, children }: { viewAll?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            {SO.cardTitle}
          </CardTitle>
          <Typography variant="helper" tone="muted">
            {SO.subtitle}
          </Typography>
        </div>
        {viewAll ? <CardAction>{viewAll}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** The "Invoices" card on the sales-order detail page — every invoice raised
 *  against this order, newest first, voids included. */
export function RentalSalesOrderInvoicesCard({ salesOrderId, sellableType }: RentalSalesOrderInvoicesCardProps) {
  const isRental = sellableType === "rental_sales";
  // The register is gated on `rentals:read`; a CRM user without it gets
  // the order without this card rather than a card that can only 403.
  const canView = usePermission().canAny(rentalsCan.view);
  // Gated: a non-rental order must not fetch the register at all (§6.9).
  const query = useRentalInvoices(
    { sales_order_id: salesOrderId, page_size: SHOWN, include_deleted: true },
    { enabled: isRental && canView },
  );
  if (!isRental || !canView) return null;

  if (query.isLoading) {
    return (
      <CardFrame>
        <Skeleton className="h-24 w-full" />
      </CardFrame>
    );
  }
  if (!query.data) {
    return (
      <CardFrame>
        <RetryLoadError error={query.error} fallback={SO.loadError} onRetry={() => void query.refetch()} />
      </CardFrame>
    );
  }
  const { items, total } = query.data;
  const viewAll =
    total > items.length ? (
      <Typography variant="helper" tone="primary" asChild>
        <Link to={`/rentals/invoices?so=${salesOrderId}`} className="underline-offset-2 hover:underline">
          {SO.viewAll(total)}
        </Link>
      </Typography>
    ) : undefined;

  return (
    <CardFrame viewAll={viewAll}>
      {items.length === 0 ? <EmptyState icon={FileText} title={SO.empty} /> : <SoInvoicesTable items={items} />}
    </CardFrame>
  );
}

export default RentalSalesOrderInvoicesCard;
