import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { istTodayDateParam } from "@shared/lib/date";
import { usePermission } from "@shared/rbac";

import type {
  PoInvoicing,
  RentalOrderPurchaseOrders,
} from "../../api/purchase-orders";
import {
  PO_INVOICING_LABELS,
  PO_INVOICING_MODES,
} from "../../constants/billing";
import { useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { estimateRent, unbilledFrom } from "../../lib/poEstimate";
import { formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { PoField } from "./PoDialogShell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const E = S.extend;

/** What the catch-up will raise, in one line — so choosing Single (which
 *  bills the whole new PO at once) is never a blind default. */
function previewLine(
  invoicing: PoInvoicing,
  from: string,
  validTo: string,
  runRate: number,
): string {
  const today = istTodayDateParam();
  if (invoicing === "single") {
    if (!validTo) return "";
    return E.previewSingle(
      formatRentalDay(from),
      formatRentalDay(validTo),
      formatINR(estimateRent(runRate, from, validTo)),
    );
  }
  if (from > today) return E.previewMultipleNothing;
  return E.previewMultiple(
    formatRentalDay(from),
    formatINR(estimateRent(runRate, from, today)),
  );
}

interface PoInvoicingFieldProps {
  salesOrderId: string;
  orderPos: RentalOrderPurchaseOrders;
  value: PoInvoicing;
  onChange: (next: PoInvoicing) => void;
  validTo: string;
  ratesChanged: boolean;
}

/** Single or Multiple for this PO, pre-filled from the order's setting.
 *
 *  Accounts' call (they charge the customer): only a holder of
 *  `rentals:configure` may change it — the backend refuses anyone else
 *  with `PO_INVOICING_ACCOUNTS_ONLY`, and everyone else sees it read-only. */
export function PoInvoicingField({
  salesOrderId,
  orderPos,
  value,
  onChange,
  validTo,
  ratesChanged,
}: PoInvoicingFieldProps) {
  const { canAny } = usePermission();
  const canChoose = canAny(rentalsCan.configure);
  const billing = useRentalSalesOrderBilling(salesOrderId);
  const start = billing.data?.config?.start_date ?? null;
  const from = start
    ? unbilledFrom(orderPos.last_billed_date ?? null, start)
    : null;
  const preview = from
    ? previewLine(value, from, validTo, Number(orderPos.monthly_run_rate))
    : "";

  return (
    <PoField
      label={E.invoicing}
      htmlFor="po-extend-invoicing"
      help={E.invoicingHelp}
    >
      {canChoose ? (
        <Select
          items={PO_INVOICING_LABELS}
          value={value}
          onValueChange={(v) => v && onChange(v as PoInvoicing)}
        >
          <SelectTrigger id="po-extend-invoicing" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PO_INVOICING_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {PO_INVOICING_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Typography variant="body" id="po-extend-invoicing">
          {E.invoicingFixed(PO_INVOICING_LABELS[value])}
        </Typography>
      )}
      {preview ? (
        <Typography variant="helper" tone="info">
          {E.previewWithNote(preview, ratesChanged)}
        </Typography>
      ) : null}
    </PoField>
  );
}
