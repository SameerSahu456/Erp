import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { useReturnableUnitFilter } from "../../hooks/purchase-returns/useReturnableUnitFilter";
import {
  PURCHASE_RETURN_STRINGS as S,
  RETURNABLE_UNIT_STATUS_LABELS,
} from "./purchase-returns.strings";

type UnitFilter = ReturnType<typeof useReturnableUnitFilter>;

/** Line-item search + status filter. */
export function ReturnableUnitToolbar({
  filter,
  totalCount,
}: {
  filter: UnitFilter;
  totalCount: number;
}) {
  const { search, setSearch, statusFilter, setStatusFilter } = filter;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* Search with a clear (×) button, mirroring the Inward devices search.
          The × shows only once there's text and empties the box. */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={S.table.searchPlaceholder}
          className="h-9 w-full min-w-0 pl-9 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={S.table.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Select
        value={statusFilter || "__all__"}
        onValueChange={(v) => setStatusFilter(!v || v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-9 w-48">
          <SelectValue>
            {statusFilter
              ? (RETURNABLE_UNIT_STATUS_LABELS[statusFilter] ?? statusFilter)
              : S.table.allStatuses}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{S.table.allStatuses}</SelectItem>
          {filter.statusOptions.map((st) => (
            <SelectItem key={st} value={st}>
              {RETURNABLE_UNIT_STATUS_LABELS[st] ?? st}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Typography variant="helper" tone="muted" className="ml-auto tabular-nums">
        {S.table.unitCount(filter.visibleUnits.length, totalCount)}
      </Typography>
    </div>
  );
}
