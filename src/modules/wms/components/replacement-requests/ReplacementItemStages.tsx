import { type ReactNode } from "react"

import { Typography } from "@/components/ui/typography"
import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import { EntityRef } from "@/components/common/display/EntityRef"
import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"
import type { EntityKind } from "@shared/lib/entityRoutes"
import type { ReplacementRequestItemWire } from "@modules/crm"

import {
  ITEM_APPROVAL_LABEL,
  ITEM_APPROVAL_VARIANT,
  ITEM_CANCELLED_LABEL,
  ITEM_CANCELLED_VARIANT,
  ITEM_DISPATCH_LABEL,
  REPLACEMENT_NOT_NEEDED_REASON_LABEL,
  ITEM_DISPATCH_VARIANT,
  ITEM_RETURN_LABEL,
  ITEM_RETURN_VARIANT,
  type ItemApprovalStatus,
  type ItemDispatchStatus,
  type ItemReturnStatus,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

/** One numbered step in the unit's journey — a small step circle + muted label,
 *  then its status pill and the documents for that leg stacked beneath, so the
 *  serial / GRN (old unit) and the MI / DSP ids (replacement) line up in a
 *  single left-aligned column. Divides from its neighbour with a hairline:
 *  a left rule across the three columns on wide screens, a top rule when they
 *  stack on narrow ones. */
function JourneyStep({
  step,
  label,
  children,
}: {
  step: number
  label: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-t border-border/60 pt-3 first:border-t-0 first:pt-0",
        "sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 sm:first:border-l-0 sm:first:pl-0",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
          <Typography variant="caption" tone="muted" numeric>
            {step}
          </Typography>
        </span>
        <Typography variant="helper" tone="muted" className="min-w-0 truncate">
          {label}
        </Typography>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5">{children}</div>
    </div>
  )
}

/** A step's status pill; on a cancelled request a step that was still open
 *  reads "Cancelled" instead (what already happened keeps its own label). */
function StepBadge({
  cancelled,
  variant,
  label,
}: {
  cancelled: boolean
  variant: StatusBadgeVariant
  label: string
}) {
  return cancelled ? (
    <StatusBadge variant={ITEM_CANCELLED_VARIANT}>{ITEM_CANCELLED_LABEL}</StatusBadge>
  ) : (
    <StatusBadge variant={variant}>{label}</StatusBadge>
  )
}

/** A document reference (MI / DSP), truncating rather than pushing the column
 *  wide. EntityRef owns the colour and the no-access toast. */
function DocLink({ kind, id, children }: { kind: EntityKind; id: string | null | undefined; children: string }) {
  return (
    <Typography variant="helper" asChild className="min-w-0 max-w-full truncate font-medium">
      <EntityRef kind={kind} id={id} value={children} />
    </Typography>
  )
}

/** The unit's journey as three aligned steps — Decision, Old unit, Replacement —
 *  so every identifier (returned serial + GRN, outward serial + MI id + DSP id)
 *  sits in a tidy left-aligned column under its stage. Replaces the earlier
 *  flat 3-cell grid whose inline wrapped badges never lined up (CP-371). */
export function ReplacementItemStages({
  item,
  requestCreatedAt,
  cancelled,
}: {
  item: ReplacementRequestItemWire
  requestCreatedAt: string
  cancelled: boolean
}) {
  const approval = item.approval_status as ItemApprovalStatus
  const returnStatus = item.return_status as ItemReturnStatus
  const dispatch = item.dispatch_status as ItemDispatchStatus
  return (
    <div className="grid gap-4 sm:grid-cols-3 sm:gap-x-4">
      {/* 1 — Decision (approval). */}
      <JourneyStep step={1} label={S.detail.lines.approval}>
        <StepBadge
          cancelled={cancelled && approval !== "rejected"}
          variant={ITEM_APPROVAL_VARIANT[approval]}
          label={ITEM_APPROVAL_LABEL[approval]}
        />
        {item.decided_by_name && (
          <Typography variant="helper" tone="muted" className="min-w-0 break-words">
            {item.decided_by_name} ·{" "}
            {formatIST_date(
              item.approved_at ?? item.rejected_at ?? requestCreatedAt,
            )}
          </Typography>
        )}
      </JourneyStep>

      {/* 2 — Old unit (return): the returned serial and the GRN it came in on. */}
      <JourneyStep step={2} label={S.detail.lines.returnState}>
        <StepBadge
          cancelled={cancelled && returnStatus === "pending"}
          variant={ITEM_RETURN_VARIANT[returnStatus]}
          label={ITEM_RETURN_LABEL[returnStatus]}
        />
        {item.returned_internal_serial && (
          <TruncatedSerial
            value={item.returned_internal_serial}
            className="max-w-full font-medium"
          />
        )}
        {item.returned_grn_number && (
          <Typography variant="body-sm" tone="muted" className="min-w-0 truncate font-mono">
            {item.returned_grn_number}
          </Typography>
        )}
      </JourneyStep>

      {/* 3 — Replacement (dispatch): the outward serial, its MI id and DSP id. */}
      <JourneyStep step={3} label={S.detail.lines.dispatchState}>
        <StepBadge
          cancelled={cancelled && dispatch === "pending"}
          variant={ITEM_DISPATCH_VARIANT[dispatch]}
          label={ITEM_DISPATCH_LABEL[dispatch]}
        />
        {item.outward_internal_serial && (
          <TruncatedSerial
            value={item.outward_internal_serial}
            className="max-w-full font-medium"
          />
        )}
        {item.outward_mi_number && (
          <DocLink kind="material_issue" id={item.outward_material_issue_id}>
            {item.outward_mi_number}
          </DocLink>
        )}
        {item.outward_dispatch_number && (
          <DocLink kind="dispatch" id={item.outward_dispatch_request_id}>
            {item.outward_dispatch_number}
          </DocLink>
        )}
        {item.not_needed_reason && (
          <Typography variant="helper" tone="muted" className="min-w-0 break-words">
            {REPLACEMENT_NOT_NEEDED_REASON_LABEL[item.not_needed_reason]}
            {item.not_needed_at && ` · ${formatIST_date(item.not_needed_at)}`}
            {item.not_needed_notes && ` — ${item.not_needed_notes}`}
          </Typography>
        )}
      </JourneyStep>
    </div>
  )
}
