import { Link } from "react-router-dom"

import { useLead } from "../../hooks/leads/useLeads"
import { useDeal } from "../../hooks/deals/useDeals"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function HeroStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  )
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "default" | "success" | "warning"
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-status-warning-text"
        : "text-foreground/90"
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

export function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/85">{value}</span>
    </div>
  )
}

// The MI wire carries only `lead_id` / `deal_id` UUIDs; resolve the human
// label on demand. Cache is shared with the standalone detail routes.
export function LinkedEntityKV({ type, id }: { type: "lead" | "deal"; id: string }) {
  const leadQuery = useLead(type === "lead" ? id : "")
  const dealQuery = useDeal(type === "deal" ? id : "")

  const isLead = type === "lead"
  const isLoading = isLead ? leadQuery.isLoading : dealQuery.isLoading
  const lead = leadQuery.data
  const deal = dealQuery.data

  let label: string
  if (isLead) {
    label =
      lead == null
        ? isLoading
          ? S.statBits.loading
          : S.statBits.leadFallback(id.slice(0, 8))
        : lead.company_name?.trim()
          ? `${lead.lead_code} · ${lead.company_name}`
          : lead.lead_code
  } else {
    label =
      deal == null
        ? isLoading
          ? S.statBits.loading
          : S.statBits.dealFallback(id.slice(0, 8))
        : deal.title
          ? `${deal.deal_number} · ${deal.title}`
          : deal.deal_number
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{isLead ? S.statBits.leadLabel : S.statBits.dealLabel}</span>
      <Link
        to={`/crm/${isLead ? "leads" : "deals"}/${id}`}
        className="truncate font-medium text-primary underline-offset-4 hover:underline"
        title={label}
      >
        {label}
      </Link>
    </div>
  )
}
