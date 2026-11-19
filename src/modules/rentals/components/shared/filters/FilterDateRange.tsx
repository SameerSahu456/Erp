import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/common/pickers/DateRangePicker";

import { fromRange, toRange } from "../../../lib/dateRange";
import { RENTALS_DATE_RANGE_WIDTH, RENTALS_FILTER_CONTROL } from "./filter-tokens";

/**
 * The rentals date-range filter: the shared `DateRangePicker` at the rentals
 * filter geometry, with its name as a muted placeholder while empty (the
 * picker's own placeholder is full-strength; the class here overrides it
 * for rentals only). Applies once the end is picked, as the toolbar's
 * built-in date filter does.
 */
export function FilterDateRange({
  value,
  onChange,
  placeholder,
  disableFuture,
}: {
  value: { from?: string; to?: string };
  onChange: (next: { from?: string; to?: string }) => void;
  placeholder: string;
  disableFuture?: boolean;
}) {
  const empty = !value.from && !value.to;
  return (
    <div className={RENTALS_DATE_RANGE_WIDTH}>
      <DateRangePicker
        value={toRange(value)}
        onChange={(next) => onChange(fromRange(next))}
        placeholder={placeholder}
        disableFuture={disableFuture}
        commitOnComplete
        className={cn(RENTALS_FILTER_CONTROL, empty && "text-muted-foreground")}
      />
    </div>
  );
}
