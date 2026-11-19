// Restore alongside the commented-out export button below:
// import { Download } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { useMemo } from 'react'

import type { SalesTeamRoleFacet } from '../../../api/dashboard'
import type { FacetValue } from '../../../data/insights/records'
import { buildRoleFacet } from './insights.facets'
import { INSIGHTS_STRINGS } from './insights.strings'
import { InsightFacet } from './InsightFacet'

// The Sales Team widget's header controls: the role filter + an export button,
// laid out as the reference — a select-style role pill and a square icon button
// beside it, both the same height.
//
// The role filter is API-backed (`ROLE_FACET`) and renders through the same
// `InsightFacet` as every page facet, so it inherits debounced API search and
// scroll-to-load-more (§16.11) with no second implementation. `triggerLabel`
// keeps the reference's `<select>` chrome: the trigger reads the CURRENT
// SELECTION, not a facet name plus a count badge.

const S = INSIGHTS_STRINGS.salesTeam

export function SalesTeamActions({
  roles,
  // Defaulted rather than required: the widget passes `data?.roles ?? []`, so
  // the array is empty on the very first render (before the response lands)
  // and on an error. Treat "no facet yet" as "no options", never a crash.
  roleOptions = [],
  totalUsers = 0,
  onRolesChange,
  onExport,
  exportDisabled,
}: {
  roles: FacetValue[]
  /** The roles present in the report, with user counts — straight off
   *  `SalesTeamRevenueResponse.roles`. No separate request: it rides on the
   *  widget's own query, and is unpaginated (spans every user, not the page).
   *  Optional so a pre-response render is an empty dropdown, not a crash. */
  roleOptions?: SalesTeamRoleFacet[]
  /** `SalesTeamRevenueResponse.total_users` — the DISTINCT users the role facet
   *  is computed over, i.e. the "All" figure: what picking no role gives you.
   *
   *  Deliberately not `pagination.total`, which is counted AFTER the `roles`
   *  filter and so collapses to the selected role's size — "All" would then
   *  describe the filtered view instead of the unfiltered one it returns to. */
  totalUsers?: number
  onRolesChange: (next: FacetValue[]) => void
  /** Downloads the currently-loaded rows as CSV. Owned by the widget (it holds
   *  the data); this control just fires it. */
  onExport?: () => void
  exportDisabled?: boolean
}) {
  // Rebuilt only when the facet array changes — `makeStaticAsyncOptions` keys
  // its memo on the items identity, so a new source every render would defeat it.
  const roleFacet = useMemo(() => buildRoleFacet(roleOptions), [roleOptions])

  // "All (111)" counts USERS, not roles — the size of the data you get back
  // with no role picked. It matches the per-role numbers beside it, which are
  // user counts too; showing the ROLE count here (22) put a different unit in
  // the same slot. Server-computed on the facet's own pre-filter basis, so it
  // does not move when a role is selected — see `totalUsers`.
  const allCount = String(totalUsers)

  // Trigger reads the CURRENT SELECTION: nothing → "All (111)", one → its
  // label. There is no "N roles" case — the facet is `single`, so the
  // selection is only ever empty or exactly one.
  const roleTrigger = (value: FacetValue[]) =>
    value.length === 0
      ? totalUsers > 0
        ? S.rolesAllCount(totalUsers)
        : S.rolesAll
      : value[0].label

  return (
    // Just the role dropdown — the header right-aligns this, so the pill sits at
    // the right edge. `justify-end` keeps it there even if more controls return.
    <div className="flex items-center justify-end">
      <InsightFacet
        source={roleFacet}
        value={roles}
        onChange={onRolesChange}
        triggerLabel={roleTrigger}
        align="end"
        // Pick ONE role at a time: a new pick replaces the current one, picking
        // the selected role again clears back to All, and the popover closes on
        // choose. The wire param stays multi-valued (`?roles=a&roles=b`) and the
        // server still OR-matches — this is a UI restriction only, so nothing
        // has to change if multi-select is ever wanted back.
        single
        // The way BACK to the unfiltered view. Without it a picked role could
        // only be cleared by re-picking that same row — a gesture nothing on
        // screen advertises, so the dropdown looked like a one-way door.
        allOption={S.rolesAll}
        allOptionMeta={allCount}
        // Chrome only — narrower h-9 select-style pill; `justify-between` pushes
        // the chevron to the right edge (label left, arrow right).
        className="h-9 w-24 justify-between bg-background"
      />
      {/* Export button — COMMENTED OUT. Nothing generates the file server-side
          yet, and a client-only CSV of the visible rows reads as a half-feature.
          Restore this (and its imports at the top) when the real export lands.

      <TooltipProvider delay={150}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={onExport}
                disabled={exportDisabled}
                aria-label={INSIGHTS_STRINGS.toolbar.export}
              />
            }
          >
            <Download className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{INSIGHTS_STRINGS.toolbar.export}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      */}
    </div>
  )
}
