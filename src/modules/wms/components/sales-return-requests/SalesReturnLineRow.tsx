import { useState } from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { formatIST_date } from "@shared/lib/date"
import type { SalesReturnRequestItemWire } from "@modules/crm"

import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"
import {
  SalesReturnLineActionsCell,
  SalesReturnLineReasonCell,
  SalesReturnLineSerialCell,
  SalesReturnLineStatusCells,
  SalesReturnLineToggleCell,
  SalesReturnRejectionRow,
} from "./SalesReturnLineCells"

interface SalesReturnLineRowProps {
  item: SalesReturnRequestItemWire
  srNo: number
  /** The request's overall reason — a line saved without one falls back to it. */
  headerReason: string
  decidable: boolean
  selected: boolean
  hideSelection: boolean
  isCancelled: boolean
  isTerminal: boolean
  decidePending: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}

/** One unit line of the sales-return detail table. */
export function SalesReturnLineRow({
  item,
  srNo,
  headerReason,
  decidable,
  selected,
  hideSelection,
  isCancelled,
  isTerminal,
  decidePending,
  onToggle,
  onApprove,
  onReject,
}: SalesReturnLineRowProps) {
  const assignedElsewhere = item.approval_status === "pending" && !decidable
  const [open, setOpen] = useState(false)
  const rejectionReason =
    item.approval_status === "rejected" ? item.rejection_reason : null
  const toggleOpen = () => setOpen((o) => !o)
  return (
    <>
      {/* A rejected line toggles its reason row on a row click too. */}
      <TableRow
        className={cn(rejectionReason && "cursor-pointer")}
        onClick={rejectionReason ? toggleOpen : undefined}
      >
        {/* Selection column leads, before Sr No; the
            whole column drops once no line can be decided — a
            terminal or fully approved header. */}
        {!hideSelection && (
          <TableCell className="w-10 pl-4">
            {/* Only a still-decidable (pending, in-scope) line gets a checkbox; a
                rejected/approved/assigned-elsewhere line shows none — it is no
                longer eligible for approval (CP-435). Empty cell keeps alignment. */}
            {decidable && (
              <Checkbox
                aria-label={S.detail.lines.selectAria(
                  item.part_name ?? S.detail.lines.unknown,
                )}
                checked={selected}
                onCheckedChange={onToggle}
              />
            )}
          </TableCell>
        )}
        <TableCell
          className={cn(
            "w-12 text-right align-middle tabular-nums text-muted-foreground",
            hideSelection && "pl-4",
          )}
        >
          {srNo}
        </TableCell>
        <SalesReturnLineToggleCell
          rejectionReason={rejectionReason}
          open={open}
          onToggle={toggleOpen}
        />
        <TableCell className="max-w-[16rem]">
          {/* Trimmed cells reveal the full value in the styled
              hover tooltip (§0.14), never a silent "…". */}
          <TruncatedText
            value={item.part_name}
            className="block max-w-full font-medium"
          />
          <TruncatedText
            value={item.variant_name}
            className="block max-w-full text-muted-foreground"
          />
        </TableCell>
        <SalesReturnLineSerialCell item={item} />
        <SalesReturnLineReasonCell item={item} headerReason={headerReason} />
        <TableCell className="max-w-[14rem]">
          {/* A cancelled request no longer routes to a PM — the
              assignment is moot, so it is not shown. */}
          <TruncatedText
            value={
              isCancelled
                ? null
                : (item.product_manager_name ?? S.detail.lines.unassigned)
            }
            className="block max-w-full text-muted-foreground"
          />
          {assignedElsewhere && !isCancelled && (
            <Typography variant="caption" tone="muted">
              {S.detail.approval.notYours}
            </Typography>
          )}
        </TableCell>
        <TableCell className="text-right">
          {/* The real dispatch date — same body font as the other
              columns, not a smaller/tabular caption.
              `formatIST_date` renders the `—` fallback. */}
          <Typography variant="body">
            {formatIST_date(item.dispatched_at)}
          </Typography>
        </TableCell>
        {/* On a cancelled request the live approval / receipt states are moot. */}
        <SalesReturnLineStatusCells item={item} isCancelled={isCancelled} />
        {!isTerminal && (
          <SalesReturnLineActionsCell
            decidable={decidable}
            decidePending={decidePending}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      </TableRow>
      {rejectionReason && (
        <SalesReturnRejectionRow
          rejectionReason={rejectionReason}
          open={open}
          hideSelection={hideSelection}
          isTerminal={isTerminal}
        />
      )}
    </>
  )
}
