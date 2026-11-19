import type { ReactNode } from "react";

import type { ToolbarFilter } from "@/components/common/tables/BusinessMetricsTable";

export interface FilterBarItem {
  key: string;
  /** True while this control narrows the list — BMT's empty state reads it
   *  to offer "Clear filters". */
  active: boolean;
  node: ReactNode;
}

/**
 * A rentals list's whole filter bar, as BusinessMetricsTable `toolbarFilters`.
 *
 * Every control renders through the toolbar's `render` escape hatch, in the
 * order given (search first, date range last), so the bar is built from the
 * rentals filter components alone and BMT's own search / dropdowns / date
 * picker — sized for other modules — are not used. The page passes
 * `searchable={false}` and no `dateRange`, and resets everything in
 * `onClearFilters`.
 */
export function filterBar(items: readonly FilterBarItem[]): ToolbarFilter[] {
  return items.map((item) => ({
    key: item.key,
    label: item.key,
    value: item.active ? "active" : "",
    options: [],
    render: () => item.node,
  }));
}
