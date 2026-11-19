import type { UseQueryResult } from "@tanstack/react-query";
import { Box, Grid2x2, Layers, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatCount } from "@/lib/currency";
import { cn } from "@/lib/utils";

import type { WarehouseStorageSummary as Summary } from "../../api";
import { formatSharePct } from "../locations/locationModel";
import { WAREHOUSE_LOCATIONS_STRINGS as S } from "./warehouse-locations.strings";

const DONUT_SIZE = 120;
const DONUT_STROKE = 14;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CENTRE = DONUT_SIZE / 2;
const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;

/** A rack or bin count: the card's hue is a full border plus a tinted icon tile. */
function CountCard({
  icon: Icon,
  label,
  value,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <Typography variant="body-lg" tone="muted" className="font-semibold" truncate>
          {label}
        </Typography>
        <span
          className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", iconClassName)}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <Typography variant="kpi-value" className="mt-1">
        {formatCount(value)}
      </Typography>
    </div>
  );
}

function CapacityDonut({ occupied, capacity }: { occupied: number; capacity: number }) {
  const share = formatSharePct(occupied, capacity);
  const filled = capacity > 0 ? Math.min(occupied / capacity, 1) : 0;
  return (
    <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
      <svg
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        role="img"
        aria-label={S.summary.donutAria(share)}
        className="size-full"
      >
        <circle
          cx={DONUT_CENTRE}
          cy={DONUT_CENTRE}
          r={DONUT_RADIUS}
          fill="none"
          strokeWidth={DONUT_STROKE}
          className="stroke-muted-foreground/15"
        />
        <circle
          cx={DONUT_CENTRE}
          cy={DONUT_CENTRE}
          r={DONUT_RADIUS}
          fill="none"
          strokeWidth={DONUT_STROKE}
          strokeDasharray={`${DONUT_LENGTH * filled} ${DONUT_LENGTH}`}
          transform={`rotate(-90 ${DONUT_CENTRE} ${DONUT_CENTRE})`}
          className="stroke-info"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Typography variant="kpi-value-sm">{share}</Typography>
        <Typography variant="helper" tone="muted">
          {S.summary.utilisation}
        </Typography>
      </div>
    </div>
  );
}

function LegendItem({
  dotClassName,
  value,
  label,
}: {
  dotClassName: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClassName)} />
      <div className="min-w-0">
        <Typography variant="kpi-value-xs" className="font-semibold">
          {formatCount(value)}
        </Typography>
        <Typography variant="helper" tone="muted" className="block">
          {label}
        </Typography>
      </div>
    </div>
  );
}

export function WarehouseStorageSummarySkeleton() {
  return <Skeleton className="h-[152px] w-full rounded-xl" />;
}

/** Rack and bin counts beside how full the warehouse's slots are. */
export function WarehouseStorageSummary({ summary }: { summary: Summary }) {
  const { total_capacity: capacity, total_occupancy: occupied } = summary;
  return (
    // Two equal halves once the card is wide enough (container query): the counts on the
    // left, utilisation on the right. Stacked below that.
    <div className="@container rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 items-center gap-4 @min-[900px]:grid-cols-2 @min-[900px]:gap-10">
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-3 @md:gap-5">
          <CountCard
            icon={Grid2x2}
            label={S.summary.racks}
            // rack_count includes pallets (racks that store stock directly); they get their own card.
            value={summary.rack_count - summary.pallet_count}
            className="border-warning"
            iconClassName="bg-warning/10 text-warning"
          />
          <CountCard
            icon={Box}
            label={S.summary.bins}
            value={summary.bin_count}
            className="border-violet"
            iconClassName="bg-violet/10 text-violet"
          />
          <CountCard
            icon={Layers}
            label={S.summary.pallets}
            value={summary.pallet_count}
            className="border-success"
            iconClassName="bg-success/10 text-success"
          />
        </div>
        <div className="flex items-center gap-5">
          <CapacityDonut occupied={occupied} capacity={capacity} />
          <div className="flex min-w-0 flex-col gap-2">
            <LegendItem dotClassName="bg-info" value={occupied} label={S.summary.occupiedSlots} />
            <LegendItem
              dotClassName="bg-muted-foreground/25"
              value={capacity}
              label={S.summary.totalSlots}
            />
            <LegendItem
              dotClassName="bg-success"
              value={Math.max(capacity - occupied, 0)}
              label={S.summary.availableSlots}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The summary's loading, error and loaded states; nothing once a warehouse has no racks. */
export function WarehouseStorageSummaryPanel({
  query,
}: {
  query: Pick<UseQueryResult<Summary>, "isLoading" | "isError" | "data" | "refetch">;
}) {
  if (query.isLoading) return <WarehouseStorageSummarySkeleton />;
  if (query.isError) return <WarehouseStorageSummaryError onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.rack_count === 0) return null;
  return <WarehouseStorageSummary summary={query.data} />;
}

export function WarehouseStorageSummaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={Layers}
      title={S.summary.errorTitle}
      description={S.summary.errorDescription}
      action={{ label: S.states.retry, onClick: onRetry }}
    />
  );
}
