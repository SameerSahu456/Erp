import { cn } from "@/lib/utils";
import { TableSearchInput } from "@/components/common/tables/TableSearchInput";
import { useMirroredValue } from "@/shared/hooks";

import { RENTALS_SEARCH_WIDTH } from "./filter-tokens";

/**
 * The rentals list search box: the shared `TableSearchInput`, at the rentals
 * filter height (32px) and the one rentals search width.
 *
 * The height is set from the wrapper (`[&_input]:…`) rather than by changing
 * `TableSearchInput`, which other modules use at its own 36px. Runs on local
 * state so typing mid-string never bounces the caret while the value is owned
 * upstream (`useMirroredValue`, as BusinessMetricsTable's own search does).
 */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  clearAriaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  clearAriaLabel?: string;
}) {
  const [text, setText] = useMirroredValue(value, onChange);
  return (
    <TableSearchInput
      value={text}
      onChange={setText}
      placeholder={placeholder}
      clearAriaLabel={clearAriaLabel}
      className={cn(RENTALS_SEARCH_WIDTH, "[&_input]:h-8 [&_input]:rounded-[5px] [&_input]:text-[13px]")}
    />
  );
}
