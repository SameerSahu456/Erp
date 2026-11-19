import { Link } from "react-router-dom"
import { Mail, Phone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { useDealDetail } from "../../hooks/deals/useDealDetail"
import { DEALS_STRINGS } from "./deals.strings"

type Detail = ReturnType<typeof useDealDetail>

interface DealAccountInfoCardProps {
  account: NonNullable<Detail["account"]>
  contactSpoc: Detail["contactSpoc"]
}

export function DealAccountInfoCard({ account, contactSpoc }: DealAccountInfoCardProps) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{DEALS_STRINGS.detail.accountInfo.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Account name shares its row with Type. The name truncates with an
              ellipsis when long; the title tooltip shows it in full on hover,
              and the link still navigates to the account on click. */}
          <div className="min-w-0 space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{DEALS_STRINGS.detail.accountInfo.account}</dt>
            <dd className="min-w-0">
              <Link
                to={`/crm/accounts/${account.id}`}
                title={account.name}
                className="block truncate text-[13px] font-semibold leading-tight text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {account.name}
              </Link>
            </dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{DEALS_STRINGS.detail.accountInfo.type}</dt>
            <dd className="truncate text-[12px] leading-tight text-foreground">{account.type || "—"}</dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{DEALS_STRINGS.detail.accountInfo.industry}</dt>
            <dd className="truncate text-[12px] leading-tight text-foreground">{account.industry || "—"}</dd>
          </div>
        </dl>
        {contactSpoc && (
          <div className="border-t border-border/60 pt-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{DEALS_STRINGS.detail.accountInfo.contactSpoc}</p>
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{contactSpoc.name}</p>
              {contactSpoc.designation && (
                <p className="truncate text-[11px] leading-tight text-muted-foreground">— {contactSpoc.designation}</p>
              )}
            </div>
            {(contactSpoc.email || contactSpoc.phone) && (
              <div className="mt-2 grid gap-1 text-[12px] text-muted-foreground">
                {contactSpoc.email && (
                  <span className="flex min-w-0 items-center gap-1.5 leading-5">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{contactSpoc.email}</span>
                  </span>
                )}
                {contactSpoc.phone && (
                  <span className="flex min-w-0 items-center gap-1.5 leading-5">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="truncate">{contactSpoc.phone}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
