import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { EntityRef } from "@/components/common/display/EntityRef"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@shared/api/envelope"

import {
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import {
  CANCEL_S,
  CLOSE_S,
  LINES_S,
  money,
  type CloseDialogProps,
  type TerminalDialogProps,
} from "./po-close-cancel-helpers"

export function POCloseDialog({
  po,
  rollup,
  returns = [],
  open,
  onOpenChange,
}: CloseDialogProps) {
  const [notes, setNotes] = useState("")
  const closePo = useClosePurchaseOrder()

  const pendingLines = po.items.filter(
    (it) => it.ordered_quantity - it.received_quantity > 0,
  )
  const pendingTotal = pendingLines.reduce(
    (s, it) => s + (it.ordered_quantity - it.received_quantity),
    0,
  )
  const isShortClose = pendingTotal > 0
  const notesMissing = isShortClose && !notes.trim()

  // Hard blocks (spec §8.3, server-enforced): a PO cannot close while any
  // returned unit is still undecided, or while vendor credit is unsettled.
  const undecidedUnits = rollup?.undecided_units ?? 0
  const creditPending = Number(rollup?.credit_pending ?? 0)
  const hasUndecided = undecidedUnits > 0
  const hasUnsettled = creditPending > 0
  const returnBlocked = hasUndecided || hasUnsettled
  // Units whose vendor credit is still pending (only refunds carry credit).
  const unsettledUnits = returns.reduce(
    (sum, r) =>
      sum + r.items.filter((it) => it.settlement_status === "pending").length,
    0,
  )
  // Deep-link the alerts to the offending return so the user can act on it.
  const undecidedReturn = returns.find((r) => r.undecided_count > 0)
  const unsettledReturn = returns.find((r) => Number(r.credit_pending) > 0)
  // If a close request slips past the UI guard, surface the server's own
  // message / businessCode instead of relying on the generic toast.
  const serverError =
    closePo.error instanceof ApiError ? closePo.error : null

  function reset(nextOpen: boolean) {
    if (!nextOpen) setNotes("")
    onOpenChange(nextOpen)
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={reset}
      title={CLOSE_S.title(po.po_number)}
      bodyClassName="space-y-4"
      // Typed notes are unsaved input — guard every close path (Esc / backdrop /
      // ×, and Cancel via requestClose) so they aren't silently dropped (§3.1/§9).
      isDirty={!!notes.trim()}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {CLOSE_S.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={notesMissing || returnBlocked || closePo.isPending}
            onClick={() =>
              closePo.mutate(
                { id: po.id, body: { notes: notes.trim() || null } },
                { onSuccess: () => reset(false) },
              )
            }
          >
            {CLOSE_S.confirm}
          </Button>
        </>
      )}
    >
        {hasUndecided && (
          <Alert variant="destructive">
            <AlertDescription>
              <Typography variant="body">
                {CLOSE_S.blockedUndecided(undecidedUnits)}
              </Typography>
              {undecidedReturn && (
                <Typography variant="body" asChild>
                  <EntityRef kind="purchase_return" id={undecidedReturn.id} value={undecidedReturn.pret_number}>
                    {CLOSE_S.blockedLinkResolve}
                  </EntityRef>
                </Typography>
              )}
            </AlertDescription>
          </Alert>
        )}
        {hasUnsettled && (
          <Alert variant="destructive">
            <AlertDescription>
              <Typography variant="body">
                {CLOSE_S.blockedUnsettled(
                  unsettledUnits,
                  money(rollup?.credit_pending ?? "0"),
                )}
              </Typography>
              {unsettledReturn && (
                <Typography variant="body" asChild>
                  <EntityRef kind="purchase_return" id={unsettledReturn.id} value={unsettledReturn.pret_number}>
                    {CLOSE_S.blockedLinkSettle}
                  </EntityRef>
                </Typography>
              )}
            </AlertDescription>
          </Alert>
        )}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>
              <Typography variant="body">{serverError.envMessage}</Typography>
            </AlertDescription>
          </Alert>
        )}
        <Typography variant="body" tone="muted" asChild>
          <p>{isShortClose ? CLOSE_S.shortCloseBody(pendingTotal) : CLOSE_S.fullyReceivedBody}</p>
        </Typography>
        {isShortClose && (
          <div className="space-y-1.5">
            <Typography variant="caption" tone="muted">
              {CLOSE_S.pendingLinesTitle}
            </Typography>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{LINES_S.partName}</TableHead>
                    <TableHead className="text-right">{LINES_S.ordered}</TableHead>
                    <TableHead className="text-right">{LINES_S.received}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLines.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.part_name ?? it.description ?? it.part_number}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.ordered_quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.received_quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Typography variant="caption" tone="muted">
            {isShortClose ? CLOSE_S.notesLabel : CLOSE_S.notesOptionalLabel}
          </Typography>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={CLOSE_S.notesPlaceholder}
            autoFocus
          />
          {notesMissing && (
            <Typography variant="helper" tone="muted">
              {CLOSE_S.notesRequiredError}
            </Typography>
          )}
        </div>
    </OperationDialog>
  )
}

/** Cancel confirmation — "created in error". The backend only allows this
 *  while the PO is issued with zero receipts; the reason is always required. */
export function POCancelDialog({ po, open, onOpenChange }: TerminalDialogProps) {
  const [notes, setNotes] = useState("")
  const cancelPo = useCancelPurchaseOrder()

  function reset(nextOpen: boolean) {
    if (!nextOpen) setNotes("")
    onOpenChange(nextOpen)
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={reset}
      title={CANCEL_S.title(po.po_number)}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button variant="outline" onClick={() => reset(false)}>
            {CANCEL_S.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={!notes.trim() || cancelPo.isPending}
            onClick={() =>
              cancelPo.mutate(
                { id: po.id, body: { notes: notes.trim() } },
                { onSuccess: () => reset(false) },
              )
            }
          >
            {CANCEL_S.confirm}
          </Button>
        </>
      }
    >
        <Typography variant="body" tone="muted" asChild>
          <p>{CANCEL_S.body}</p>
        </Typography>
        <div className="space-y-1.5">
          <Typography variant="caption" tone="muted">
            {CANCEL_S.notesLabel}
          </Typography>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={CANCEL_S.notesPlaceholder}
            autoFocus
          />
        </div>
    </OperationDialog>
  )
}
