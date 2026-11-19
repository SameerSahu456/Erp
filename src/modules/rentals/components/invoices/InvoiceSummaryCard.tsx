import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalInvoiceDetail } from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { invoiceDay } from "./invoice-detail-helpers";

const D = S.invoices.detail;

/** One label/value pair in the details grid (a `<dt>/<dd>`). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt>
        <Typography variant="helper" tone="muted">
          {label}
        </Typography>
      </dt>
      <dd className="mt-0.5">
        <Typography variant="body-strong" className="break-words">
          {children}
        </Typography>
      </dd>
    </div>
  );
}

/** The orders the invoice bills — several when consolidated, each a link. */
function OrderLinks({ invoice }: { invoice: RentalInvoiceDetail }) {
  const orders = invoice.sales_orders;
  if (orders.length === 0) return EMPTY_VALUE;
  return (
    <span className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
      {orders.map((order, i) => (
        <span key={order.id} className="min-w-0">
          <Link
            // The rental Agreement page (keyed by the sales order id), not CRM's.
            to={`/rentals/agreements/${order.id}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {order.order_number ?? EMPTY_VALUE}
          </Link>
          {i < orders.length - 1 ? S.detail.orderSeparator : ""}
        </span>
      ))}
    </span>
  );
}

/** Account, orders, period, dates and the total (full precision — it is
 *  reconciled to the rupee). */
export function InvoiceSummaryCard({ invoice }: { invoice: RentalInvoiceDetail }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <CardTitle>{D.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={D.account}>{invoice.account ?? EMPTY_VALUE}</Field>
          <Field label={D.salesOrder}>
            <OrderLinks invoice={invoice} />
          </Field>
          <Field label={D.period}>
            {S.detail.periodRange(invoiceDay(invoice.period_start), invoiceDay(invoice.period_end))}
          </Field>
          <Field label={D.issueDate}>{invoiceDay(invoice.issue_date)}</Field>
          <Field label={D.dueDate}>{invoiceDay(invoice.due_date)}</Field>
          <Field label={D.total}>{formatINR(Number(invoice.total))}</Field>
        </dl>
      </CardContent>
    </Card>
  );
}
