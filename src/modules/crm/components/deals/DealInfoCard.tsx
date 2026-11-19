import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  Briefcase,
  Building2,
  Clock,
  Globe,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Repeat,
  Target,
  User,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import type { useDealDetail } from "../../hooks/deals/useDealDetail"
import { sourceLabel } from "../leads/leadForm.constants"
import { getDealStageVariant } from "./dealDetailHelpers"
import { DEALS_STRINGS, EN_IN_LOCALE } from "./deals.strings"
import { dealStageLabel } from "../../constants/deal-stages"

type Detail = ReturnType<typeof useDealDetail>

interface DealInfoCardProps {
  deal: NonNullable<Detail["deal"]>
  contactSpoc: Detail["contactSpoc"]
  activeStage: string
  displayValue: number
}

/** One label/value row of the info grid.
 *
 *  The surrounding card repeats this markup for every fact. New rows go
 *  through here so the `text-[10.5px]` label styling has ONE home rather
 *  than a copy per fact — the existing rows predate it and are untouched,
 *  since restyling them is a visual change and not part of adding a fact.
 */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{label}</dt>
        <dd className="mt-1">{children}</dd>
      </div>
    </div>
  )
}

export function DealInfoCard({ deal, contactSpoc, activeStage, displayValue }: DealInfoCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{DEALS_STRINGS.detail.info.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
              <FileText className="size-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{DEALS_STRINGS.detail.info.titleField}</dt>
              <dd className="mt-0.5 truncate text-[13px] text-foreground" title={deal.name}>
                {deal.name || "—"}
              </dd>
            </div>
          </div>
          {/* Same sequence as LeadInfoCard so a lead and its deal read alike. */}
          {[
            {
              icon: Building2,
              label: DEALS_STRINGS.detail.info.account,
              value: (
                <Link
                  to={`/crm/accounts/${deal.accountId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {deal.accountName}
                </Link>
              ),
            },
            { icon: User, label: DEALS_STRINGS.detail.info.contact, value: contactSpoc?.name ?? "—" },
            { icon: Users, label: DEALS_STRINGS.detail.info.employees, value: deal.employees?.toLocaleString(EN_IN_LOCALE) ?? "—" },
            { icon: Briefcase, label: DEALS_STRINGS.detail.info.companySize, value: deal.companySize ?? "—" },
            { icon: Building2, label: DEALS_STRINGS.detail.info.type, value: deal.customerType ?? "—" },
            { icon: MapPin, label: DEALS_STRINGS.detail.info.location, value: deal.location?.toUpperCase() ?? "—" },
            { icon: Phone, label: DEALS_STRINGS.detail.info.contactPhone, value: contactSpoc?.phone || "—" },
            { icon: Mail, label: DEALS_STRINGS.detail.info.contactEmail, value: contactSpoc?.email || "—" },
            { icon: Megaphone, label: DEALS_STRINGS.detail.info.source, value: deal.source ? sourceLabel(deal.source) : "—" },
            {
              icon: Globe,
              label: DEALS_STRINGS.detail.info.website,
              value: deal.website ? (
                <a
                  href={/^https?:\/\//i.test(deal.website) ? deal.website : `https://${deal.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={deal.website}
                  className="block truncate text-primary underline-offset-4 hover:underline"
                >
                  {deal.website}
                </a>
              ) : (
                "—"
              ),
            },
            {
              icon: Briefcase,
              label: DEALS_STRINGS.detail.info.orderTypes,
              value: deal.tags && deal.tags.length > 0 ? deal.tags.join(", ") : "—",
            },
            { icon: Clock, label: DEALS_STRINGS.detail.info.closureDate, value: deal.closeDate ? formatIST_date(deal.closeDate) : "—" },
            {
              icon: Target,
              label: DEALS_STRINGS.detail.info.stage,
              value: (
                <StatusBadge variant={getDealStageVariant(activeStage)}>{dealStageLabel(activeStage)}</StatusBadge>
              ),
            },
            {
              icon: IndianRupee,
              label: DEALS_STRINGS.detail.info.value,
              value: formatINRCompact(displayValue, { decimals: true }),
              emphasis: true,
            },
          ].map(({ icon: Icon, label, value, emphasis }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{label}</dt>
                <dd
                  className={cn(
                    "mt-0.5 truncate text-[13px] text-foreground",
                    emphasis && "font-semibold tabular-nums"
                  )}
                >
                  {value}
                </dd>
              </div>
            </div>
          ))}
          {/* Rentals only. On a sale the booked value IS the invoiced value
              once it ships, so a second identical figure is noise; on a
              rental they diverge by design and the gap is the point. */}
          {deal.sellableIntent === "rental" ? (
            <InfoRow icon={IndianRupee} label={DEALS_STRINGS.detail.info.realisedValue}>
              <span className="truncate font-semibold tabular-nums text-foreground">
                {formatINRCompact(deal.realisedValue ?? 0, { decimals: true })}
              </span>
            </InfoRow>
          ) : null}
          {/* Server-derived from the deal's live quotes and orders, never
              typed by a user. Shown because a rental deal behaves
              differently everywhere downstream — it is quoted, ordered and
              billed separately — and nothing on this page said which kind
              it was. */}
          {deal.sellableIntent ? (
            <InfoRow icon={Repeat} label={DEALS_STRINGS.detail.info.sellableIntent}>
              <StatusBadge
                variant={deal.sellableIntent === "rental" ? "info" : "neutral"}
              >
                {deal.sellableIntent === "rental"
                  ? DEALS_STRINGS.detail.info.intentRental
                  : DEALS_STRINGS.detail.info.intentSale}
              </StatusBadge>
            </InfoRow>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  )
}
