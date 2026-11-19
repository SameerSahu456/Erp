import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, Plus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { STATUS_VARIANT_BY_AC } from "./accountDetailHelpers"
import { LinkChildAccountsDialog } from "./LinkChildAccountsDialog"
import { LinkParentAccountDialog } from "./LinkParentAccountDialog"
import type {
  AccountApprovalStatus,
  AccountStatus,
  AccountTypeWire,
} from "../../api"

type AccountLike = {
  id: string
  name: string
  status: AccountStatus
  account_type: string
  /** On the parent card: a parent created via "Create new parent account" is
   *  Pending until approved, and says so instead of Active/Inactive. */
  approval_status?: AccountApprovalStatus
}

// Shared icon-button trigger classes for both cards' add/change affordances.
// A circular "+" affordance — the add action lives only inside the circle.
const ADD_TRIGGER_CLASSES =
  "inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"

// Right-rail Parent Account + Child Accounts cards for the Account detail page.
// Both cards carry an "add" affordance (mirroring AccountOwnersCard): the Parent
// card opens a single-select popover to set/change this account's parent; the
// Child card opens a multi-select popover to link existing accounts or create a
// new one as a child. The Child list scrolls inside a bounded container with
// infinite-scroll paging driven by the parent's IntersectionObserver sentinel.
export function AccountHierarchyCards({
  account,
  parentAccount,
  childAccounts,
  childAccountsTotal = 0,
  setChildSentinel,
  isFetchingMoreChildren = false,
}: {
  account: { id: string; parent_account_id?: string | null; account_type?: AccountTypeWire }
  parentAccount?: AccountLike
  childAccounts: AccountLike[]
  childAccountsTotal?: number
  setChildSentinel?: (node: HTMLDivElement | null) => void
  isFetchingMoreChildren?: boolean
}) {
  const navigate = useNavigate()
  const [linkOpen, setLinkOpen] = useState(false)
  const [parentLinkOpen, setParentLinkOpen] = useState(false)

  const hasParent = !!account.parent_account_id
  const parentAffordanceLabel = hasParent
    ? S.hierarchy.changeParentAccount
    : S.hierarchy.addParentAccount

  return (
    <>
      <Card size="sm">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">{S.hierarchy.parentAccount}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={ADD_TRIGGER_CLASSES}
              aria-label={parentAffordanceLabel}
              title={parentAffordanceLabel}
            >
              <Plus className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setParentLinkOpen(true)}>
                {S.hierarchy.linkExisting}
              </DropdownMenuItem>
              {/* A new parent can only be created for an account with no parent:
                  if the new one were rejected the old parent could not be restored. */}
              {!hasParent && (
                <DropdownMenuItem
                  onClick={() =>
                    navigate(
                      `/crm/accounts/new?setParentForChild=${account.id}`,
                    )
                  }
                >
                  {S.hierarchy.createNew}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {hasParent ? (
            <Link
              to={`/crm/accounts/${account.parent_account_id}`}
              className="block rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/25 hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <Typography
                  variant="body"
                  className="min-w-0 flex-1 truncate font-medium"
                >
                  {parentAccount?.name ?? S.hierarchy.viewParentAccount}
                </Typography>
                {parentAccount && (
                  <StatusBadge
                    variant={
                      parentAccount.approval_status === "Pending"
                        ? "warning"
                        : STATUS_VARIANT_BY_AC[parentAccount.status]
                    }
                    className="shrink-0"
                  >
                    {parentAccount.approval_status === "Pending"
                      ? S.hierarchy.parentPendingApproval
                      : parentAccount.status}
                  </StatusBadge>
                )}
              </div>
              {parentAccount && (
                <Typography
                  variant="helper"
                  tone="muted"
                  className="mt-0.5 truncate"
                >
                  {parentAccount.account_type}
                </Typography>
              )}
            </Link>
          ) : (
            <Typography variant="helper" tone="muted" className="italic">
              {S.hierarchy.noParent}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Child Accounts card — only root accounts can GET new children (2-level
          policy), so an account with a parent hides the card — unless it still
          has children (a new parent is Pending: its child keeps its own
          sub-accounts until approval), which are listed read-only. */}
      {(!hasParent || childAccountsTotal > 0) && (

      <Card size="sm">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">
            {childAccountsTotal
              ? `${S.hierarchy.childAccounts} (${childAccountsTotal})`
              : S.hierarchy.childAccounts}
          </CardTitle>
          {!hasParent && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={ADD_TRIGGER_CLASSES}
              aria-label={S.hierarchy.addChildAccount}
              title={S.hierarchy.addChildAccount}
            >
              <Plus className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                {S.hierarchy.linkExisting}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/crm/accounts/new?parentAccountId=${account.id}`)
                }
              >
                {S.hierarchy.createNew}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {childAccounts.length === 0 ? (
            <Typography variant="helper" tone="muted" className="italic">
              {S.hierarchy.childEmpty}
            </Typography>
          ) : (
            // max-h cap + internal scroll so a long child list scrolls inside
            // the card instead of pushing the page (§8.7). -mr-1 pr-1 keeps the
            // scrollbar off the card content edge.
            <div className="-mr-1 max-h-72 space-y-2 overflow-y-auto pr-1">
              {childAccounts.map((child) => (
                <Link
                  key={child.id}
                  to={`/crm/accounts/${child.id}`}
                  className="block rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/25 hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Typography
                      variant="body"
                      className="min-w-0 flex-1 truncate font-medium"
                    >
                      {child.name}
                    </Typography>
                    <StatusBadge
                      variant={STATUS_VARIANT_BY_AC[child.status]}
                      className="shrink-0"
                    >
                      {child.status}
                    </StatusBadge>
                  </div>
                  <Typography
                    variant="helper"
                    tone="muted"
                    className="mt-0.5 truncate"
                  >
                    {child.account_type}
                  </Typography>
                </Link>
              ))}
              {/* Sentinel — the detail hook's observer fires fetchNextPage when
                  this scrolls into view. */}
              <div ref={setChildSentinel} />
              {isFetchingMoreChildren && (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <LinkChildAccountsDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        accountId={account.id}
        currentChildTotal={childAccountsTotal}
        // Children must share this account's type.
        accountType={account.account_type}
      />

      <LinkParentAccountDialog
        open={parentLinkOpen}
        onOpenChange={setParentLinkOpen}
        accountId={account.id}
        currentParentId={account.parent_account_id}
        currentParentName={parentAccount?.name}
        childCount={childAccountsTotal ?? childAccounts.length}
        // Parent must share this account's type.
        accountType={account.account_type}
      />
    </>
  )
}
