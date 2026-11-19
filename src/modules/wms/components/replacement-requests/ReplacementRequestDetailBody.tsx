import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { DetailPageShell } from "@/components/page-shells"
import { isForbidden } from "@shared/api/envelope"
import { NoAccess } from "@/shared/components/feedback/NoAccess"

import {
  REPLACEMENT_PRIORITY_LABEL,
  REPLACEMENT_PRIORITY_VARIANT,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_VARIANT,
  type ReplacementPriority,
  type ReplacementRequestStatus,
} from "../../constants/replacement-request-status"
import { useReplacementRequestDetail } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { LIST_ROUTE } from "./replacement-request-detail-helpers"
import { ReplacementRequestOverviewCard } from "./ReplacementRequestOverviewCard"
import { ReplacementUnitsCard } from "./ReplacementUnitsCard"
import { ReplacementRequestReasonDialog } from "./ReplacementRequestReasonDialog"
import { EditReplacementRequestDialog } from "./EditReplacementRequestDialog"
import { ReplacementLineDialogs } from "./ReplacementLineDialogs"
import { RentalOrderTag } from "./RentalOrderTag"

export function ReplacementRequestDetailBody() {
  const state = useReplacementRequestDetail()
  const { rr, setDialog, canCancel, canEdit } = state
  const { isLoading, isError, error, refetch } = state.query

  if (isLoading) {
    // §0.6 — a skeleton, never a blank screen, while the record loads.
    return (
      <DetailPageShell title={S.list.title} backHref={LIST_ROUTE}>
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-md bg-muted" />
        </div>
      </DetailPageShell>
    )
  }
  if (isForbidden(error)) {
    // 403 — a no-access page, never the record or a generic load error.
    return (
      <DetailPageShell title={S.list.title} backHref={LIST_ROUTE}>
        <NoAccess />
      </DetailPageShell>
    )
  }
  if (isError) {
    // A fetch failure is not a missing record (§12) — offer a Retry, never the
    // "does not exist" copy.
    return (
      <DetailPageShell title={S.detail.error.title} backHref={LIST_ROUTE}>
        <EmptyState
          title={S.detail.error.title}
          description={S.detail.error.description}
          action={{ label: S.detail.error.retry, onClick: () => void refetch() }}
        />
      </DetailPageShell>
    )
  }
  if (!rr) {
    return (
      <DetailPageShell title={S.detail.notFound} backHref={LIST_ROUTE}>
        <EmptyState
          title={S.detail.notFound}
          description={S.detail.notFoundDescription}
        />
      </DetailPageShell>
    )
  }

  const priority = rr.priority as ReplacementPriority
  const status = rr.status as ReplacementRequestStatus

  return (
    <DetailPageShell
      title={rr.request_number}
      backHref={LIST_ROUTE}
      status={{
        label: REPLACEMENT_STATUS_LABEL[status] ?? rr.status,
        variant: REPLACEMENT_STATUS_VARIANT[status] ?? "neutral",
      }}
      badges={
        <>
          <StatusBadge variant={REPLACEMENT_PRIORITY_VARIANT[priority] ?? "neutral"}>
            {REPLACEMENT_PRIORITY_LABEL[priority] ?? rr.priority}
          </StatusBadge>
          <RentalOrderTag isRental={rr.is_rental_order} />
        </>
      }
      actions={
        // Cancel is pre-execution only, and hidden once the request is closed
        // (see `canCancel` in the hook).
        canCancel || canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button variant="outline" onClick={() => state.setEditing(true)}>
                {S.detail.actions.edit}
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="outline" onClick={() => setDialog({ kind: "cancel" })}>
                {S.detail.actions.cancel}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <ReplacementRequestOverviewCard rr={rr} />
        <ReplacementUnitsCard state={state} />
      </div>

      <ReplacementRequestReasonDialog state={state} />
      {state.editing ? (
        <EditReplacementRequestDialog rr={rr} open onOpenChange={state.setEditing} />
      ) : null}
      <ReplacementLineDialogs rrId={rr.id} state={state} />
    </DetailPageShell>
  )
}
