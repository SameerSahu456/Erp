import { INSIGHTS_STRINGS } from './insights.strings'
import type { InsightFilterField } from './insights.registry'

// The display name for each filter field — used by the toolbar's pills and the
// "Filtered by:" chips, so a facet is called the same thing everywhere.
//
// This file used to also export `facetOptions()`, which narrowed one facet's
// options by the OTHER active facets. That was REMOVED, not relocated: it
// worked by matching the SEEDED demo records on label, so once Category / OEM /
// Rep / Account became live API facets, a real pick ("Dell Technologies", a
// real rep) matched no mock record, every record dropped out, and the dependent
// dropdown collapsed to "No matches" — which is exactly what Month did as soon
// as you drilled in with a filter set.
//
// Cross-facet narrowing is also not the client's job here: each facet goes to
// the wire as its own param and the BACKEND intersects them. If faceted options
// are wanted later they must come from an endpoint that knows the real data,
// not from re-deriving them over mock rows.

export const FIELD_LABEL: Record<InsightFilterField, string> = {
  vertical: INSIGHTS_STRINGS.facets.vertical,
  condition: INSIGHTS_STRINGS.facets.condition,
  category: INSIGHTS_STRINGS.facets.category,
  oem: INSIGHTS_STRINGS.facets.oem,
  owner: INSIGHTS_STRINGS.facets.owner,
  account: INSIGHTS_STRINGS.facets.account,
  month: INSIGHTS_STRINGS.facets.month,
}
