import { cn } from "@/lib/utils";

import { isOverCapacity, ratioPct, TONE, utilTone } from "./locationModel";
import { LOCATIONS_STRINGS } from "./locations.strings";

interface OccupancyBarProps {
  occupied: number;
  capacity: number;
  /** Track height in px. */
  height?: number;
  /** One colour at any fill, red only when over capacity. Otherwise the fill
   *  escalates with utilisation (neutral → green → brass → red). */
  solid?: boolean;
  className?: string;
}

/** A thin occupancy meter. */
export function OccupancyBar({
  occupied,
  capacity,
  height = 6,
  solid = false,
  className,
}: OccupancyBarProps) {
  const pct = ratioPct(occupied, capacity);
  const toneBar = TONE[utilTone(occupied, capacity)].bar;
  const solidBar = isOverCapacity(occupied, capacity) ? "bg-destructive" : "bg-info";
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={LOCATIONS_STRINGS.rackTable.slotsFilledAria(occupied, capacity)}
      className={cn("w-full overflow-hidden rounded-full bg-muted", className)}
      style={{ height }}
    >
      <div
        className={cn("h-full rounded-full", solid ? solidBar : toneBar)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}
