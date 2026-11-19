import { Ban, CircleCheck, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { TableCell, TableRow } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import type { SalesReturnRequestItemWire } from "@modules/crm"

import {
  SALES_RETURN_APPROVAL_LABEL,
  SALES_RETURN_APPROVAL_VARIANT,
  SALES_RETURN_REASON_LABEL,
  SALES_RETURN_RECEIPT_LABEL,
  SALES_RETURN_RECEIPT_VARIANT,
  type SalesReturnLineApproval,
  type SalesReturnLineReceipt,
  type SalesReturnReason,
} from "../../constants/sales-return-status"
import { RowToggleCell } from "../shared/RowToggleCell"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

/** Expand chevron for a rejected line; an empty cell keeps the column aligned. */
export function SalesReturnLineToggleCell({
  rejectionReason,
  open,
  onToggle,
}: {
  rejectionReason: string | null
  open: boolean
  onToggle: () => void
}) {
  if (!rejectionReason) return <TableCell className="w-8 px-2" />
  return (
    <RowToggleCell
      open={open}
      onToggle={onToggle}
      expandLabel={S.detail.lines.expandRow}
      collapseLabel={S.detail.lines.collapseRow}
    />
  )
}

/** Full-width row under a rejected line holding the approver's reason (CP-446). */
export function SalesReturnRejectionRow({
  rejectionReason,
  open,
  hideSelection,
  isTerminal,
}: {
  rejectionReason: string
  open: boolean
  hideSelection: boolean
  isTerminal: boolean
}) {
  // Sr, chevron, part, unit, reason, PM, dispatched, approval, receipt (9),
  // plus the optional selection and actions columns.
  const colSpan = 9 + (hideSelection ? 0 : 1) + (isTerminal ? 0 : 1)
  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <Collapsible open={open}>
          <CollapsibleContent>
            <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-start gap-x-4 border-t border-border bg-muted/20 px-4 py-3.5">
              <Typography variant="helper" tone="muted" className="pt-0.5">
                {S.detail.lines.rejectionReason}
              </Typography>
              {/* Full text, wrapped — never truncated (§8.7). */}
              <Typography
                variant="body"
                className="min-w-0 whitespace-pre-wrap break-words"
              >
                {rejectionReason}
              </Typography>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </TableCell>
    </TableRow>
  )
}

/** Pinned serial, else "specific unit" / "any unit" — never the raw pin UUID. */
export function SalesReturnLineSerialCell({
  item,
}: {
  item: SalesReturnRequestItemWire
}) {
  return (
    <TableCell className="max-w-[12rem]">
      {item.pinned_internal_serial ? (
        <TruncatedSerial value={item.pinned_internal_serial} />
      ) : (
        <Typography variant="caption" tone="muted">
          {item.pinned_dispatch_request_item_id
            ? S.detail.lines.specificUnit
            : S.detail.lines.noSerial}
        </Typography>
      )}
    </TableCell>
  )
}

export function SalesReturnLineReasonCell({
  item,
  headerReason,
}: {
  item: SalesReturnRequestItemWire
  headerReason: string
}) {
  return (
    <TableCell className="max-w-[14rem]">
      {/* Per-unit reason; a line saved without one falls
          back to the request's overall reason. */}
      <TruncatedText
        value={
          SALES_RETURN_REASON_LABEL[
            (item.item_reason ?? headerReason) as SalesReturnReason
          ]
        }
        className="block max-w-full"
      />
      {item.notes && (
        <TruncatedText
          value={item.notes}
          className="block max-w-full text-muted-foreground"
        />
      )}
    </TableCell>
  )
}

/** Approval + receipt cells; a cancelled request shows one neutral badge instead. */
export function SalesReturnLineStatusCells({
  item,
  isCancelled,
}: {
  item: SalesReturnRequestItemWire
  isCancelled: boolean
}) {
  return (
    <>
      <TableCell className="max-w-[14rem]">
        {isCancelled ? (
          <StatusBadge variant="neutral">
            {S.detail.lines.cancelledLine}
          </StatusBadge>
        ) : (
          // A rejected line's reason lives in its expandable row (CP-446).
          <StatusBadge
            variant={
              SALES_RETURN_APPROVAL_VARIANT[
                item.approval_status as SalesReturnLineApproval
              ] ?? "neutral"
            }
          >
            {SALES_RETURN_APPROVAL_LABEL[
              item.approval_status as SalesReturnLineApproval
            ] ?? item.approval_status}
          </StatusBadge>
        )}
      </TableCell>
      <TableCell>
        {isCancelled ? (
          <Typography variant="caption" tone="muted">
            {S.detail.lines.unknown}
          </Typography>
        ) : (
          <StatusBadge
            variant={
              SALES_RETURN_RECEIPT_VARIANT[
                item.receipt_status as SalesReturnLineReceipt
              ] ?? "neutral"
            }
          >
            {SALES_RETURN_RECEIPT_LABEL[
              item.receipt_status as SalesReturnLineReceipt
            ] ?? item.receipt_status}
          </StatusBadge>
        )}
      </TableCell>
    </>
  )
}

export function SalesReturnLineActionsCell({
  decidable,
  decidePending,
  onApprove,
  onReject,
}: {
  decidable: boolean
  decidePending: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <TableCell className="pr-4 text-right">
      {decidable ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label={S.detail.lines.rowActionsAria}
            disabled={decidePending}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onApprove}>
              <CircleCheck className="mr-2 size-4" />
              {S.detail.approval.approve}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onReject}>
              <Ban className="mr-2 size-4" />
              {S.detail.approval.reject}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Typography variant="caption" tone="muted">
          {S.detail.lines.unknown}
        </Typography>
      )}
    </TableCell>
  )
}
