import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import type { ReplacementRequestItemWire } from "@modules/crm"

import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { COLSPAN, carriesDeviceBack } from "./replacement-request-detail-helpers"
import { GroupBlock } from "./ReplacementGroupBlock"
import { ReplacementItemRow } from "./ReplacementItemRow"

/** One group of units: its optional bulk-approve row, then each unit's rows. */
export function ReplacementGroupRows({
  items,
  state,
  showSelection,
}: {
  items: ReplacementRequestItemWire[]
  state: ReplacementRequestDetailState
  showSelection: boolean
}) {
  const { rr, approveMany, canDecide, expanded, unitNo } = state
  if (!rr) return null
  const decidable = items.filter(canDecide)
  return (
    <GroupBlock>
      {decidable.length > 1 && (
        // Group bulk-approve: one batch call, confirmed first (§12).
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={showSelection ? COLSPAN + 1 : COLSPAN}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Typography variant="helper" tone="muted">
                {S.detail.lines.groupBulk(decidable.length)}
              </Typography>
              <ConfirmDialog
                title={S.detail.dialogs.approveGroupTitle}
                description={S.detail.dialogs.approveGroupBody(decidable.length)}
                confirmLabel={S.detail.dialogs.approveGroupConfirm(
                  decidable.length,
                )}
                onConfirm={() =>
                  approveMany.mutate({
                    rrId: rr.id,
                    itemIds: decidable.map((i) => i.id),
                  })
                }
                trigger={
                  <Button
                    size="sm"
                    // Spinner + disable while in flight (§9).
                    disabled={approveMany.isPending}
                  >
                    {approveMany.isPending &&
                      approveMany.variables?.itemIds?.[0] ===
                        decidable[0]?.id && (
                        <Loader2
                          className="size-4 animate-spin"
                          data-icon="inline-start"
                        />
                      )}
                    {S.detail.actions.approveGroup(decidable.length)}
                  </Button>
                }
              />
            </div>
          </TableCell>
        </TableRow>
      )}

      {items.map((item) => (
        <ReplacementItemRow
          key={item.id}
          rrId={rr.id}
          requestCreatedAt={rr.created_at}
          item={item}
          srNo={unitNo.get(item.id)}
          open={expanded.has(item.id)}
          decidable={canDecide(item)}
          showSelection={showSelection}
          selected={state.selection.selectedIds.has(item.id)}
          onSelect={() => state.selection.toggleSelected(item.id)}
          mayWaiveReturns={state.canWaiveReturns}
          carriesDeviceBack={carriesDeviceBack(item, rr.items ?? [])}
          mayReassign={state.canReassign}
          onReassign={() => state.setReassignTarget(item)}
          onNotNeeded={() => state.setNotNeededTarget(item)}
          onChangeOutcome={() => state.setOutcomeTarget(item)}
          onToggle={() => state.toggleExpanded(item.id)}
          approveOne={state.approveOne}
          setDialog={state.setDialog}
          requestCancelled={state.isCancelled}
        />
      ))}
    </GroupBlock>
  )
}
