import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RENTALS_FILTER_CONTROL, RENTALS_FILTER_WIDTH } from "./filter-tokens";

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  /** The filter's NAME ("Order status"), shown as a muted placeholder while
   *  nothing is picked — not as an "All …" value. */
  placeholder: string;
  /** The picked value; `undefined`, `""` or `"__all__"` mean no filter. */
  value: string | undefined;
  options: readonly FilterSelectOption[];
  /** `undefined` = no filter (the × on the trigger). */
  onChange: (next: string | undefined) => void;
}

/**
 * The single-choice filter on every rentals list.
 *
 * Empty, it shows the filter's name as a placeholder; the list holds only
 * real choices (no "All …" row) and the × clears. Fixed width so the row
 * never grows; a long value truncates with "…", full text on hover. The × is
 * wired to `onChange(undefined)` explicitly — a hand-rolled filter that
 * dropped the Select wrapper's `null` was why the × once did nothing.
 */
export function FilterSelect({ placeholder, value, options, onChange }: FilterSelectProps) {
  const hasValue = !!value && value !== "__all__";
  const selectedLabel = hasValue
    ? (options.find((o) => o.value === value)?.label ?? value)
    : undefined;

  return (
    <Select
      value={hasValue ? value : null}
      onValueChange={(next) => onChange(next == null || next === "__all__" ? undefined : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label={placeholder}
        // `Select` sizes itself through `data-[size=…]`, so the shared
        // geometry is restated under that selector to win.
        className={cn(
          RENTALS_FILTER_WIDTH,
          RENTALS_FILTER_CONTROL,
          "data-[size=sm]:h-8 data-[size=sm]:rounded-[5px]",
        )}
        clearable={hasValue}
        onClear={() => onChange(undefined)}
      >
        <SelectValue>
          {/* The value element is display:flex, which defeats line-clamp; a
              truncating span restores the ellipsis. */}
          <span
            className={cn("min-w-0 flex-1 truncate", !hasValue && "text-muted-foreground")}
            title={selectedLabel ?? placeholder}
          >
            {selectedLabel ?? placeholder}
          </span>
        </SelectValue>
      </SelectTrigger>
      {/* The popup widens to its longest option; no check mark — it overlaps
          long labels, and the trigger already shows the selection. */}
      <SelectContent className="w-fit min-w-(--anchor-width) max-w-[320px]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} hideIndicator title={o.label}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
