import { Info } from "lucide-react"

import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Typography } from "@/components/ui/typography"

import type { QuoteItemWire } from "../../api"
import { QUOTES_STRINGS } from "./quotes.strings"

const A = QUOTES_STRINGS.approval

type QuoteItemStatus = QuoteItemWire["status"]

const STATUS_VARIANT: Record<QuoteItemStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  "Pending Approval": "warning",
  Approved: "success",
  Rejected: "error",
}

export function ApproverCell({ item }: { item: QuoteItemWire }) {
  if (!item.approver_name) {
    // Lines that skip approval (no PM assigned) are Approved with no approver —
    // that is not "missing". Only a line still waiting on someone is.
    const waiting = item.status === "Pending Approval"
    return (
      <Typography variant="helper" tone={waiting ? "danger" : "muted"}>
        {waiting ? A.missing : "—"}
      </Typography>
    )
  }
  return (
    <Typography variant="helper" className="block truncate" title={item.approver_name}>
      {item.approver_name}
    </Typography>
  )
}

export function StatusCell({ item }: { item: QuoteItemWire }) {
  const isRejected = item.status === "Rejected"
  const reason =
    isRejected || item.status === "Approved" ? item.approval_notes?.trim() : null
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <StatusBadge variant={STATUS_VARIANT[item.status] ?? "neutral"}>{item.status}</StatusBadge>
      {reason && (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={`inline-flex shrink-0 cursor-help ${isRejected ? "text-destructive" : "text-success"}`}
                  aria-label={isRejected ? A.rejectionReason : A.approvalReason}
                >
                  <Info className="size-3.5" />
                </span>
              }
            />
            <TooltipContent className="whitespace-pre-wrap">{reason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  )
}
