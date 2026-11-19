import { UserCog } from "lucide-react"

import { FieldError } from "@/components/common/forms/FieldError"
import { assignableChannelTags } from "@/constants/channel-tags"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ACCOUNT_STATUSES, type AccountStatus } from "../../api"
import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { AccountOwnersSelect } from "./AccountOwnersSelect"
import { ParentAccountSelect } from "./ParentAccountSelect"
import { SectionHeader } from "../shared/SectionHeader"

export function AccountStatusOwnershipSection({ form }: { form: AccountFormController }) {
  const {
    status, setStatus,
    ownerOptions, setOwnerOptions,
    primaryOwnerId, setPrimaryOwnerId,
    accountType,
    accountId,
    parentAccountId, setParentAccountId,
    isParentLocked,
    hidesParentField,
    hasChildren,
    approvalStatus,
    errors, clearError,
  } = form

  // Accounts still pending approval (or rejected) can't anchor a hierarchy yet,
  // so the parent picker is hidden until the account is approved.
  // A new parent account (create-parent launch) is a root, so it hides the field too.
  const hideParentField =
    hidesParentField || approvalStatus === "Pending" || approvalStatus === "Rejected"

  return (
    <div className="space-y-4">
      <SectionHeader icon={UserCog} label={S.statusOwnership.sectionLabel} accent="emerald" />

      <div className="space-y-1.5">
        <Label className="font-ui">
          {S.statusOwnership.status} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={status}
          onValueChange={(v) => v && setStatus(v as AccountStatus)}
        >
          <SelectTrigger className="w-full" clearable={false}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {S.statusOwnership.accountOwners} <span className="text-destructive">*</span>
        </Label>
        <AccountOwnersSelect
          value={ownerOptions}
          onValueChange={(next) => {
            setOwnerOptions(next)
            clearError("primaryOwnerId")
            clearError("accountOwners")
          }}
          primaryOwnerId={primaryOwnerId}
          onPrimaryOwnerChange={(id) => {
            setPrimaryOwnerId(id)
            clearError("primaryOwnerId")
          }}
          channelTags={accountType ? assignableChannelTags(accountType) : undefined}
          // Edit-mode only — passes the saved account id so the select can
          // refuse to remove an owner who still has open deals on this account.
          accountId={accountId}
        />
        <FieldError
          id="account-owners-error"
          message={errors.accountOwners}
        />
        <FieldError
          id="account-primary-owner-error"
          message={errors.primaryOwnerId}
        />
      </div>

      {!hideParentField && (
        <div className="space-y-1.5">
          <Label className="font-ui">{S.statusOwnership.parentAccount}</Label>
          <ParentAccountSelect
            value={parentAccountId}
            onValueChange={(next) => {
              setParentAccountId(next)
              clearError("parentAccount")
            }}
            // Edit mode: cycle-safe server filter (drops this account + its
            // subtree) — the same options API the detail page's Set-parent
            // dialog uses. `accountId` is undefined on create, so it's a no-op.
            eligibleParentFor={accountId}
            excludeId={accountId}
            // Only surface candidate parents of the SAME account type as the one
            // currently selected on the form. Empty (no type picked yet) → unset,
            // so the picker isn't filtered until a type is chosen.
            accountType={accountType || undefined}
            locked={isParentLocked}
          />
          <FieldError id="account-parent-error" message={errors.parentAccount} />
          {isParentLocked ? (
            <Typography variant="helper" tone="muted" className="block pt-0.5">
              {S.statusOwnership.parentLockedHint}
            </Typography>
          ) : hasChildren && parentAccountId ? (
            <Typography variant="helper" tone="warning" className="block pt-0.5">
              {S.statusOwnership.reparentChildrenHint}
            </Typography>
          ) : null}
        </div>
      )}
    </div>
  )
}
