import { AsyncSelect } from "@/components/ui/async-select"
import { FieldError } from "@/components/common/forms/FieldError"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAccountOptions } from "../../hooks/accounts/useAccounts"
import type {
  AccountListItem,
  CrmLeadListItem,
  DealListItem,
  DemoRequestSource,
} from "../../api"
import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

export function DemoSourcePicker({ form }: { form: DemoRequestFormController }) {
  const { sourceType } = form

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="sourceType">
          {S.form.source.label} <span className="text-destructive">*</span>
        </Label>
        <Select value={sourceType} onValueChange={(value) => form.resetSource(value as DemoRequestSource)}>
          <SelectTrigger id="sourceType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">{S.form.source.lead}</SelectItem>
            <SelectItem value="deal">{S.form.source.deal}</SelectItem>
            <SelectItem value="account">{S.form.source.account}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sourceRecord">
          {sourceType === "lead" ? S.form.source.lead : sourceType === "deal" ? S.form.source.deal : S.form.source.account}{" "}
          <span className="text-destructive">*</span>
        </Label>
        {sourceType === "lead" ? (
          <AsyncSelect<CrmLeadListItem>
            key="demo-request-source-lead"
            id="sourceRecord"
            value={form.sourceOption}
            onValueChange={(next) => {
              form.setSourceOption(next)
              form.setLeadId(next?.id ?? "")
              if (!next) {
                form.setSelectedLead(null)
                form.setContactName("")
                form.setContactPhone("")
                form.setContactEmail("")
                form.setShippingLine1("")
                form.setShippingCity("")
                form.setShippingState("")
                form.setShippingPincode("")
              }
            }}
            onItemPick={form.handleLeadPick}
            useOptions={form.useLeadOptions}
            toLabel={(lead) => lead.company_name || lead.contact_name || lead.lead_code}
            placeholder={S.form.source.selectLead}
            searchPlaceholder={S.form.source.searchLeads}
            loadOnOpen
          />
        ) : sourceType === "deal" ? (
          <AsyncSelect<DealListItem>
            key="demo-request-source-deal"
            id="sourceRecord"
            value={form.sourceOption}
            onValueChange={(next) => {
              form.setSourceOption(next)
              form.setDealId(next?.id ?? "")
              if (!next) {
                form.setAccountId("")
                form.setAccountOption(null)
                form.setContactId("")
                form.setContactOption(null)
                form.setShippingAddressId("")
              }
            }}
            onItemPick={form.handleDealPick}
            useOptions={form.useDealOptions}
            toLabel={(deal) => deal.deal_number}
            placeholder={S.form.source.selectDeal}
            searchPlaceholder={S.form.source.searchDeals}
            loadOnOpen
            renderItem={(deal) => (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{deal.deal_number}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {deal.title} · {deal.account_name ?? deal.account_id}
                </div>
              </div>
            )}
          />
        ) : (
          <AsyncSelect<AccountListItem>
            key="demo-request-source-account"
            id="sourceRecord"
            value={form.accountOption}
            onValueChange={(next) => {
              form.setAccountOption(next)
              form.setSourceOption(next)
              form.setAccountId(next?.id ?? "")
              if (!next) {
                form.setContactId("")
                form.setContactOption(null)
                form.setShippingAddressId("")
              }
            }}
            onItemPick={(account) => {
              form.handleAccountPick(account)
              form.setSourceOption({ id: account.id, label: account.name })
            }}
            useOptions={useAccountOptions}
            toLabel={(account) => account.name}
            placeholder={S.form.source.selectAccount}
            searchPlaceholder={S.form.source.searchAccounts}
            loadOnOpen
          />
        )}
        <FieldError id="demo-source-error" message={form.errors.sourceId} />
      </div>
    </>
  )
}
