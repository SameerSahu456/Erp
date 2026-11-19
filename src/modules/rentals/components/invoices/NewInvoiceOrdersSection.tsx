import { FileText } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { RentalSalesOrderRow } from "../../api/sales-orders";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { BILLING_COMMON_STRINGS as B } from "../shared/billing-common.strings";
import { SectionHeader } from "../shared/SectionHeader";
import { OrderPickRow } from "./OrderPickRow";
import { RetryLoadError } from "../shared/RetryLoadError";

const O = S.newInvoice.orders;

interface OrdersSectionProps {
  hasAccount: boolean;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  rows: RentalSalesOrderRow[];
  selected: string[];
  skippedIds: readonly string[];
  onToggle: (id: string) => void;
}

function OrdersContent(p: OrdersSectionProps) {
  if (!p.hasAccount) return <EmptyState icon={FileText} title={O.chooseFirst} />;
  if (p.loading) return <Skeleton className="h-24 w-full" />;
  if (p.error) return <RetryLoadError error={p.error} fallback={B.salesOrdersLoadError} onRetry={p.onRetry} />;
  if (!p.rows.length) return <EmptyState icon={FileText} title={O.none} />;
  const picked = new Set(p.selected);
  const skipped = new Set(p.skippedIds);
  return (
    <ul className="space-y-2">
      {p.rows.map((row) => (
        <OrderPickRow
          key={row.sales_order_id}
          row={row}
          checked={picked.has(row.sales_order_id)}
          skipped={skipped.has(row.sales_order_id)}
          onToggle={p.onToggle}
        />
      ))}
    </ul>
  );
}

/** The picked account's configured orders, to choose which this invoice bills. */
export function NewInvoiceOrdersSection(props: OrdersSectionProps) {
  return (
    <Card>
      <SectionHeader icon={FileText} title={O.title} subtitle={O.subtitle} />
      <CardContent>
        <OrdersContent {...props} />
      </CardContent>
    </Card>
  );
}
