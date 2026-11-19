import { User, Users } from 'lucide-react'

import type { ViewScope } from '../../../hooks/dashboard/useInsightView'
import { InsightSegmented, type SegmentedOption } from './InsightSegmented'
import { INSIGHTS_STRINGS } from './insights.strings'

// My View / Team View — the reference dashboard's dual-view toggle.
//
// Deliberately NOT rendered for every user: the caller decides via
// `hasDashboardScopeToggle(user.roles)`. Admin / superadmin have no reports, so
// "My View" would scope the board to their own empty sales numbers — a control
// that can only produce a blank board is worse than no control.
//
// Chrome comes from `InsightSegmented`. That control is shared with the
// Chart/List pair, which is currently commented out in `InsightPeriodControl` —
// keeping both on one control is what makes them match when it returns.

const OPTIONS: SegmentedOption<ViewScope>[] = [
  { value: 'my', label: INSIGHTS_STRINGS.toolbar.myView, Icon: User },
  { value: 'team', label: INSIGHTS_STRINGS.toolbar.teamView, Icon: Users },
]

interface InsightScopeToggleProps {
  scope: ViewScope
  onScopeChange: (s: ViewScope) => void
}

export function InsightScopeToggle({ scope, onScopeChange }: InsightScopeToggleProps) {
  return (
    <InsightSegmented
      options={OPTIONS}
      value={scope}
      onChange={onScopeChange}
      ariaLabel={INSIGHTS_STRINGS.toolbar.scopeLabel}
    />
  )
}
