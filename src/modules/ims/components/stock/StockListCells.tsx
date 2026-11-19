import { Link } from "react-router-dom";

import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";

import { formatINR } from "../../lib/format";
import { EditablePriceCell } from "./EditablePriceCell";
import { PriceChangeMarker } from "./PriceChangeMarker";
import { STOCK_STRINGS } from "./stock.strings";
import { conditionVariant } from "./stock-body-helpers";
import { stockRowHref } from "./stock-list.columns";

type Row = Record<string, unknown>;

/** A plain em dash reads better than a blank cell, which looks like a failure. */
export function StockEmptyCell() {
  return (
    <Typography asChild variant="body" tone="muted">
      <span>{STOCK_STRINGS.emptyCell}</span>
    </Typography>
  );
}

export function StockTextCell({ value }: { value: unknown }) {
  return (
    <Typography asChild variant="body">
      <span>{String(value)}</span>
    </Typography>
  );
}

/** Alias pills with "+N" overflow, matching the Parts listing. */
export function StockAliasesCell({ aliases }: { aliases: string[] | undefined }) {
  return (
    <OverflowPillList
      items={aliases ?? []}
      getItemKey={(a) => String(a)}
      getItemLabel={(a) => String(a)}
      size="default"
      summaryLabel={STOCK_STRINGS.columns.aliases}
      hoverTitle={STOCK_STRINGS.columns.aliases}
      emptyLabel={STOCK_STRINGS.emptyCell}
    />
  );
}

export function StockDescriptionCell({ value }: { value: unknown }) {
  if (!value) return <StockEmptyCell />;
  return <TruncatedText value={String(value)} className="max-w-full text-muted-foreground" />;
}

export function StockNameCell({ row, value }: { row: Row; value: string }) {
  const href = stockRowHref(row);
  if (!href) {
    return (
      <Typography asChild variant="body-strong" tone="inherit">
        <span>{value}</span>
      </Typography>
    );
  }
  return (
    <Typography asChild variant="body-strong" tone="primary">
      <Link to={href} className="hover:underline">
        {value}
      </Link>
    </Typography>
  );
}

export function StockConditionCell({ value }: { value: unknown }) {
  return <StatusBadge variant={conditionVariant(value as string)}>{String(value)}</StatusBadge>;
}

export function StockCountCell({ value }: { value: unknown }) {
  if (value == null) return <StockEmptyCell />;
  return (
    <Typography asChild variant="body" tone="inherit" numeric>
      <span>{String(value)}</span>
    </Typography>
  );
}

// Per-row `__canEditPrice` is the backend's resolved price_write + PM scope;
// the change marker shows on both paths.
export function StockPriceCell({ row, value }: { row: Row; value: unknown }) {
  if (value == null || typeof value !== "number") return <StockEmptyCell />;
  const variantId = (row.__variantId as string | undefined) ?? (row._id as string);
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {row.__canEditPrice ? (
        <EditablePriceCell variantId={variantId} value={value} />
      ) : (
        <Typography asChild variant="body-strong" tone="inherit" numeric>
          <span>{formatINR(value)}</span>
        </Typography>
      )}
      <PriceChangeMarker row={row} />
    </span>
  );
}
