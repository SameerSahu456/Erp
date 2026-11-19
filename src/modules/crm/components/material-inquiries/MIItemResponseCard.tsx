import { useEffect, useState } from "react"
import { Clock, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatINRCompact } from "@/lib/currency"

import { useMIResponsesForItem } from "@modules/procurement"
import type { ProcMIResponsePMStatus } from "@modules/procurement"

import type { MaterialInquiryItemWire } from "../../api"
import { AddMIResponseDialog } from "./AddMIResponseDialog"
import { MIResponseRow } from "./MIResponseRow"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MIItemResponseCard({
  miId,
  item,
  initialDialogOpen,
  onDialogClose,
}: {
  miId: string
  item: MaterialInquiryItemWire
  initialDialogOpen: boolean
  onDialogClose: () => void
}) {
  const responsesQuery = useMIResponsesForItem(miId, item.id)
  const responses = responsesQuery.data ?? []
  const [dialogOpen, setDialogOpen] = useState(initialDialogOpen)

  // Sync open state with the parent's "click chip in alert" hint.
  useEffect(() => {
    if (initialDialogOpen) setDialogOpen(true)
  }, [initialDialogOpen])

  // Counts for the header strip — driven by the live procurement response list.
  const counts = responses.reduce(
    (acc, r) => {
      acc[r.pm_status] = (acc[r.pm_status] ?? 0) + 1
      return acc
    },
    {} as Record<ProcMIResponsePMStatus, number>,
  )

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm">{item.item_name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {S.itemResponseCard.qtyPrefix(item.qty_requested)}
            {item.client_budget_per_unit != null
              ? S.itemResponseCard.budgetPart(
                  formatINRCompact(item.client_budget_per_unit, { decimals: true }),
                )
              : ""}
            {item.client_timeline
              ? S.itemResponseCard.timelinePart(item.client_timeline)
              : ""}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(next) => {
            setDialogOpen(next)
            if (!next) onDialogClose()
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-1 size-3.5" />
            {S.itemResponseCard.addResponse}
          </DialogTrigger>
          <AddMIResponseDialog
            miId={miId}
            itemId={item.id}
            onSaved={() => {
              setDialogOpen(false)
              onDialogClose()
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {responsesQuery.isLoading && responses.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {S.itemResponseCard.loading}
          </p>
        ) : responsesQuery.isError ? (
          <LoadErrorState
            error={responsesQuery.error}
            fallback={S.itemResponseCard.loadError}
            compact
          />
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/10 py-6 text-center">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Clock className="size-3.5" />
            </span>
            <p className="text-sm italic text-muted-foreground">
              {S.itemResponseCard.empty}
            </p>
          </div>
        ) : (
          <>
            {/* Status counts strip */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
              {counts.approved ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {S.itemResponseCard.counts.approved(counts.approved)}
                </span>
              ) : null}
              {counts.pending ? (
                <span className="inline-flex items-center gap-1 text-status-warning-text">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {S.itemResponseCard.counts.pending(counts.pending)}
                </span>
              ) : null}
              {counts.rejected ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <span className="size-1.5 rounded-full bg-destructive" />
                  {S.itemResponseCard.counts.rejected(counts.rejected)}
                </span>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{S.itemResponseCard.columns.vendor}</TableHead>
                    <TableHead className="text-right">{S.itemResponseCard.columns.qtyAvail}</TableHead>
                    <TableHead className="text-right">{S.itemResponseCard.columns.costPerUnit}</TableHead>
                    <TableHead className="text-right">{S.itemResponseCard.columns.sellPerUnit}</TableHead>
                    <TableHead>{S.itemResponseCard.columns.available}</TableHead>
                    <TableHead>{S.itemResponseCard.columns.status}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((r) => (
                    <MIResponseRow key={r.id} miId={miId} itemId={item.id} response={r} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
