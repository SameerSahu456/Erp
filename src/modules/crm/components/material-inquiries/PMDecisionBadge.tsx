import { CheckCircle2, Clock, XCircle } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { ProcMIResponsePMStatus } from "@modules/procurement"

import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function PMDecisionBadge({ status }: { status: ProcMIResponsePMStatus }) {
  if (status === "approved") {
    return (
      <StatusBadge variant="success">
        <CheckCircle2 className="mr-1 size-3" />
        {S.pmDecision.approved}
      </StatusBadge>
    )
  }
  if (status === "rejected") {
    return (
      <StatusBadge variant="error">
        <XCircle className="mr-1 size-3" />
        {S.pmDecision.rejected}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge variant="warning">
      <Clock className="mr-1 size-3" />
      {S.pmDecision.pending}
    </StatusBadge>
  )
}
