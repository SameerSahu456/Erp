import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { ChangeReplacementOutcomeDialog } from "./ChangeReplacementOutcomeDialog"
import { NotNeededReplacementLineDialog } from "./NotNeededReplacementLineDialog"
import { ReassignReplacementLineDialog } from "./ReassignReplacementLineDialog"

/** The per-line dialogs of the detail page — reassign an approver, close a
 *  component line as not needed, repair or replace an in-house part. Each
 *  mounts only while its line is chosen. */
export function ReplacementLineDialogs({
  rrId,
  state,
}: {
  rrId: string
  state: ReplacementRequestDetailState
}) {
  return (
    <>
      {state.reassignTarget ? (
        <ReassignReplacementLineDialog
          rrId={rrId}
          item={state.reassignTarget}
          onClose={() => state.setReassignTarget(null)}
        />
      ) : null}
      {state.notNeededTarget ? (
        <NotNeededReplacementLineDialog
          rrId={rrId}
          item={state.notNeededTarget}
          onClose={() => state.setNotNeededTarget(null)}
        />
      ) : null}
      {state.outcomeTarget ? (
        <ChangeReplacementOutcomeDialog
          rrId={rrId}
          item={state.outcomeTarget}
          onClose={() => state.setOutcomeTarget(null)}
        />
      ) : null}
    </>
  )
}
