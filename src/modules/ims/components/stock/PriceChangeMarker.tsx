import { ArrowDown, ArrowUp } from "lucide-react";

import { formatINR } from "../../lib/format";
import { formatIST } from "@shared/lib/date";
import { cn } from "@/lib/utils";
import { STOCK_STRINGS } from "./stock.strings";

// Small arrow beside a price that has been changed at least once, with the
// previous value and change date on hover.
//
// `previous_price` is redacted alongside `sell_price`, so this renders
// nothing for callers without `ims:price_read` — the same payload-shape
// signal that governs the column itself.
export function PriceChangeMarker({ row }: { row: Record<string, unknown> }) {
  const previous = row.__previousPrice as string | null | undefined;
  const changedAt = row.__priceChangedAt as string | null | undefined;
  if (previous == null || changedAt == null) return null;

  const previousValue = Number(previous);
  const currentValue = Number(row.price);
  if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue))
    return null;
  if (previousValue === currentValue) return null;

  const rose = currentValue > previousValue;
  const Icon = rose ? ArrowUp : ArrowDown;
  const label = rose
    ? STOCK_STRINGS.priceChange.increased
    : STOCK_STRINGS.priceChange.decreased;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        rose ? "text-success" : "text-destructive",
      )}
      title={`${label} — ${STOCK_STRINGS.priceChange.wasPrefix} ${formatINR(previousValue)} ${STOCK_STRINGS.priceChange.onPrefix} ${formatIST(changedAt)}`}
      aria-label={label}
    >
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  );
}
