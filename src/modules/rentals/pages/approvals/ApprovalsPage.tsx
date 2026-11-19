import { ActionRequestsBody } from "../../components/approvals/ActionRequestsBody"
import { AgreementApprovalsBody } from "../../components/approvals/AgreementApprovalsBody"
import { ExtendApprovalsBody } from "../../components/approvals/ExtendApprovalsBody"
import { ApprovalTypeSwitch } from "../../components/approvals/ApprovalTypeSwitch"
import { APPROVALS_STRINGS as S } from "../../components/approvals/approvals.strings"
import { EarlyExitQueueBody } from "../../components/early-exit/EarlyExitQueueBody"
import { PoApprovalsBody } from "../../components/purchase-orders/PoApprovalsBody"
import { useApprovalType } from "../../hooks/approvals/useApprovalType"

/** Rentals → Approvals: every rental approval queue under one menu item —
 *  early exit (terminations with their waivers, 2026-11-15), PO extensions,
 *  rate-changing extends, invoice deletions and new-agreement configurations. Each queue keeps its
 *  own body and subtitle; the page owns the title and the switch between
 *  them (`?type=`). */
function ApprovalsPage() {
  const { type, types, setType } = useApprovalType()
  const header = {
    title: S.title,
    toolbar: <ApprovalTypeSwitch type={type} types={types} onChange={setType} />,
  }
  switch (type) {
    case "po":
      return <PoApprovalsBody header={header} />
    case "rate-change":
      return <ExtendApprovalsBody header={header} />
    case "invoice-delete":
      return <ActionRequestsBody header={header} />
    case "agreements":
      return <AgreementApprovalsBody header={header} />
    default:
      return <EarlyExitQueueBody header={header} />
  }
}

export default ApprovalsPage
