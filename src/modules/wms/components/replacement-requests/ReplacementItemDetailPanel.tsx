import { Typography } from "@/components/ui/typography"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { formatINRCompact } from "@/lib/currency"
import type { ReplacementRequestItemWire } from "@modules/crm"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { ReplacementItemStages } from "./ReplacementItemStages"

/** One flat key/value reason row — only rendered when the text is present. */
function ReasonRow({
  label,
  text,
  tone,
}: {
  label: string
  text: string
  tone?: "danger"
}) {
  return (
    <>
      <Typography variant="helper" tone="muted" className="pt-1">
        {label}
      </Typography>
      <ExpandableClampText
        text={text}
        lines={2}
        variant="body"
        tone={tone}
        className="min-w-0"
        showMoreLabel={S.detail.lines.showMore}
        showLessLabel={S.detail.lines.showLess}
      />
    </>
  )
}

/** Expandable panel under a unit row: journey, unit pair with links, provenance, waived reason. */
export function ReplacementItemDetailPanel({
  item,
  requestCreatedAt,
  isDifferent,
  substitute,
  cancelled,
}: {
  item: ReplacementRequestItemWire
  requestCreatedAt: string
  isDifferent: boolean
  substitute: string
  /** The request was cancelled: steps still open read "Cancelled". */
  cancelled: boolean
}) {
  return (
    // One consistent panel: the journey track, then four labelled facts in a
    // card, then any free-text reasons — full width, no extra left indent.
    <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-3.5">
      <ReplacementItemStages item={item} requestCreatedAt={requestCreatedAt} cancelled={cancelled} />

      {/* Substitute + any reasons — key/value rows beneath the stage tiles. */}
      <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-start gap-x-4 gap-y-3 border-t border-border/60 pt-4">
        {/* Substitute — like-for-like, or a different part with its rate/delta. */}
        <Typography variant="helper" tone="muted" className="pt-1">
          {S.detail.lines.columns.substitute}
        </Typography>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {isDifferent ? (
            <>
              <TruncatedText
                value={substitute}
                className="max-w-[16rem] font-medium"
              />
              {item.replacement_rate && (
                <Typography variant="helper" tone="muted" numeric>
                  {S.detail.lines.rate}:{" "}
                  {formatINRCompact(item.replacement_rate, { decimals: true })}
                </Typography>
              )}
              {item.price_delta && (
                <Typography
                  variant="helper"
                  // A credit (negative delta) shows in the danger tone with
                  // its minus (§0.12).
                  tone={Number(item.price_delta) < 0 ? "danger" : "muted"}
                  numeric
                >
                  {S.detail.lines.delta}:{" "}
                  {formatINRCompact(item.price_delta, { decimals: true })}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body">{S.detail.lines.samePart}</Typography>
          )}
        </div>

        {/* Issue / rejection / waived reasons — same flat rows, only when present. */}
        {item.issue_reason && (
          <ReasonRow label={S.detail.lines.issueReason} text={item.issue_reason} />
        )}
        {item.approval_status === "approved" && item.approval_notes && (
          <ReasonRow
            label={S.detail.lines.approvalNote}
            text={item.approval_notes}
          />
        )}
        {item.approval_status === "rejected" && item.rejection_reason && (
          <ReasonRow
            label={S.detail.lines.rejectionReason}
            text={item.rejection_reason}
            tone="danger"
          />
        )}
        {item.return_status === "waived" && item.return_waived_reason && (
          <ReasonRow
            label={S.detail.lines.waivedReason}
            text={item.return_waived_reason}
          />
        )}
      </div>
    </div>
  )
}
