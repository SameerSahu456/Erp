import { CalendarClock, Clock } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { EMPTY_VALUE } from "@/shared/constants"
import { useAuth } from "@shared/auth/use-auth"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"

import type { ActionRequest } from "../../api/action-requests"
import { useCancelActionRequest } from "../../hooks/approvals/useActionRequests"
import { rentalsCan } from "../../permissions"
import { APPROVALS_STRINGS as S } from "./approvals.strings"

const B = S.banner

// Waiting on a decision reads as a warning; a scheduled termination is
// decided, so it reads as information.
const LOOK = {
  waiting: {
    box: "flex flex-wrap items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3",
    icon: "mt-0.5 size-5 shrink-0 text-warning",
    Icon: Clock,
    tone: "warning",
  },
  scheduled: {
    box: "flex flex-wrap items-start gap-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3",
    icon: "mt-0.5 size-5 shrink-0 text-info",
    Icon: CalendarClock,
    tone: "info",
  },
} as const

/** "Termination / deletion requested — waiting for approval" on the order or
 *  invoice it is against. Nothing has changed yet; the requester may
 *  withdraw it, and the queue is one click away.
 *
 *  A termination approved for a later date reads "scheduled" instead
 *  (2026-11-15): the order runs and bills up to that date, and a
 *  termination approver may call it off until then. */
export function PendingActionBanner({ request }: { request: ActionRequest | null }) {
  const { user } = useAuth()
  const canApproveTermination = usePermission().can([...rentalsCan.approveTermination])
  const cancel = useCancelActionRequest()
  if (!request) return null
  const scheduled = request.status === "scheduled"
  const date = request.effective_date ? formatIST_date(request.effective_date) : EMPTY_VALUE
  const canCancel = scheduled ? canApproveTermination : user?.id === request.requested_by
  // Terminations are decided in the Early exit queue (2026-11-15).
  const queue = request.subject === "terminate" ? "early-exit" : "invoice-delete"
  let title: string = B.invoiceDelete
  if (request.subject === "terminate") title = scheduled ? B.scheduled(date) : B.termination(date)
  const look = LOOK[scheduled ? "scheduled" : "waiting"]
  return (
    <div className={look.box}>
      <look.Icon className={look.icon} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <Typography variant="body-strong" tone={look.tone}>
          {title}
        </Typography>
        <Typography variant="helper" tone="muted" className="[overflow-wrap:anywhere]">
          {scheduled
            ? B.scheduledHelp
            : B.raised(request.requested_by_name ?? EMPTY_VALUE, formatIST_date(request.created_at), request.reason)}
        </Typography>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" render={<Link to={`/rentals/approvals?type=${queue}`} />}>
          {B.openQueue}
        </Button>
        {canCancel ? (
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ id: request.id, scheduled })}
          >
            {scheduled ? B.cancelScheduled : B.withdraw}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
