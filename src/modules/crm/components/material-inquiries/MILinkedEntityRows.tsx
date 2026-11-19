import { Link } from "react-router-dom"

import { useLead } from "../../hooks/leads/useLeads"
import { useDeal } from "../../hooks/deals/useDeals"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

// MI wire only carries `lead_id` / `deal_id` UUIDs; we resolve the human label
// on demand. Cache is shared with the standalone /crm/leads/:id and
// /crm/deals/:id routes via the same query keys.

export function LinkedLeadRow({ leadId }: { leadId: string }) {
  const { data: lead, isLoading } = useLead(leadId)
  const label =
    lead == null
      ? isLoading
        ? S.linkedEntity.loading
        : S.linkedEntity.leadFallback(leadId.slice(0, 8))
      : lead.company_name?.trim()
        ? `${lead.lead_code} · ${lead.company_name}`
        : lead.lead_code

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-ui text-muted-foreground">{S.linkedEntity.leadLabel}</span>
      <Link
        to={`/crm/leads/${leadId}`}
        className="text-sm text-primary underline-offset-4 hover:underline"
        title={label}
      >
        {label}
      </Link>
    </div>
  )
}

export function LinkedDealRow({ dealId }: { dealId: string }) {
  const { data: deal, isLoading } = useDeal(dealId)
  const label =
    deal == null
      ? isLoading
        ? S.linkedEntity.loading
        : S.linkedEntity.dealFallback(dealId.slice(0, 8))
      : deal.title
        ? `${deal.deal_number} · ${deal.title}`
        : deal.deal_number

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-ui text-muted-foreground">{S.linkedEntity.dealLabel}</span>
      <Link
        to={`/crm/deals/${dealId}`}
        className="text-sm text-primary underline-offset-4 hover:underline"
        title={label}
      >
        {label}
      </Link>
    </div>
  )
}
