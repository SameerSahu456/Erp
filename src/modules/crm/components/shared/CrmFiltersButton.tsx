import { Filter } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface CrmFiltersButtonProps {
  open: boolean
  onToggle: () => void
  activeFilterCount: number
  /** Tighter height for use inside the data-table toolbar (matches its `sm` chips). */
  compact?: boolean
}

// The "Filters (n)" toggle that opens/closes a CrmFilterAside. Shared by the
// leads/deals toolbar (CrmListToolbar) and the quotes / sales-orders table toolbar.
export function CrmFiltersButton({
  open,
  onToggle,
  activeFilterCount,
  compact = false,
}: CrmFiltersButtonProps) {
  const height = compact ? "h-8 text-[13px]" : "h-9 text-[13px]"
  return (
    <>
      <Button
        variant={open || activeFilterCount > 0 ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={height}
      >
        <Filter className="mr-1.5 size-3.5" />
        {CRM_SHARED_STRINGS.listToolbar.filters}
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-1.5 h-[18px] min-w-[18px] justify-center px-1.5 text-[10px] font-semibold"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </>
  )
}
