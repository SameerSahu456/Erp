import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { ListPageShell } from "@/components/page-shells"
import { PermissionGuard, usePermission } from "@shared/rbac"
import { useAuth } from "@shared/auth/use-auth"

import { crmPermissions } from "../../permissions"
import { USER_TARGETS_STRINGS as S } from "../../components/user-targets/user-targets.strings"
import { UserTargetActionDialog } from "../../components/user-targets/UserTargetActionDialog"
import { UserTargetFormDialog } from "../../components/user-targets/UserTargetFormDialog"
import { usePendingApprovalCount } from "../../hooks/user-targets/useUserTargets"
import type { UserSalesTarget } from "../../api"
import { UserTargetsTable } from "./UserTargetsTable"

// Tab lives in the URL (`?tab=approvals`) so deep links / browser back
// restore it, matching the AccountsPage pattern.
type SaleTargetsTab = "all" | "approvals"

interface DialogState {
  form: {
    open: boolean
    mode: "create" | "edit" | "amend"
    row: UserSalesTarget | null
    // Pre-expands the Bifurcation accordion inside the form dialog so the
    // row-action "Bifurcation" button lands directly on the breakdown
    // editor. Ignored on create (no header id yet).
    expandBifurcation?: boolean
    // Opens the dialog in read-only mode — every input disabled, Save
    // hidden. Set when the viewer can't change the target at this status
    // (Approved / Pending for non-admin).
    viewOnly?: boolean
  }
  action: { open: boolean; kind: "approve" | "reject" | "discard"; row: UserSalesTarget | null }
}

const EMPTY_DIALOG: DialogState = {
  form: {
    open: false,
    mode: "create",
    row: null,
    expandBifurcation: false,
    viewOnly: false,
  },
  action: { open: false, kind: "approve", row: null },
}

function SaleTargetsPage() {
  const perm = usePermission()
  const { user: actor } = useAuth()
  const isAdminLike = perm.isSuperuser || perm.isAdminRole
  // Approve / reject is no longer admin-only: any manager (actor whose
  // reporting subtree contains the target subject) can approve as well.
  // The server enforces the hierarchy rule; the FE just enables the
  // buttons on every row and hides them on self-targets (where neither
  // admin nor manager can approve — nobody approves their own target).
  const canApprove = true
  const actorId = actor?.id ?? ""

  // Tab URL-sync — mirrors AccountsPage. Non-admin viewers never see the
  // Approvals tab, so a pasted `?tab=approvals` deep-link quietly falls
  // back to All Targets.
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
  const requestedTab: SaleTargetsTab =
    urlTab === "approvals" ? "approvals" : "all"
  const activeTab: SaleTargetsTab =
    requestedTab === "approvals" && !canApprove ? "all" : requestedTab

  const setTab = (next: SaleTargetsTab) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === "approvals") params.set("tab", "approvals")
        else params.delete("tab")
        // Each tab owns its own pager — reset on a deliberate tab click so
        // the inactive tab's `?page` doesn't carry over.
        params.delete("page")
        return params
      },
      { replace: true },
    )

  const [dialog, setDialog] = useState<DialogState>(EMPTY_DIALOG)
  const openCreate = () =>
    setDialog({ ...EMPTY_DIALOG, form: { open: true, mode: "create", row: null } })
  const openEdit = (row: UserSalesTarget) =>
    setDialog({ ...EMPTY_DIALOG, form: { open: true, mode: "edit", row } })
  const openAmend = (row: UserSalesTarget) =>
    setDialog({ ...EMPTY_DIALOG, form: { open: true, mode: "amend", row } })
  const openAction = (
    row: UserSalesTarget,
    kind: "approve" | "reject" | "discard",
  ) =>
    setDialog({ ...EMPTY_DIALOG, action: { open: true, kind, row } })
  // Row-action "Bifurcation" opens the form dialog with the accordion
  // pre-expanded. ``viewOnly`` comes from the table's row-level decision
  // (status + role) — the dialog disables inputs and hides Save when set.
  // Admins editing an Approved target land on the amend branch (status
  // stays Approved) rather than the edit branch (which would re-route).
  const openBifurcate = (row: UserSalesTarget, viewOnly: boolean) =>
    setDialog({
      ...EMPTY_DIALOG,
      form: {
        open: true,
        mode: row.status === "Approved" && isAdminLike ? "amend" : "edit",
        row,
        expandBifurcation: true,
        viewOnly,
      },
    })
  const closeDialog = () => setDialog(EMPTY_DIALOG)

  // Live badge count for the Approvals tab. Fetches 1 row of page_size=1 so
  // we only pull `.total`; the cache key is shared with the Approvals-tab
  // list query so a mutation that moves a row in/out of PendingApproval
  // refreshes the badge for free.
  // Admin sees the full approval inbox (``scope=all``); non-admin managers
  // see only pending targets in their reporting subtree (``scope=team``).
  const pendingCount = usePendingApprovalCount({
    enabled: canApprove,
    scope: isAdminLike ? "all" : "team",
  })

  const createButtonLabel = isAdminLike
    ? S.page.cta.setForAnyUser
    : S.page.cta.setForTeamMember

  return (
    <>
      <ListPageShell
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[
          { label: S.breadcrumbs.crm },
          { label: S.breadcrumbs.saleTargets },
        ]}
        actions={
          <PermissionGuard required={[crmPermissions.USER_TARGET_CREATE]}>
            <Button onClick={openCreate} className="h-9">
              <Plus className="mr-1 size-4" />
              {createButtonLabel}
            </Button>
          </PermissionGuard>
        }
        className="space-y-6 animate-fade-in-up"
      >
        <div className="space-y-3">
          {canApprove ? (
            <div className="cpt-tabs">
              <button
                type="button"
                className={cn("cpt-tab", activeTab === "all" && "active")}
                onClick={() => setTab("all")}
              >
                {S.page.tabs.all}
              </button>
              <button
                type="button"
                className={cn("cpt-tab", activeTab === "approvals" && "active")}
                onClick={() => setTab("approvals")}
              >
                {S.page.tabs.approvals}
                {pendingCount.count > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-warning-soft px-1.5">
                    <Typography variant="helper" tone="warning">
                      {pendingCount.count}
                    </Typography>
                  </span>
                ) : null}
              </button>
            </div>
          ) : null}

          <UserTargetsTable
            variant={activeTab}
            isAdminLike={isAdminLike}
            canApprove={canApprove}
            actorId={actorId}
            onEdit={openEdit}
            onAmend={openAmend}
            onBifurcate={openBifurcate}
            onAction={openAction}
          />
        </div>
      </ListPageShell>

      {dialog.form.open ? (
        <UserTargetFormDialog
          open
          mode={dialog.form.mode}
          target={dialog.form.row}
          defaultExpandBifurcation={dialog.form.expandBifurcation}
          isViewOnly={dialog.form.viewOnly}
          onSaved={closeDialog}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.action.open ? (
        <UserTargetActionDialog
          open
          kind={dialog.action.kind}
          target={dialog.action.row}
          onDone={closeDialog}
          onClose={closeDialog}
        />
      ) : null}

    </>
  )
}

export default SaleTargetsPage
