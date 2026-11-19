import { useState, type ReactNode } from "react"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"

import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"

/**
 * Building blocks shared by the Replacement and Sales Return approval panels,
 * so the two detail pages can't drift apart again (they were copy-pasted).
 */

/** The 4-up fact grid above the lines table (2-up on phones) — the same
 *  rhythm as the WMS detail `FactGrid`. Full-width facts use `col-span-full`. */
export function ApprovalFactGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">{children}</dl>
  )
}

/** Muted uppercase label over a value. */
export function HeaderFact({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Typography variant="micro" tone="muted" className="uppercase tracking-wider" asChild>
        <dt>{label}</dt>
      </Typography>
      <Typography variant="body" className="mt-0.5 min-w-0 font-medium" asChild>
        <dd>{children}</dd>
      </Typography>
    </div>
  )
}

/** A lines-table header cell — body size and bold, so the headers read as
 *  headers (they were 11px muted captions). */
export function HeadCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Typography variant="body-strong" asChild>
      <TableHead className={cn("h-11 font-semibold text-foreground", className)}>
        {children}
      </TableHead>
    </Typography>
  )
}

/** "Units" heading right above the lines table: count badge, plus any extra
 *  badges (the Replacement priority sits here). */
export function UnitsHeading({
  label,
  count,
  countLabel,
  extra,
}: {
  label: string
  count: number
  countLabel: string
  extra?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 pt-5 pb-2">
      <Typography variant="card-title">{label}</Typography>
      {count > 0 && <StatusBadge variant="neutral">{countLabel}</StatusBadge>}
      {extra}
    </div>
  )
}

/** Longest rejection reason shown in full under the verdict; longer ones cut
 *  here with an inline Show more / Show less toggle. */
const REASON_MAX_CHARS = 50

/**
 * Read-only verdict in the Actions column for a line the viewer can't act on:
 * icon + status, decision date, and — on a rejection — the reason (cut at 50
 * chars with a Show more toggle for the rest).
 */
export function DecidedStatus({
  label,
  tone,
  decidedAt,
  rejectionReason,
  note,
}: {
  label: string
  tone: "success" | "danger" | "muted"
  decidedAt?: string | null
  rejectionReason?: string | null
  /** Approval note, when there's no rejection reason. */
  note?: string | null
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : Clock
  const iconTone =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : "text-muted-foreground"
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", iconTone)} />
        <Typography variant="caption" tone={tone} className="font-semibold" asChild>
          <span>{label}</span>
        </Typography>
      </div>
      {decidedAt ? (
        <Typography variant="caption" tone="muted" asChild>
          <p>{formatIST_date(decidedAt)}</p>
        </Typography>
      ) : null}
      {rejectionReason ? (
        <RejectionReason reason={rejectionReason} />
      ) : note ? (
        <Typography
          variant="caption"
          className="max-w-[15rem] whitespace-normal break-words text-right italic"
          asChild
        >
          <p>{PM_APPROVALS_STRINGS.decided.quoted(note)}</p>
        </Typography>
      ) : null}
    </div>
  )
}

function RejectionReason({ reason }: { reason: string }) {
  const S = PM_APPROVALS_STRINGS.decided
  const [expanded, setExpanded] = useState(false)
  const long = reason.length > REASON_MAX_CHARS
  return (
    <div className="flex max-w-[15rem] flex-col items-end">
      <Typography
        variant="caption"
        className="whitespace-pre-wrap text-right [overflow-wrap:anywhere]"
        asChild
      >
        <p>
          <span className="font-medium text-muted-foreground">{S.rejectionReason} </span>
          {long && !expanded ? `${reason.slice(0, REASON_MAX_CHARS).trimEnd()}` : reason}
        </p>
      </Typography>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 inline-flex text-primary transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
        >
          <Typography variant="caption" tone="inherit">
            {expanded ? S.showLess : S.showMore}
          </Typography>
        </button>
      ) : null}
    </div>
  )
}
