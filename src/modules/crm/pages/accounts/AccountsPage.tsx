import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ListPageShell } from "@/components/page-shells"
import { PermissionGuard, usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"
import { AccountsTable } from "../../components/accounts/AccountsTable"
import { AccountApprovalTable } from "../../components/accounts/AccountApprovalTable"
import { AccountAccessTable } from "../../components/accounts/AccountAccessTable"
import { useAccountsList } from "../../hooks/accounts/useAccountsList"
import { useRejectedAccounts } from "../../hooks/accounts/useRejectedAccounts"
import { useAccountApprovals } from "../../hooks/accounts/useAccountApprovals"
import { useAccessRequests } from "../../hooks/accounts/useAccessRequests"

type AccountsTab = "accounts" | "approval" | "access" | "rejected"

function AccountsPage() {
  // Tab lives in the URL (`?tab=approval|access`) so returning from an account
  // detail page (browser back or the detail "Back" button) restores it.
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
  const tab: AccountsTab =
    urlTab === "approval"
      ? "approval"
      : urlTab === "access"
        ? "access"
        : urlTab === "rejected"
          ? "rejected"
          : "accounts"
  // The Rejected tab is admin-only: visible to is_superuser OR the
  // ADMIN/SUPERADMIN roles. `isAdminRole` only covers the role names, so OR in
  // `isSuperuser` — otherwise a superuser whose role name isn't literally
  // ADMIN/SUPERADMIN can't see the tab (the Approval/Access tabs already get
  // this via their `can()`-based gate, which has the superuser bypass).
  const { isAdminRole, isSuperuser } = usePermission()
  const showRejected = isAdminRole || isSuperuser
  // Both approver tabs expose `canApprove` (permission-derived, no fetch) so
  // tab visibility works without firing either query off-tab.
  const approvals = useAccountApprovals({ enabled: tab === "approval" })
  const access = useAccessRequests({ enabled: tab === "access" })
  // Approver-only tabs; keep the active tab in sync if the user somehow lands
  // on one without the permission (including a pasted `?tab=rejected` deep link
  // from a non-admin — fall back to All Accounts so rejected data never shows).
  const showApproval = approvals.canApprove
  const showAccess = access.canApprove
  const activeTab: AccountsTab =
    (tab === "approval" && !showApproval) ||
    (tab === "access" && !showAccess) ||
    (tab === "rejected" && !showRejected)
      ? "accounts"
      : tab
  // Each tab fetches only its own data — the inactive tabs' queries stay idle so
  // we never fire multiple APIs at once.
  const list = useAccountsList({ enabled: activeTab === "accounts" })
  // Gate the rejected fetch on admin AND active tab — never fires for non-admins.
  const rejected = useRejectedAccounts({
    enabled: activeTab === "rejected" && showRejected,
  })
  const setTab = (next: AccountsTab) =>
    // Each tab owns its own pager — reset them all on an explicit tab switch so
    // the accounts page (`?page`), approvals (`?ap_page`) and access
    // (`?acc_page`) never carry over. (Navigating into a detail + back keeps the
    // params, so the page is restored there — only a deliberate tab click resets.)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === "approval") params.set("tab", "approval")
        else if (next === "access") params.set("tab", "access")
        else if (next === "rejected") params.set("tab", "rejected")
        else params.delete("tab")
        params.delete("page")
        params.delete("ap_page")
        params.delete("acc_page")
        params.delete("rej_page")
        return params
      },
      { replace: true },
    )

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      breadcrumbs={[{ label: S.breadcrumbs.crm }, { label: S.breadcrumbs.accounts }]}
      actions={
        <PermissionGuard required={[...crmCan.writeAccount]}>
          <Button onClick={list.openAccountNew} className="h-9">
            <Plus className="mr-1 size-4" />
            {S.list.addAccount}
          </Button>
        </PermissionGuard>
      }
      className="animate-fade-in-up"
    >
      <div className="space-y-3">
        {(showApproval || showAccess || showRejected) && (
          <div className="cpt-tabs">
            <button
              type="button"
              className={cn("cpt-tab", activeTab === "accounts" && "active")}
              onClick={() => setTab("accounts")}
            >
              All Accounts
            </button>
            {showApproval && (
              <button
                type="button"
                className={cn("cpt-tab", activeTab === "approval" && "active")}
                onClick={() => setTab("approval")}
              >
                Approval
              </button>
            )}
            {showAccess && (
              <button
                type="button"
                className={cn("cpt-tab", activeTab === "access" && "active")}
                onClick={() => setTab("access")}
              >
                Access
              </button>
            )}
            {showRejected && (
              <button
                type="button"
                className={cn("cpt-tab", activeTab === "rejected" && "active")}
                onClick={() => setTab("rejected")}
              >
                Rejected
              </button>
            )}
          </div>
        )}

        {activeTab === "approval" ? (
          <AccountApprovalTable c={approvals} />
        ) : activeTab === "access" ? (
          <AccountAccessTable c={access} />
        ) : activeTab === "rejected" ? (
          <AccountsTable list={rejected} showAccess={false} rejected />
        ) : (
          <AccountsTable list={list} />
        )}
      </div>
    </ListPageShell>
  )
}

export default AccountsPage
