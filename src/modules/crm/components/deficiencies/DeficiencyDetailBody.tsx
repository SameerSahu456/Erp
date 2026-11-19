import { useState } from "react"
import { useParams } from "react-router-dom"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { DetailPageShell } from "@/components/page-shells"
import { useAuth } from "@shared/auth/use-auth"
import { usePermission } from "@shared/rbac"

import type { CustomerDeficiencyWire } from "../../api"
import { crmCan } from "../../permissions"
import { useCustomerDeficiency } from "../../hooks/deficiencies/useDeficiencies"
import { DecideWaiverDialog, RecoveredDialog, WaiverDialog } from "./DeficiencyDialogs"
import { DeficiencyFacts } from "./DeficiencyFacts"
import { DEFICIENCIES_STRINGS as S } from "./deficiencies.strings"

const LIST = "/crm/deficiencies"
type Action = "requestWaiver" | "proposeCredit" | "approveWaiver" | "rejectWaiver" | "recovered"

/** What this person may do with this deficiency now. The server enforces
 *  the same rules; hiding the button keeps a 403 from being the first hint. */
function useActions(row: CustomerDeficiencyWire | undefined): Action[] {
  const { can } = usePermission()
  const { user } = useAuth()
  if (!row) return []
  if (row.status === "open" && can(crmCan.manageDeficiency))
    return row.is_credit ? ["proposeCredit"] : ["requestWaiver", "recovered"]
  const decider = can(crmCan.approveDeficiencyWaiver) && row.waiver_requested_by !== user?.id
  if (row.status === "waiver_pending" && decider) return ["approveWaiver", "rejectWaiver"]
  return []
}

function Note({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-md bg-info-soft/50 p-3">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <Typography variant="body">{text}</Typography>
    </div>
  )
}

export function DeficiencyDetailBody() {
  const { id } = useParams<{ id: string }>()
  const query = useCustomerDeficiency(id)
  const [open, setOpen] = useState<Action | null>(null)
  const row = query.data
  const actions = useActions(row)

  if (query.isLoading)
    return (
      <DetailPageShell title={S.detail.backToList} backHref={LIST}>
        <FormCardSkeleton />
      </DetailPageShell>
    )
  if (query.isError || !row)
    return (
      <DetailPageShell title={S.detail.notFound} backHref={LIST}>
        <EmptyState title={S.detail.notFound} />
      </DetailPageShell>
    )

  const close = () => setOpen(null)
  return (
    <DetailPageShell
      title={row.serial_number ?? S.detail.backToList}
      backHref={LIST}
      actions={
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a} variant={a === "rejectWaiver" || a === "recovered" ? "outline" : "default"} onClick={() => setOpen(a)}>
              {S.detail.actions[a]}
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        {row.is_credit && <Note text={S.detail.credit} />}
        {row.no_dispatch_record && <Note text={S.detail.noDispatchRecord} />}
        <Card>
          <CardContent className="pt-6">
            <DeficiencyFacts row={row} />
          </CardContent>
        </Card>
      </div>
      {(open === "requestWaiver" || open === "proposeCredit") && <WaiverDialog row={row} onClose={close} />}
      {open === "approveWaiver" && <DecideWaiverDialog row={row} approve onClose={close} />}
      {open === "rejectWaiver" && <DecideWaiverDialog row={row} approve={false} onClose={close} />}
      {open === "recovered" && <RecoveredDialog row={row} onClose={close} />}
    </DetailPageShell>
  )
}
