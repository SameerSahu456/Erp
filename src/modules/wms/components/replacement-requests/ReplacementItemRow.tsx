import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import type { ReplacementRequestItemWire } from "@modules/crm"

import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { COLSPAN, lineActionGates, partLabel } from "./replacement-request-detail-helpers"
import { GroupBlock } from "./ReplacementGroupBlock"
import { ReplacementItemActionsMenu } from "./ReplacementItemActionsMenu"
import { ReplacementItemDetailPanel } from "./ReplacementItemDetailPanel"
import { RowToggleCell } from "../shared/RowToggleCell"
import { ReplacementItemSummaryCells } from "./ReplacementItemCells"

/** One physical unit: its scannable row plus its expandable detail row. */
export function ReplacementItemRow({
  rrId,
  requestCreatedAt,
  item,
  srNo,
  open,
  decidable,
  showSelection,
  selected,
  onSelect,
  mayWaiveReturns,
  carriesDeviceBack,
  mayReassign,
  onReassign,
  onNotNeeded,
  onChangeOutcome,
  onToggle,
  approveOne,
  setDialog,
  requestCancelled,
}: {
  rrId: string
  requestCreatedAt: string
  item: ReplacementRequestItemWire
  srNo: number | undefined
  open: boolean
  decidable: boolean
  /** The table has a selection column; only a decidable unit gets a checkbox. */
  showSelection: boolean
  selected: boolean
  onSelect: () => void
  /** The viewer holds the write-off codes (the waive endpoint's gate). */
  mayWaiveReturns: boolean
  /** The only open line of an in-house device — it ships the device back. */
  carriesDeviceBack: boolean
  /** The viewer may reassign lines (the reassign endpoint's gate). */
  mayReassign: boolean
  onReassign: () => void
  /** Opens the "not needed" dialog for this line (spec D13). */
  onNotNeeded: () => void
  /** Opens the repair-or-replace dialog for this line (spec D15). */
  onChangeOutcome: () => void
  onToggle: () => void
  approveOne: ReplacementRequestDetailState["approveOne"]
  setDialog: ReplacementRequestDetailState["setDialog"]
  /** The request was cancelled: the line reads "Cancelled" and offers no actions. */
  requestCancelled: boolean
}) {
  const { canWaive, canMarkNotNeeded, canChangeOutcome, pendingNotYours, canReassign, hasMenu } =
    lineActionGates(item, { decidable, mayWaiveReturns, mayReassign, carriesDeviceBack })
  // Left for the engineer (spec D14): once the issue fits a part it shows
  // like a substitute; until then the line says the engineer decides.
  const awaitingEngineer =
    item.replacement_decision === "to_be_decided" && !item.replacement_part_variant_id
  const isDifferent =
    item.replacement_decision === "different_part" ||
    (item.replacement_decision === "to_be_decided" && !awaitingEngineer)
  const substitute = awaitingEngineer
    ? S.detail.lines.engineerDecides
    : partLabel(item.replacement_part_name, item.replacement_variant_name) || S.detail.lines.none
  // A component line shows the part's own serial — only a part recorded in
  // the device has one; the device's serial goes under the part instead.
  // A whole unit: the actual returned serial, else the pinned one, else "any
  // unit of this model".
  const isComponent = item.target === "component"
  const serial = isComponent
    ? item.component_internal_serial
    : item.returned_internal_serial || item.original_internal_serial
  return (
    <GroupBlock>
      {/* The scannable row. */}
      <TableRow>
        {showSelection && (
          <TableCell className="w-10 pl-4">
            {decidable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelect}
                aria-label={S.detail.lines.selectUnit}
              />
            )}
          </TableCell>
        )}
        <TableCell className="w-12 pl-4 text-right tabular-nums text-muted-foreground">
          {srNo}
        </TableCell>
        <RowToggleCell
          open={open}
          onToggle={onToggle}
          expandLabel={S.detail.lines.expandRow}
          collapseLabel={S.detail.lines.collapseRow}
        />
        <ReplacementItemSummaryCells
          item={item}
          serial={serial}
          isDifferent={isDifferent || awaitingEngineer}
          substitute={substitute}
          cancelled={requestCancelled}
        />
        <TableCell className="w-12 text-right">
          {hasMenu && !requestCancelled && (
            <ReplacementItemActionsMenu
              rrId={rrId}
              item={item}
              decidable={decidable}
              canWaive={canWaive}
              canMarkNotNeeded={canMarkNotNeeded}
              onNotNeeded={onNotNeeded}
              canChangeOutcome={canChangeOutcome}
              onChangeOutcome={onChangeOutcome}
              canReassign={canReassign}
              onReassign={onReassign}
              pendingNotYours={pendingNotYours}
              approveOne={approveOne}
              setDialog={setDialog}
            />
          )}
        </TableCell>
      </TableRow>

      {/* Expandable detail row (see ReplacementItemDetailPanel). */}
      <TableRow className="border-0 hover:bg-transparent">
        <TableCell colSpan={showSelection ? COLSPAN + 1 : COLSPAN} className="p-0">
          <Collapsible open={open}>
            <CollapsibleContent>
              <ReplacementItemDetailPanel
                item={item}
                requestCreatedAt={requestCreatedAt}
                isDifferent={isDifferent || awaitingEngineer}
                substitute={substitute}
                cancelled={requestCancelled}
              />
            </CollapsibleContent>
          </Collapsible>
        </TableCell>
      </TableRow>
    </GroupBlock>
  )
}
