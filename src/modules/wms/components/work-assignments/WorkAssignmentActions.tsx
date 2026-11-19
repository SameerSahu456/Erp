/**
 * The lot's toolbar.
 *
 * Print the WHOLE lot's labels always; once lines are ticked in the table, also
 * print JUST those (Print Selected) or withdraw them. Selection is only offered
 * on actionable lines, so a non-empty selection is always safe to withdraw.
 */
import { Printer, UserMinus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentActionsProps {
  isPrinting: boolean
  selectedCount: number
  onPrintAll: () => void
  onPrintSelected: () => void
  /** Omitted when the viewer may not manage lots — the button is hidden. */
  onWithdraw?: () => void
}

export function WorkAssignmentActions({
  isPrinting,
  selectedCount,
  onPrintAll,
  onPrintSelected,
  onWithdraw,
}: WorkAssignmentActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={isPrinting} onClick={onPrintAll}>
        <Printer className="size-4" />
        {S.detail.printLabels}
      </Button>
      {selectedCount > 0 ? (
        <>
          <Button variant="outline" disabled={isPrinting} onClick={onPrintSelected}>
            <Printer className="size-4" />
            {S.detail.printSelected(selectedCount)}
          </Button>
          {onWithdraw ? (
            <Button variant="outline" onClick={onWithdraw}>
              <UserMinus className="size-4" />
              {S.detail.withdraw}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
