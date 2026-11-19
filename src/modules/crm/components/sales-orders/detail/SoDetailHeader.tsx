import type { ReactNode } from "react"
import { GitBranch, Loader2, Pencil, Send, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../../permissions"
import type { SalesOrderWire } from "../../../api"
import type { SalesOrderDetailController } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { SO_STATUS_LABELS, SO_STATUS_VARIANT } from "../../../constants/so-status"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

/** What a page reusing the SO layout may replace in its header. The rentals
 *  agreement page shows the AGREEMENT's status and the rental actions here,
 *  not the order's Edit / Submit / Amend, which belong to CRM. */
export interface SoDetailHeaderOverrides {
  /** Replaces every CRM action when given (the agreement page puts the
   *  rental Actions menu here). */
  actions?: ReactNode
  status?: { label: string; variant: StatusBadgeVariant }
  /** Extra chips after the version pill, e.g. the order's own SO status. */
  extraBadges?: ReactNode
  backHref?: string
  onBack?: () => void
}

export function SoDetailHeader({
  so,
  detail,
  overrides,
}: {
  so: SalesOrderWire
  detail: SalesOrderDetailController
  overrides?: SoDetailHeaderOverrides
}) {
  const { isDraft, navigate, submitMut, reviseMut } = detail
  const backHref = overrides?.backHref ?? detail.backHref
  const goBack = overrides?.onBack ?? detail.goBack

  // Edit is only for Drafts. Once an SO leaves Draft the only mutation path
  // is Amend, which POSTs /revise — the backend spawns v(N+1) Draft and
  // demotes the source row to Amend (is_latest_order=false). The mutation
  // handler navigates to the new SO on success. Mirrors backend
  // SO_REVISABLE_STATUSES = {Submitted, PartiallyApproved, Approved, Rejected,
  // Account Rejected}. A Rejected account (KYC failure) overrides this and
  // locks every SO on it — sales must raise a fresh SO against an approved
  // account instead; the backend enforces this with SO_REVISE_ACCOUNT_REJECTED.
  const canEdit = so.status === "Draft"
  const accountRejected = so.account_approval_status === "Rejected"
  const canAmend =
    !accountRejected &&
    (so.status === "Submitted" ||
      so.status === "PartiallyApproved" ||
      so.status === "Approved" ||
      so.status === "Rejected" ||
      so.status === "Account Rejected")

  return (
    <EntityHeader
      sticky
      title={so.order_number}
      titleCopyable
      status={
        overrides?.status ?? {
          label: SO_STATUS_LABELS[so.status] ?? so.status,
          variant: SO_STATUS_VARIANT[so.status] ?? "neutral",
        }
      }
      // Version pill + auto-derived Rental / Sale chips ride alongside the
      // status pill. Version is always shown so amended revisions (v2+) are
      // distinguishable from the original at a glance.
      badges={
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] tabular-nums">
            v{so.version_number}
          </Badge>
          {so.labels.map((l) => (
            <Badge
              key={l}
              variant="secondary"
              className="uppercase text-[10px] tracking-wide"
            >
              {l}
            </Badge>
          ))}
          {/* Bills a rental deficiency; WMS never offers it for dispatch. */}
          {so.order_kind === "charge" && (
            <Badge variant="warning" className="uppercase text-[10px] tracking-wide">
              {S.list.chargeBadge}
            </Badge>
          )}
          {overrides?.extraBadges}
        </span>
      }
      backHref={backHref}
      // ALWAYS an explicit destination — never `EntityHeader`'s default
      // `useNavigateBack`. Saving the edit form lands here via
      // `navigate(url, { replace: true })`, so the history entry behind this
      // page is the stale form / pre-edit copy (or nothing, when the form was
      // opened directly) and `navigate(-1)` goes nowhere useful. `goBack`
      // resolves the real origin page instead — see `useSalesOrderDetail`.
      onBack={goBack}
      actions={
        overrides?.actions ?? (
        <>
          {/* No rental "Actions" dropdown here (removed 2026-10-29): the
              rental lifecycle actions live in Rentals — the agreement page's
              header and the `⋯` on the rentals register. */}
          {canEdit && (
            <PermissionGuard required={[...crmCan.writeSo]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/crm/sales-orders/${so.id}/edit`)}
              >
                <Pencil className="mr-1 size-3.5" />
                {S.detail.edit}
              </Button>
            </PermissionGuard>
          )}
          {isDraft && (
            <>
              {/* SO has no per-resource delete code; soft-delete is gated
                  on `crm:so_manage` per spec §"Role × resource permission matrix". */}
              <PermissionGuard required={[...crmCan.manageSo]}>
                <Button
                  variant="danger-light"
                  size="sm"
                  onClick={() => detail.setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  {S.detail.delete}
                </Button>
              </PermissionGuard>
              <PermissionGuard required={[...crmCan.writeSo]}>
                <Button
                  size="sm"
                  onClick={() => detail.setSubmitOpen(true)}
                  disabled={submitMut.isPending}
                >
                  {submitMut.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 size-3.5" />
                  )}
                  {S.detail.submit}
                </Button>
              </PermissionGuard>
            </>
          )}
          {canAmend && (
            <PermissionGuard required={[...crmCan.writeSo]}>
              <Button
                variant="outline"
                size="sm"
                // Every revisable status opens the reason modal first. On
                // confirm, handleRevise branches: "Account Rejected" hands off
                // to the full amend form (new approved account + editable line
                // items); every other status /revises in place. (See
                // useSalesOrderDetail.handleRevise.)
                onClick={() => detail.setReviseOpen(true)}
                disabled={reviseMut.isPending}
              >
                {reviseMut.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <GitBranch className="mr-1.5 size-3.5" />
                )}
                {S.detail.amend}
              </Button>
            </PermissionGuard>
          )}
        </>
        )
      }
    />
  )
}
