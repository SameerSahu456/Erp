import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const T = S.form.units.table

/** Toolbar — search (with ×) and a live selected count. */
export function ReplacementUnitTableToolbar({
  search,
  onSearchChange,
  visibleCount,
  totalCount,
  selectedCount,
}: {
  search: string
  onSearchChange: (next: string) => void
  visibleCount: number
  totalCount: number
  selectedCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full min-w-0 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={T.searchPlaceholder}
          aria-label={T.searchPlaceholder}
          className="h-9 w-full min-w-0 pl-9 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={T.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Typography variant="helper" tone="muted" numeric>
          {T.rowCount(visibleCount, totalCount)}
        </Typography>
        <Typography variant="caption" className="text-primary" numeric>
          {T.selectedCount(selectedCount)}
        </Typography>
      </div>
    </div>
  )
}
