import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { CommentSection } from "@/components/common/views/CommentSection"
import { Badge } from "@/components/ui/badge"
import { DetailTabs } from "@/components/page-shells/DetailTabs"
import { EntityHeader } from "@/components/page-shells/EntityHeader"

import { LeadAuditTrailTab } from "@modules/audit"
import { fullName } from "@shared/auth/AuthContext"

import { MaterialInquirySection } from "../../components/material-inquiries/MaterialInquirySection"
import { QuoteSection } from "../../components/quotes/QuoteSection"
import { OrdersSection } from "../../components/sales-orders/OrdersSection"
import { EntityAttachmentsSection } from "../../components/shared/EntityAttachmentsSection"
import { LostReasonDialog } from "../../components/shared/LostReasonDialog"
import { NotesSection } from "../../components/shared/NotesSection"
import { TasksSection } from "../../components/tasks/TasksSection"
import { ViewOnlyBanner } from "../../components/shared/ViewOnlyBanner"
import { LeadAssigneesCard } from "../../components/leads/LeadAssigneesCard"
import { LeadDetailHeaderActions } from "../../components/leads/LeadDetailHeaderActions"
import { LeadDetailMessage } from "../../components/leads/LeadDetailMessage"
import { LeadOverviewTab } from "../../components/leads/LeadOverviewTab"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"
import { useLeadDetail } from "../../hooks/leads/useLeadDetail"
import { checkLeadCloseWonReady, leadStageFields } from "../../lib/lead-close-won-gate"
import { type Activity } from "../../types"

function getStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case "New":
      return "info"
    case "Contacted":
      return "info"
    case "Qualified":
      return "warning"
    case "Proposal":
      return "warning"
    case "Negotiation":
      return "warning"
    case "Closed Won":
      return "success"
    case "Closed Lost":
      return "error"
    case "Rejected":
      return "error"
    default:
      return "neutral"
  }
}

