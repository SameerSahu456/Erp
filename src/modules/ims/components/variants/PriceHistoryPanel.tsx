import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";
import { Typography } from "@/components/ui/typography";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { formatIST } from "@shared/lib/date";
import { cn } from "@/lib/utils";

import { usePriceHistory } from "../../hooks/parts/usePrice";
import { formatINR } from "../../lib/format";
import { VARIANTS_STRINGS } from "./variants.strings";

const PH = VARIANTS_STRINGS.priceHistory;

// Append-only price-change trail for one variant, newest first.
//
// Every `PATCH /variants/{id}/price` writes a `price_history` row in the same
// transaction as the `sell_price` UPDATE, so this is a complete record — not a
// sample. `sell_price` is absent from `PartVariantUpdate`, so no edit path can
// change a price without landing here.
//
// The endpoint is gated on `ims:price_read`. Warehouse roles get a 403, which
// is an expected outcome rather than a failure: the panel renders nothing at
// all instead of an error state.
export function PriceHistoryPanel({ variantId }: { variantId: string }) {
  const { data, isLoading, isError } = usePriceHistory(variantId);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  // Treat any failure as "not visible to you". The only expected error is the
  // 403 a non-price-reader gets, and surfacing that as a broken panel would be
  // misleading — they aren't meant to see this at all.
  if (isError) return null;

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState title={PH.empty.title} description={PH.empty.description} />
    );
  }

  const columns: TabConfig["columns"] = [
    { key: "changedBy", label: PH.columns.by },
    { key: "when", label: PH.columns.when },
    { key: "from", label: PH.columns.from },
    { key: "to", label: PH.columns.to },
    { key: "change", label: PH.columns.change },
    { key: "notes", label: PH.columns.notes },
  ];
  // `old_price` is null on the first price a variant is given (no "from", so no
  // delta). `delta_amount` / `delta_pct` come from the server — recomputing here
  // would be a second source of truth for the same arithmetic.
  const rows = items.map((row) => ({
    id: row.id,
    changedBy: row.changed_by_name ?? PH.emptyCell,
    when: row.created_at,
    from: row.old_price == null ? null : Number(row.old_price),
    to: Number(row.new_price),
    delta: row.delta_amount == null ? null : Number(row.delta_amount),
    deltaPct: row.delta_pct == null ? null : Number(row.delta_pct),
    notes: row.notes,
  }));
  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "changedBy") {
      return { display: <Typography variant="body">{String(value)}</Typography> };
    }
    if (key === "when") {
      // All timestamps render in IST via the shared helper.
      return {
        display: <Typography variant="body">{formatIST(String(value))}</Typography>,
      };
    }
    if (key === "from") {
      const from = value as number | null;
      return {
        display: (
          <Typography
            variant="body"
            numeric
            tone={from == null ? "muted" : undefined}
          >
            {from == null ? PH.firstPrice : formatINR(from)}
          </Typography>
        ),
      };
    }
    if (key === "to") {
      return {
        display: (
          <Typography variant="body-strong" numeric>
            {formatINR(Number(value))}
          </Typography>
        ),
      };
    }
    if (key === "change") {
      const delta = row.delta as number | null;
      const deltaPct = row.deltaPct as number | null;
      if (delta == null) {
        return {
          display: (
            <Typography variant="body" tone="muted">
              {PH.emptyCell}
            </Typography>
          ),
        };
      }
      const direction = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
      const DirectionIcon =
        direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
      return {
        display: (
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              direction === "up" && "text-success",
              direction === "down" && "text-destructive",
              direction === "flat" && "text-muted-foreground",
            )}
          >
            <DirectionIcon className="h-3.5 w-3.5" aria-hidden />
            <Typography variant="body">
              {formatINR(Math.abs(delta))}
              {deltaPct == null ? "" : ` (${Math.abs(deltaPct).toFixed(1)}%)`}
            </Typography>
          </span>
        ),
      };
    }
    if (key === "notes") {
      const notes = value as string | null;
      return {
        display: notes ? (
          <TruncatedText value={notes} className="text-foreground" />
        ) : (
          <Typography variant="body" tone="muted">
            {PH.emptyCell}
          </Typography>
        ),
      };
    }
    return null;
  };

  return (
    <BusinessMetricsTable
      showIndex
      hidePagination
      tabs={[{ id: "price-history", label: PH.tabLabel, columns, data: rows }]}
      activeTab="price-history"
      cellFormatter={cellFormatter}
    />
  );
}
