import { fullName } from "@shared/auth/AuthContext"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { CommentSection } from "@/components/common/views/CommentSection"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import { DetailTabs } from "@/components/page-shells/DetailTabs"

import { DealAuditTrailTab } from "@modules/audit"

import { MaterialInquirySection } from "../../components/material-inquiries/MaterialInquirySection"
import { QuoteSection } from "../../components/quotes/QuoteSection"
import { OrdersSection } from "../../components/sales-orders/OrdersSection"
import { EntityAttachmentsSection } from "../../components/shared/EntityAttachmentsSection"
import { NotesSection } from "../../components/shared/NotesSection"
import { TasksSection } from "../../components/tasks/TasksSection"
import { ViewOnlyBanner } from "../../components/shared/ViewOnlyBanner"
import { LostReasonDialog } from "../../components/shared/LostReasonDialog"
import { DealAccountInfoCard } from "../../components/deals/DealAccountInfoCard"
import { DealAddressesCard } from "../../components/deals/DealAddressesCard"
import { DealAssigneesCard } from "../../components/deals/DealAssigneesCard"
import { DealDetailHeaderActions } from "../../components/deals/DealDetailHeaderActions"
import { DealOverviewTab } from "../../components/deals/DealOverviewTab"
import { getDealStageVariant } from "../../components/deals/dealDetailHelpers"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"
import { useDealDetail } from "../../hooks/deals/useDealDetail"
import { type Activity } from "../../types"

function DealDetailPage() {
  const detail = useDealDetail()
  const deal = detail.deal

  if (detail.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {DEALS_STRINGS.detail.loading}
      </div>
    )
  }

  if (detail.isError || !deal) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">{DEALS_STRINGS.detail.notFoundTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {DEALS_STRINGS.detail.notFoundDescription}
        </p>
        <Button variant="outline" render={<Link to="/crm/deals" />}>
          {DEALS_STRINGS.detail.back}
        </Button>
      </div>
    )
  }

  const tabs = [
    {
      id: "overview",
      label: DEALS_STRINGS.detail.tabs.overview,
      content: (
        <div className="space-y-6">
          <DealOverviewTab deal={deal} detail={detail} />
          <EntityAttachmentsSection
            entityType="crm_deal"
            entityId={deal.id}
            canWrite={detail.canWriteDeal}
          />
        </div>
      ),
    },
    {
      id: "notes",
      label: DEALS_STRINGS.detail.tabs.notes,
      count: detail.noteCount,
      content: (
        <NotesSection entityType="deal" entityId={deal.id} readOnly={detail.isReadOnly} />
      ),
    },
    {
      id: "quotes",
      bare: true,
      label: DEALS_STRINGS.detail.tabs.quotes,
      count: detail.quoteCount,
      content: (
        <QuoteSection
          quotableType="deal"
          quotableId={deal.id}
          accountId={deal.accountId ?? undefined}
          readOnly={detail.isReadOnly}
          parentClosedWon={detail.activeStage === "Closed Won"}
        />
      ),
    },
    {
      id: "orders",
      bare: true,
      label: DEALS_STRINGS.detail.tabs.salesOrders,
      count: detail.salesOrderCount,
      content: <OrdersSection source="deal" sourceId={deal.id} />,
    },
    {
      id: "material-inquiries",
      label: DEALS_STRINGS.detail.tabs.materialInquiries,
      count: detail.materialInquiryCount,
      content: (
        <MaterialInquirySection linkedTo="deal" linkedId={deal.id} readOnly={detail.isReadOnly} />
      ),
    },
    ...(detail.canViewTasks
      ? [{
      id: "tasks",
      label: DEALS_STRINGS.detail.tabs.tasks,
      count: detail.taskCount,
      content: (
        <TasksSection
          entityType="deal"
          entityId={deal.id}
          entityName={`${deal.accountName} — ${deal.name}`}
          readOnly={detail.isReadOnly}
        />
      ),
    }]
      : []),
    {
      id: "comments",
      label: DEALS_STRINGS.detail.tabs.comments,
      count: detail.commentCount,
      content: <CommentSection entityType="deal" entityId={deal.id} />,
    },
    ...(detail.canViewAudit
      ? [{
        id: "audit-trail",
        label: DEALS_STRINGS.detail.tabs.auditTrail,
        count: detail.auditCount,
        content: (
          <DealAuditTrailTab
            dealId={deal.id}
            extraEntries={
              detail.lostReason
                ? [
                    {
                      id: `lost-${deal.id}`,
                      type: "closed_lost" as Activity["type"],
                      title: DEALS_STRINGS.detail.lostActivityTitle,
                      user: detail.user ? fullName(detail.user) : "",
                      timestamp: new Date().toISOString(),
                      entityType: "deal",
                      entityId: deal.id,
                      metadata: { reason: detail.lostReason.reason, notes: detail.lostReason.notes },
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
        title={deal.accountName}
        subtitle={detail.contactSpoc?.name ?? deal.name}
        reference={deal.dealNumber}
        status={{ label: detail.activeStage, variant: getDealStageVariant(detail.activeStage) }}
        badges={deal.priority ? (
          <Badge variant={detail.priorityVariant} className="h-auto px-[9px] py-[2px] leading-[1.6] tracking-[0.005em]">
            {deal.priority} {DEALS_STRINGS.detail.prioritySuffix}
          </Badge>
        ) : undefined}
        backHref="/crm/deals"
        actions={
          <DealDetailHeaderActions
            deal={deal}
            canWriteDeal={detail.canWriteDeal}
            isReadOnly={detail.isReadOnly}
            activeStage={detail.activeStage}
            onStageChange={detail.handleStageChange}
            deleteDialogOpen={detail.deleteDialogOpen}
            onDeleteDialogChange={detail.setDeleteDialogOpen}
            onDelete={detail.handleDelete}
          />
        }
      />

      {/* Comments stay open (a mentioned user can reply); everything else is
          read-only — see useDealDetail.isReadOnly. */}
      {detail.isReadOnly && (
        <ViewOnlyBanner
          title={DEALS_STRINGS.detail.viewOnlyTitle}
          description={DEALS_STRINGS.detail.viewOnlyMentioned}
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
          <DealAssigneesCard assignees={detail.assignees} />
          {detail.account && (
            <DealAccountInfoCard account={detail.account} contactSpoc={detail.contactSpoc} />
          )}
          <DealAddressesCard
            apiAccount={detail.apiAccount}
            addresses={detail.apiAddresses}
            isLoading={detail.addressesQuery.isLoading}
            isError={detail.addressesQuery.isError}
            showAll={detail.showAllAddresses}
            onToggleShowAll={() => detail.setShowAllAddresses((v) => !v)}
          />
          </>
        }
      />

      <TimestampFooter
        createdAt={detail.apiDeal?.created_at}
        updatedAt={detail.apiDeal?.updated_at}
      />

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={detail.lostReasonOpen}
        onOpenChange={detail.setLostReasonOpen}
        entityType="deal"
        entityId={deal.id}
        entityName={deal.name}
        onConfirm={detail.handleLostReasonConfirm}
      />
    </div>
  )
}

export { DealDetailPage }

export default DealDetailPage
