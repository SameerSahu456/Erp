import { Loader2, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ReplacementRequestItemWire } from "@modules/crm"

import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

/** The per-unit row menu: approve / reject (the assigned PM only), reassign a
 *  pending line's approver, write off an outstanding return, close a component
 *  line as not needed, repair or replace an in-house part, or a disabled
 *  "not yours" note. */
export function ReplacementItemActionsMenu({
  rrId,
  item,
  decidable,
  canWaive,
  canMarkNotNeeded,
  onNotNeeded,
  canChangeOutcome,
  onChangeOutcome,
  canReassign,
  onReassign,
  pendingNotYours,
  approveOne,
  setDialog,
}: {
  rrId: string
  item: ReplacementRequestItemWire
  decidable: boolean
  canWaive: boolean
  canMarkNotNeeded: boolean
  onNotNeeded: () => void
  canChangeOutcome: boolean
  onChangeOutcome: () => void
  canReassign: boolean
  onReassign: () => void
  pendingNotYours: boolean
  approveOne: ReplacementRequestDetailState["approveOne"]
  setDialog: ReplacementRequestDetailState["setDialog"]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={S.detail.lines.rowActions}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {decidable && (
          <>
            <DropdownMenuItem
              disabled={approveOne.isPending}
              onClick={() =>
                approveOne.mutate({
                  rrId,
                  itemId: item.id,
                })
              }
            >
              {approveOne.isPending &&
                approveOne.variables?.itemId === item.id && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
              {S.detail.actions.approve}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                setDialog({
                  kind: "reject",
                  itemId: item.id,
                })
              }
            >
              {S.detail.actions.reject}
            </DropdownMenuItem>
          </>
        )}
        {canWaive && (
          <DropdownMenuItem
            onClick={() =>
              setDialog({
                kind: "waive",
                itemId: item.id,
              })
            }
          >
            {S.detail.actions.waive}
          </DropdownMenuItem>
        )}
        {canMarkNotNeeded && (
          <DropdownMenuItem onClick={onNotNeeded}>{S.detail.actions.notNeeded}</DropdownMenuItem>
        )}
        {canChangeOutcome && (
          <DropdownMenuItem onClick={onChangeOutcome}>
            {S.detail.actions.changeOutcome}
          </DropdownMenuItem>
        )}
        {canReassign && (
          <DropdownMenuItem onClick={onReassign}>{S.detail.actions.reassign}</DropdownMenuItem>
        )}
        {pendingNotYours && !canReassign && (
          <DropdownMenuItem disabled>{S.detail.actions.notYours}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
