import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { useSalesOrder } from "@modules/crm";

import type { LineRateTarget } from "../../api/sales-orders";
import { useRentalSalesOrderLineRateTargets } from "../../hooks/agreements/useRentalSalesOrders";
import { PoField } from "./PoDialogShell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const E = S.extend;

/** The distinct monthly rates a line's units sit at today, dearest first. */
function ratesOf(target: LineRateTarget): string {
  return target.unit_rates
    .map((group) => formatINR(Number(group.monthly_rate)))
    .join(", ");
}

interface PoLineRatesFieldsProps {
  salesOrderId: string;
  /** Typed rates keyed by `sales_order_item_id`; an absent or blank line
   *  keeps its rate. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}

/** Optional new rates for an Extend PO — one box per rental line, applied
 *  to every unit on it from the day after the current PO ends.
 *
 *  Whole-line only, unlike the order Extend dialog's per-unit picker: a new
 *  PO re-prices the contract, and the rate change goes for approval anyway.
 *  A line whose units sit on different rates today
 *  says so, because one figure is about to replace several. */
export function PoLineRatesFields({
  salesOrderId,
  value,
  onChange,
  disabled,
}: PoLineRatesFieldsProps) {
  const order = useSalesOrder(salesOrderId);
  const targets = useRentalSalesOrderLineRateTargets(salesOrderId, {
    enabled: true,
  });
  const lines = (order.data?.items ?? []).filter((line) => line.is_rental);
  const byLine = new Map(
    (targets.data ?? []).map((t) => [t.sales_order_item_id, t]),
  );
  if (lines.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Typography variant="body-strong">{E.ratesHeading}</Typography>
      <Typography variant="helper" tone="muted">
        {E.ratesHelp}
      </Typography>
      {lines.map((line) => {
        const target = byLine.get(line.id);
        const typed = (value[line.id] ?? "").trim();
        const diverged = (target?.unit_rates.length ?? 0) > 1;
        return (
          <div key={line.id} className="min-w-0 space-y-1">
            <PoField
              label={line.item_name}
              htmlFor={`po-rate-${line.id}`}
              help={
                target
                  ? E.unitsAt(target.units_on_rent, ratesOf(target))
                  : undefined
              }
            >
              <Input
                id={`po-rate-${line.id}`}
                inputMode="decimal"
                placeholder={E.unchanged}
                value={value[line.id] ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...value, [line.id]: e.target.value })
                }
              />
            </PoField>
            {typed !== "" && diverged ? (
              <Typography variant="helper" tone="warning">
                {E.flattenWarning}
              </Typography>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
