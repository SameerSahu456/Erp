import { CrmFilterAside } from "../shared/CrmFilterAside"
import { LeadsFilterPanel } from "./LeadsFilterPanel"
import type { LeadsFilterPanelProps } from "./LeadsFilterPanel"

interface LeadsFilterAsideProps {
  open: boolean
  filters: LeadsFilterPanelProps
}

export function LeadsFilterAside({ open, filters }: LeadsFilterAsideProps) {
  return (
    <CrmFilterAside
      open={open}
      activeFilterCount={filters.activeFilterCount}
      onClose={filters.onClose}
    >
      <LeadsFilterPanel {...filters} />
    </CrmFilterAside>
  )
}
