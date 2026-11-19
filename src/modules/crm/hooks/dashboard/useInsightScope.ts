import { useAuth } from '@shared/auth/use-auth'

import { hasDashboardScopeToggle } from '../../crm-roles'
import type { ViewScope } from './useInsightView'

// Resolves the My / Team scope for the insight board against the logged-in
// user's roles. Shared by the dashboard and the detail page so the toggle, the
// facet list and the two endpoints can never disagree about which scope is
// actually in force.
//
// The URL is the user's REQUEST; this hook returns what they actually get. A
// role without a team (admin / superadmin) is pinned to `team` even if
// `?view=my` is hand-typed or arrives from a stale link — otherwise the board
// would scope to their own, empty sales numbers with no visible control to
// undo it.

export interface InsightScope {
  /** Whether to render the My / Team control at all. */
  showToggle: boolean
  /** The scope actually in force — never `my` when `showToggle` is false. */
  scope: ViewScope
  /** Feeds `user_ids` in My View. Null until `/auth/me` resolves. */
  currentUserId: string | null
  /** True when the Rep facet must be hidden: My View is already pinned to one
   *  rep, so filtering by rep can only ever narrow it to nothing. */
  hideOwnerFacet: boolean
}

export function useInsightScope(requested: ViewScope): InsightScope {
  const { user } = useAuth()

  const showToggle = hasDashboardScopeToggle(user?.roles)
  const scope: ViewScope = showToggle ? requested : 'team'

  return {
    showToggle,
    scope,
    currentUserId: user?.id ?? null,
    hideOwnerFacet: scope === 'my',
  }
}
