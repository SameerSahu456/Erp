import {
  Briefcase,
  Building2,
  Clock,
  Globe,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  User,
  UserCog,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import type { Lead } from "../../types"
import { sourceLabel } from "./leadForm.constants"
import { EN_IN_LOCALE, LEADS_STRINGS as S } from "./leads.strings"

const formatDate = (dateStr: string) => formatIST_date(dateStr)

interface LeadInfoCardProps {
  lead: Lead
  assignedToName: string | null
  presalesManagerName: string | null
}

export function LeadInfoCard({ lead, assignedToName, presalesManagerName }: LeadInfoCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{S.detail.info.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {[
            { icon: User, label: S.detail.info.contactName, value: lead.name },
            { icon: Building2, label: S.detail.info.companyName, value: lead.company.toUpperCase() },
            { icon: Briefcase, label: S.detail.info.companySize, value: lead.companySize ?? "—" },
            { icon: Users, label: S.detail.info.employees, value: lead.employees?.toLocaleString(EN_IN_LOCALE) ?? "—" },
            { icon: MapPin, label: S.detail.info.location, value: lead.location?.toUpperCase() ?? "—" },
            { icon: Building2, label: S.detail.info.type, value: lead.customerType ?? "—" },
            { icon: Mail, label: S.detail.info.email, value: lead.email },
            { icon: Phone, label: S.detail.info.contactNumber, value: lead.phone },
            { icon: Globe, label: S.detail.info.website, value: lead.website || "—" },
            { icon: Globe, label: S.detail.info.source, value: sourceLabel(lead.source) },
            { icon: Clock, label: S.detail.info.closureDate, value: lead.closureDate ? formatIST_date(lead.closureDate) : "—" },
            {
              icon: Briefcase,
              label: S.detail.info.orderTypes,
              value: lead.tags && lead.tags.length > 0 ? lead.tags.join(", ") : "—",
            },
            {
              icon: IndianRupee,
              label: S.detail.info.value,
              value: formatINRCompact(lead.value, { decimals: true }),
              emphasis: true,
            },
            {
              icon: UserCog,
              label: S.detail.info.assignedTo,
              value: assignedToName ?? "—",
            },
            {
              icon: UserCog,
              label: S.detail.info.presalesManager,
              value: presalesManagerName ?? "—",
            },
          ].map(({ icon: Icon, label, value, emphasis }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {label}
                </dt>
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
        </dl>
      </CardContent>
    </Card>
  )
}