function LeadDetailPage() {
  const board = useLeadDetail()
  const lead = board.lead

  if (board.isLeadNotFound) {
    return (
      <LeadDetailMessage
        title={S.detail.notFoundTitle}
        message={S.detail.notFoundDescription}
        showBack
      />
    )
  }

  if (board.isLoading) {
    return (
      <LeadDetailMessage
        title={S.detail.loadingTitle}
        message={S.detail.loadingDescription}
      />
    )
  }

  if (board.isError) {
    return (
      <LeadDetailMessage
        title={S.detail.loadErrorTitle}
        message={board.loadError instanceof Error ? board.loadError.message : S.detail.loadErrorDescription}
        showBack
      />
    )
  }

  if (!lead) {
    return (
      <LeadDetailMessage
        title={S.detail.notFoundTitle}
        message={S.detail.notFoundDescription}
        showBack
      />
    )
  }

  const overviewTab = {
    id: "overview",
    label: S.detail.tabs.overview,
    content: (
      <div className="space-y-6">
        <LeadOverviewTab
          lead={lead}
          stage={{
            isLost: board.isLost,
            isRejected: board.isRejected,
            lostReason: board.lostReason,
            rejectedByName: board.rejectedByName,
            currentStageIndex: board.currentStageIndex,
            pipelineStages: board.pipelineStages,
          }}
          assignedToName={board.assignedToName}
          presalesManagerName={board.presalesManagerName}
        />
        <EntityAttachmentsSection
          entityType="crm_lead"
          entityId={lead.id}
          canWrite={board.canWriteLead}
        />
      </div>
    ),
  }

  const tabs = [
    overviewTab,
    {
      // Notes are CRUD'd via /api/v1/crm/lead/{id}/notes — see NotesSection.
      id: "notes",
      label: S.detail.tabs.notes,
      count: board.noteCount,
      content: (
        <NotesSection entityType="lead" entityId={lead.id} readOnly={board.isReadOnly} />
      ),
    },
    {
      id: "quotes",
      bare: true,
      label: S.detail.tabs.quotes,
      count: board.quoteCount,
      content: (
        <QuoteSection
          quotableType="lead"
          quotableId={lead.id}
          // Convert-to-SO closes the lead as Won, so the kanban's close-won
          // rules apply here too: past New/Contacted, details + owner filled.
          // Blocked = toast only, no navigation.
          onBeforeConvertToSO={() =>
            checkLeadCloseWonReady(lead.stage, leadStageFields(lead))
          }
          readOnly={board.isReadOnly}
        />
      ),
    },
    {
      id: "orders",
      bare: true,
      label: S.detail.tabs.salesOrders,
      count: board.salesOrderCount,
      content: <OrdersSection source="lead" sourceId={lead.id} />,
    },
    {
      id: "material-inquiries",
      label: S.detail.tabs.materialInquiries,
      count: board.materialInquiryCount,
      content: (
        <MaterialInquirySection linkedTo="lead" linkedId={lead.id} readOnly={board.isReadOnly} />
      ),
    },
    ...(board.canViewTasks
      ? [{
      id: "tasks",
      label: S.detail.tabs.tasks,
      count: board.taskCount,
      content: (
        <TasksSection
          entityType="lead"
          entityId={lead.id}
          entityName={`${lead.name} — ${lead.company}`}
          readOnly={board.isReadOnly}
        />
      ),
    }]
      : []),
    {
      id: "comments",
      label: S.detail.tabs.comments,
      count: board.commentCount,
      content: <CommentSection entityType="lead" entityId={lead.id} />,
    },
    ...(board.canViewAudit
      ? [{
      id: "audit-trail",
      label: S.detail.tabs.auditTrail,
      count: board.auditCount,
      content: (
        <LeadAuditTrailTab
          leadId={lead.id}
          extraEntries={
            board.lostReason
              ? [
                  {
                    id: `lost-${lead.id}`,
                    type: "closed_lost" as Activity["type"],
                    title: S.detail.lostActivityTitle,
                    user: board.user ? fullName(board.user) : S.detail.unknownUser,
                    timestamp: new Date().toISOString(),
                    entityType: "lead",
                    entityId: lead.id,
                    metadata: { reason: board.lostReason.reason, notes: board.lostReason.notes },
                  },
                ]
              : []
          }
        />
      ),
    }]
      : []),
  ]


  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={lead.company.toUpperCase()}
        subtitle={lead.name}
        reference={lead.leadCode}
        status={{ label: board.activeStage, variant: getStageVariant(board.activeStage) }}
        badges={
          <Badge variant={board.priorityVariant} className="h-auto px-[9px] py-[2px] leading-[1.6] tracking-[0.005em]">
            {lead.priority} {S.detail.prioritySuffix}
          </Badge>
        }
        backHref="/crm/leads"
        actions={<LeadDetailHeaderActions lead={lead} board={board} />}
      />

      {/* Comments stay open (a mentioned user can reply); everything else is
          read-only — see useLeadDetail.isReadOnly. */}
      {board.isReadOnly && (
        <ViewOnlyBanner
          title={S.detail.viewOnlyTitle}
          description={S.detail.viewOnlyMentioned}
        />
      )}

      {/* The summary sidebar belongs to the Overview tab only — every other tab
          (Quotes, Sales Orders, …) gets the full page width so its table has
          room. Same rule as the Account page. */}
      <DetailTabs
        cardContent
        tabs={tabs}
        defaultTab="overview"
        aside={
          <>
          <LeadAssigneesCard assignees={board.assignees} />
          </>
        }
      />

      <TimestampFooter
        createdAt={board.leadData?.created_at}
        updatedAt={board.leadData?.updated_at}
      />

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={board.lostReasonOpen}
        onOpenChange={board.setLostReasonOpen}
        entityType="lead"
        entityId={lead.id}
        entityName={lead.name}
        onConfirm={board.handleLostReasonConfirm}
      />
    </div>
  )
}

export { LeadDetailPage }

export default LeadDetailPage
