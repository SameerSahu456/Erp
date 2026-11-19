import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Globe,
  IndianRupee,
  ReceiptText,
  Tag as TagIcon,
  Users,
  XCircle,
} from "lucide-react"

import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { accountRevenueToNumber } from "../../api"
import type { useAccountDetail } from "../../hooks/accounts/useAccountDetail"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountDocumentsCard } from "./AccountDocumentsCard"
import { AccountInfoRow } from "./AccountInfoRow"

type Account = NonNullable<ReturnType<typeof useAccountDetail>["account"]>

interface AccountOverviewTabProps {
  account: Account
}

export function AccountOverviewTab({ account }: AccountOverviewTabProps) {
  return (
    // The outer card is provided by `<DetailTabs cardContent>` — the page
    // renders Company Details inside that wrapper so they share one frame.
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight">
          {S.overview.companyDetails}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <AccountInfoRow icon={Briefcase} label={S.overview.industry}>
            {account.industry ?? "—"}
          </AccountInfoRow>
          <AccountInfoRow icon={TagIcon} label={S.overview.type}>
            {account.account_type}
          </AccountInfoRow>
          {/*
            2026-05-19: account_type and company_size are now independent
            axes (channel relationship vs. segmentation) — both render
            unconditionally so the absence of a value is visible as "—".
          */}
          <AccountInfoRow icon={Building2} label={S.overview.companySize}>
            {account.company_size ?? "—"}
          </AccountInfoRow>
          {account.employees != null && (
            <AccountInfoRow icon={Users} label={S.overview.employees}>
              {account.employees.toLocaleString()}
            </AccountInfoRow>
          )}
          <AccountInfoRow icon={CreditCard} label={S.overview.pan}>
            {account.pan_number ?? "—"}
          </AccountInfoRow>
          <AccountInfoRow icon={ReceiptText} label={S.overview.gst}>
            {account.gst_number ?? "—"}
          </AccountInfoRow>
          <AccountInfoRow icon={IndianRupee} label={S.overview.annualRevenue}>
            {accountRevenueToNumber(account.revenue) > 0
              ? formatINR(accountRevenueToNumber(account.revenue))
              : "—"}
          </AccountInfoRow>
          {account.website && (
            <AccountInfoRow icon={Globe} label={S.overview.website}>
              <a
                href={account.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {account.website}
              </a>
            </AccountInfoRow>
          )}
          <AccountInfoRow icon={CalendarDays} label={S.overview.created}>
            {formatIST_date(account.created_at)}
          </AccountInfoRow>
          {account.approval_status === "Approved" && account.approval_by && (
            <AccountInfoRow icon={CheckCircle2} label="Approved By">
              {account.approval_by.name}
            </AccountInfoRow>
          )}
          {account.approval_status === "Rejected" && account.approval_by && (
            <AccountInfoRow icon={XCircle} label="Rejected By">
              {account.approval_by.name}
            </AccountInfoRow>
          )}
        </dl>
      </div>

      {/* Documents — sits alongside Company Details. Each canonical doc slot
          previews in place and replaces on click. */}
      <AccountDocumentsCard accountId={account.id} />
    </div>
  )
}
