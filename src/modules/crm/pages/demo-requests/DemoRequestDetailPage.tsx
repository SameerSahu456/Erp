import { useMemo, useState } from "react"
import { ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { DetailTabs } from "@/components/page-shells/DetailTabs"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { DemoConvertToSoDialog } from "../../components/demo-requests/DemoConvertToSoDialog"
import { DemoDetailItemsCard } from "../../components/demo-requests/DemoDetailItemsCard"
// import { DemoDispatchRequestsTab } from "../../components/demo-requests/DemoDispatchRequestsTab"
import { DemoFulfillmentRollup } from "../../components/demo-requests/DemoFulfillmentRollup"
import { DemoInfoCards } from "../../components/demo-requests/DemoInfoCards"
import { DemoLifecycleStepper } from "../../components/demo-requests/DemoLifecycleStepper"
// import { DemoMaterialIssuesTab } from "../../components/demo-requests/DemoMaterialIssuesTab"
// import { DemoSalesOrdersTab } from "../../components/demo-requests/DemoSalesOrdersTab"
import { DemoSourceNotesCards } from "../../components/demo-requests/DemoSourceNotesCards"
import { DemoStatusBanners } from "../../components/demo-requests/DemoStatusBanners"
import { DEMO_REQUESTS_STRINGS as S } from "../../components/demo-requests/demo-requests.strings"
import { DEMO_STATUS_VARIANT } from "../../constants/demo-request-status"
import { useDemoRequestDetail } from "../../hooks/demo-requests/useDemoRequestDetail"
import { useDemoRequestFulfillment } from "../../hooks/demo-requests/useDemoRequests"

function DemoRequestDetailPage() {
  const detail = useDemoRequestDetail()
  const { demo } = detail
  const [convertOpen, setConvertOpen] = useState(false)
  const fulfillmentQuery = useDemoRequestFulfillment(demo?.id)
  // Keyed by demo_request_item_id; the items card sums across the ids each
  // grouped display row was built from.
  const fulfillmentByItemId = useMemo(
    () => new Map((fulfillmentQuery.data?.lines ?? []).map((line) => [line.demo_request_item_id, line])),
    [fulfillmentQuery.data],
  )

  if (detail.demoQuery.isLoading) {
    // Skeleton mirrors the loaded layout: header bar, stepper card, the
    // two info cards, and the items card — same outer spacing as the page.
    return (
      <div className="space-y-6" aria-busy>
        <span className="sr-only">{S.detail.loading}</span>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    )
  }

  // Load failure and not-found are different situations — a failed request
  // shouldn't claim the record doesn't exist.
  // The AppShell owns the outer page frame — these states only add vertical
  // centering on an inner wrapper, never root padding (§10).
  if (detail.demoQuery.isError) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <Typography variant="subsection-title">{S.detail.loadFailed}</Typography>
          <Typography variant="body" tone="muted">
            {detail.demoQuery.error instanceof Error && detail.demoQuery.error.message
              ? detail.demoQuery.error.message
              : S.detail.loadFailedDescription}
          </Typography>
          <Button variant="ghost" className="mt-2" onClick={detail.goBack}>
            {S.detail.back}
          </Button>
        </div>
      </div>
    )
  }

  if (!demo) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <Typography variant="subsection-title">{S.detail.notFound}</Typography>
          <Typography variant="body" tone="muted">
            {S.detail.notFoundDescription}
          </Typography>
          <Button variant="ghost" className="mt-2" onClick={detail.goBack}>
            {S.detail.back}
          </Button>
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: "overview",
      label: S.detail.tabs.overview,
      content: (
        <div className="space-y-6">
          <DemoInfoCards demo={demo} isOverdue={detail.isOverdue} />
          <DemoDetailItemsCard
            demo={demo}
            totalItems={detail.totalItems}
            approvedTotal={detail.approvedTotal}
            fulfillmentByItemId={fulfillmentByItemId}
          />
          <DemoSourceNotesCards demo={demo} />
          <TimestampFooter createdAt={demo.createdAt} />
        </div>
      ),
    },
    // {
    //   id: "material-issues",
    //   label: S.detail.tabs.materialIssues,
    //   content: <DemoMaterialIssuesTab demoId={demo.id} lineById={detail.lineById} />,
    // },
    // {
    //   id: "dispatch-requests",
    //   label: S.detail.tabs.dispatchRequests,
    //   content: <DemoDispatchRequestsTab demoId={demo.id} lineById={detail.lineById} />,
    // },
    // {
    //   id: "sales-orders",
    //   label: S.detail.tabs.salesOrders,
    //   content: <DemoSalesOrdersTab demoId={demo.id} />,
    // },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={demo.demoNumber}
        titleCopyable
        subtitle={`${demo.accountName} · ${S.detail.itemsSuffix(detail.totalItems)}`}
        status={{ label: demo.status, variant: DEMO_STATUS_VARIANT[demo.status] }}
        backHref="/crm/demo-requests"
        onBack={detail.backTo ? () => detail.navigate(detail.backTo!) : undefined}
        actions={
          detail.canCreateSO ? (
            // Convert-to-SO is gated on the *destination* code (SO write).
            <PermissionGuard required={[...crmCan.drConvertToSo]}>
              <Button onClick={() => setConvertOpen(true)} className="shrink-0">
                <ShoppingCart className="size-4" />
                {S.detail.createSo}
              </Button>
            </PermissionGuard>
          ) : undefined
        }
      />

      {convertOpen && (
        <DemoConvertToSoDialog
          onOpenChange={setConvertOpen}
          demoId={demo.id}
          priceByItemId={detail.priceByItemId}
        />
      )}

      {/* Demo-wide context — always visible above the tabs. */}
      <DemoStatusBanners demo={demo} isOverdue={detail.isOverdue} />

      <DemoFulfillmentRollup
        rollup={fulfillmentQuery.data?.rollup}
        isLoading={fulfillmentQuery.isLoading}
        isError={fulfillmentQuery.isError}
      />

      <DemoLifecycleStepper
        activeStage={detail.activeStage}
        isRejected={detail.isRejected}
        isOverdue={detail.isOverdue}
      />

      <DetailTabs tabs={tabs} defaultTab="overview" />
    </div>
  )
}

export { DemoRequestDetailPage }
export default DemoRequestDetailPage
