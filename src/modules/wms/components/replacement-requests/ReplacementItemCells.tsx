import { TableCell } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import type { ReplacementRequestItemWire } from "@modules/crm"

import {
  ITEM_APPROVAL_LABEL,
  ITEM_APPROVAL_VARIANT,
  ITEM_CANCELLED_LABEL,
  ITEM_CANCELLED_VARIANT,
  REPLACEMENT_DECISION_LABEL,
  REPLACEMENT_GENERATION_LABEL,
  type ItemApprovalStatus,
  type ReplacementDecision,
  type ReplacementGeneration,
  REPLACEMENT_IN_HOUSE_RETURN_LABEL,
  REPLACEMENT_PART_FITTED_BY_LABEL,
  REPLACEMENT_SWAP_LOCATION_LABEL,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { partLabel } from "./replacement-request-detail-helpers"

/** Decision + approval cells. On a cancelled request both read "Cancelled";
 *  a line already rejected keeps "Rejected" and its decision. */
function DecisionCells({ item, cancelled }: { item: ReplacementRequestItemWire; cancelled: boolean }) {
  const approval = item.approval_status as ItemApprovalStatus
  const showCancelled = cancelled && approval !== "rejected"
  return (
    <>
      <TableCell>
        <Typography variant="body">
          {showCancelled
            ? ITEM_CANCELLED_LABEL
            : REPLACEMENT_DECISION_LABEL[item.replacement_decision as ReplacementDecision]}
        </Typography>
      </TableCell>
      <TableCell>
        <StatusBadge variant={showCancelled ? ITEM_CANCELLED_VARIANT : ITEM_APPROVAL_VARIANT[approval]}>
          {showCancelled ? ITEM_CANCELLED_LABEL : ITEM_APPROVAL_LABEL[approval]}
        </StatusBadge>
      </TableCell>
    </>
  )
}

/** Part, serial, generation, decision, approval and substitute cells. */
export function ReplacementItemSummaryCells({
  item,
  serial,
  isDifferent,
  substitute,
  cancelled,
}: {
  item: ReplacementRequestItemWire
  serial: string | null | undefined
  isDifferent: boolean
  substitute: string
  /** The request was cancelled (see DecisionCells). */
  cancelled: boolean
}) {
  return (
    <>
      <TableCell className="max-w-[16rem]">
        {/* Trimmed cells reveal the full value in the styled hover tooltip (§0.14). */}
        <TruncatedText
          value={
            partLabel(item.original_part_name, item.original_variant_name) ||
            item.component_description ||
            S.detail.lines.unknownPart
          }
          className="block max-w-full font-medium"
        />
        {item.target === "component" && item.swap_location && (
          <Typography variant="caption" tone="muted" className="block">
            {item.swap_location === "in_house" && item.in_house_return
              ? S.detail.lines.inHouseCaption(
                  REPLACEMENT_SWAP_LOCATION_LABEL.in_house,
                  REPLACEMENT_IN_HOUSE_RETURN_LABEL[item.in_house_return],
                )
              : S.detail.lines.componentCaption(
                  REPLACEMENT_SWAP_LOCATION_LABEL[item.swap_location],
                )}
          </Typography>
        )}
        {item.target === "component" && item.original_internal_serial && (
          <Typography variant="caption" tone="muted" className="block">
            {S.detail.lines.inDevice(item.original_internal_serial)}
          </Typography>
        )}
        {item.part_fitted_by && (
          <Typography variant="caption" tone="muted" className="block">
            {S.detail.lines.fittedBy(REPLACEMENT_PART_FITTED_BY_LABEL[item.part_fitted_by])}
          </Typography>
        )}
      </TableCell>
      <TableCell className="max-w-[12rem]">
        {serial ? (
          <TruncatedSerial value={serial} className="max-w-full" />
        ) : item.target === "component" ? (
          // A part typed in or only described: not in the device, no serial.
          <Typography variant="helper" tone="muted" className="min-w-0">
            —
          </Typography>
        ) : (
          <Typography variant="helper" tone="muted" className="min-w-0">
            {S.detail.lines.anyUnit}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge
          variant={item.generation === "replacement" ? "info" : "neutral"}
        >
          {REPLACEMENT_GENERATION_LABEL[item.generation as ReplacementGeneration]}
        </StatusBadge>
      </TableCell>
      <DecisionCells item={item} cancelled={cancelled} />
      <TableCell className="max-w-[14rem]">
        {isDifferent ? (
          <TruncatedText value={substitute} className="block max-w-full" />
        ) : (
          <Typography variant="body" tone="muted">
            {S.detail.lines.none}
          </Typography>
        )}
      </TableCell>
    </>
  )
}
