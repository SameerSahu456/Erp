import { Link } from "react-router-dom"
import { CircleCheck, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { LEAD_STAGES, type Lead } from "../../types"
import { leadStageLabel } from "../../constants/lead-stages"
import type { useLeadDetail } from "../../hooks/leads/useLeadDetail"
import { DeleteLeadDialog } from "./DeleteLeadDialog"
import { LEADS_STRINGS as S } from "./leads.strings"
import { ReinstateLeadDialog } from "./ReinstateLeadDialog"
import { RejectLeadDialog } from "./RejectLeadDialog"

interface LeadDetailHeaderActionsProps {
  lead: Lead
  board: ReturnType<typeof useLeadDetail>
}

export function LeadDetailHeaderActions({ lead, board }: LeadDetailHeaderActionsProps) {
  const { activeStage, isRejected } = board
  // View-only (reached via an @mention): no write actions at all. The page
  // shows a banner explaining why.
  if (board.isReadOnly) return null
  return (
    <>
      {/* Stage Update — needs lead-write, like every other stage move. */}
      {board.canWriteLead &&
        !isRejected &&
        activeStage !== "Closed Won" &&
        activeStage !== "Closed Lost" && (
        <Select value={activeStage} onValueChange={(v) => v != null && board.handleStageChange(v)}>
          <SelectTrigger size="sm" className="w-32 text-[12.5px]" clearable={false} disabled={board.moveLeadStage.isPending}>
            <SelectValue placeholder={S.detail.moveStagePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{leadStageLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <PermissionGuard required={[...crmCan.writeLead]}>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          // Preserve the "?from=rejected" context so the sidebar keeps
          // "Rejected Leads" highlighted while editing a rejected lead.
          render={
            <Link
              to={`/crm/leads/${lead.id}/edit${isRejected ? "?from=rejected" : ""}`}
            />
          }
        >
          <Pencil className="size-3.5" data-icon="inline-start" />
          {S.detail.edit}
        </Button>
      </PermissionGuard>

      {(lead.stage === "New" || lead.stage === "Contacted") && (
        <PermissionGuard required={[...crmCan.writeLead]}>
          <RejectLeadDialog
            open={board.rejectDialogOpen}
            onOpenChange={board.setRejectDialogOpen}
            leadName={lead.name}
            fields={{
              reason: board.rejectionReason,
              setReason: board.setRejectionReason,
              notes: board.rejectionNotes,
              setNotes: board.setRejectionNotes,
            }}
            onReject={board.handleReject}
            isPending={board.rejectLeadMutation.isPending}
          />
        </PermissionGuard>
      )}

      {isRejected && (
        <PermissionGuard required={[...crmCan.writeLead]}>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={board.moveLeadStage.isPending}
            onClick={() => board.handleStageChange("Qualified")}
          >
            <CircleCheck className="size-3.5" data-icon="inline-start" />
            {S.detail.convertToQualified}
          </Button>
        </PermissionGuard>
      )}

      {lead.stage === "Rejected" && board.userCanReinstate && (
        <ReinstateLeadDialog
          open={board.reinstateDialogOpen}
          onOpenChange={board.setReinstateDialogOpen}
          leadName={lead.name}
          note={board.reinstateNote}
          onNoteChange={board.setReinstateNote}
          onConfirm={board.handleReinstate}
        />
      )}

      <PermissionGuard required={[...crmCan.deleteLead]}>
        <DeleteLeadDialog
          open={board.deleteDialogOpen}
          onOpenChange={board.setDeleteDialogOpen}
          leadName={lead.name}
          onDelete={board.handleDelete}
          isPending={board.deleteLeadMutation.isPending}
        />
      </PermissionGuard>
    </>
  )
}
