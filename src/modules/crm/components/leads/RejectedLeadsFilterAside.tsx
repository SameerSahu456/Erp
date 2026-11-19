import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"

import { CategoryFilterSelect, OemFilterSelect } from "../shared/CategoryOemFilterSelects"
import { CrmFilterAside, CrmFilterAsideClearAll } from "../shared/CrmFilterAside"
import { LEADS_STRINGS as S } from "./leads.strings"
import { RejectionReasonFilterSelect } from "./RejectionReasonFilterSelect"

interface RejectedLeadsFilterAsideProps {
  open: boolean
  onlyUnassigned: boolean
  onOnlyUnassignedChange: (next: boolean) => void
  selectedCategories: string[]
  onCategoriesChange: (next: string[]) => void
  selectedOems: string[]
  onOemsChange: (next: string[]) => void
  selectedReasons: string[]
  onReasonsChange: (next: string[]) => void
  activeFilterCount: number
  onClose: () => void
  onClearAll: () => void
}

// Stage is pinned to "Rejected" for this list. Category, OEM and the
// unassigned-only toggle live here; Rejected On and Assigned To are on the main
// toolbar — all map to real /crm/leads query params
// (the same endpoint backs the active Leads list).
export function RejectedLeadsFilterAside({
  open,
  onlyUnassigned,
  onOnlyUnassignedChange,
  selectedCategories,
  onCategoriesChange,
  selectedOems,
  onOemsChange,
  selectedReasons,
  onReasonsChange,
  activeFilterCount,
  onClose,
  onClearAll,
}: RejectedLeadsFilterAsideProps) {
  return (
    <CrmFilterAside open={open} activeFilterCount={activeFilterCount} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{S.filters.category}</label>
          </Typography>
          <CategoryFilterSelect
            value={selectedCategories}
            onChange={onCategoriesChange}
            label={S.filters.category}
            placeholder={S.filters.allCategories}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{S.filters.oem}</label>
          </Typography>
          <OemFilterSelect
            value={selectedOems}
            onChange={onOemsChange}
            label={S.filters.oem}
            placeholder={S.filters.allOems}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{S.rejected.filters.rejectionReason}</label>
          </Typography>
          <RejectionReasonFilterSelect
            value={selectedReasons}
            onChange={onReasonsChange}
            label={S.rejected.filters.rejectionReason}
            placeholder={S.rejected.filters.allReasons}
          />
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2">
          <Checkbox
            checked={onlyUnassigned}
            onCheckedChange={(checked) => onOnlyUnassignedChange(checked === true)}
          />
          <Typography variant="body">{S.filters.unassignedOnly}</Typography>
        </label>

        {/* Clear all moved to the main filters toolbar (CrmListToolbar).
        {activeFilterCount > 0 && (
          <CrmFilterAsideClearAll onClick={onClearAll}>{S.filters.clearAll}</CrmFilterAsideClearAll>
        )}
        */}
      </div>
    </CrmFilterAside>
  )
}
