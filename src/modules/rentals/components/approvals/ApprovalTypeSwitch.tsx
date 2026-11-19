import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { ApprovalType } from "../../hooks/approvals/useApprovalType"
import { APPROVALS_STRINGS as S } from "./approvals.strings"

/** Early exit | PO — the queue the Approvals page shows. Hidden when the
 *  viewer can see only one queue: a single tab is noise. */
export function ApprovalTypeSwitch({
  type,
  types,
  onChange,
}: {
  type: ApprovalType
  types: readonly ApprovalType[]
  onChange: (next: ApprovalType) => void
}) {
  if (types.length < 2) return null
  return (
    <Tabs value={type} onValueChange={(v) => onChange(v as ApprovalType)}>
      <TabsList aria-label={S.switchLabel}>
        {types.map((t) => (
          <TabsTrigger key={t} value={t}>
            {S.types[t]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
