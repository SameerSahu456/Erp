import { useMemo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DetailTabs, type DetailTab } from "@/components/page-shells/DetailTabs"
import { EntityAuditTrailTab } from "@modules/audit"

import { useMaterialIssues, wmsCan, wmsPermissions } from "@modules/wms"
import { useFeatures } from "@shared/features"
import { usePermission } from "@shared/rbac"

import { SoFulfillmentRollup } from "./SoFulfillmentRollup"
import { useSalesOrderFulfillment } from "../../../hooks/sales-orders/useSalesOrders"
import {
  useReplacementRequests,
  useSalesOrderReplacementRollup,
} from "../../../hooks/replacement-requests/useReplacementRequests"
import { useSalesReturnRequests } from "../../../hooks/sales-return-requests/useSalesReturnRequests"
import type { LineFulfillmentWire } from "../../../api"

import {
  RentalSalesOrderBillingsCard,
  RentalSalesOrderInvoicesCard,
  rentalsCan,
  rentalsPermissions,
} from "@modules/rentals"

import { SoAddressSections } from "./SoAddressSections"
import { SoAttachmentSections, type SoAttachmentGroup } from "./SoAttachmentSections"
import { SoAmendmentBanner } from "./SoAmendmentBanner"
import { SoDetailDialogs } from "./SoDetailDialogs"
import { SoDetailHeader, type SoDetailHeaderOverrides } from "./SoDetailHeader"
import { SoInfoSections } from "./SoInfoSections"
import { SoLinkedDocs } from "./SoLinkedDocs"
import { SoTermsNotes } from "./SoTermsNotes"
import { SoTotalsSection } from "./SoTotalsSection"
import { SoViewerBanner } from "./SoViewerBanner"
import { SoDispatchRequestsTab } from "./tabs/SoDispatchRequestsTab"
import { SoLineItemsTab } from "./tabs/SoLineItemsTab"
import { SoMaterialIssuesTab } from "./tabs/SoMaterialIssuesTab"
import { SoRentalReturnRequestsTab } from "./tabs/SoRentalReturnRequestsTab"
import { SoReplacementRequestsTab } from "./tabs/SoReplacementRequestsTab"
import { SoSalesReturnsTab } from "./tabs/SoSalesReturnsTab"
import type { DetailLineBrief } from "../../shared/detail-docs/SourceLineLabel"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"
import { useSalesOrderDetail } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { crmPermissions } from "../../../permissions"

// The codes each warehouse-document tab's list endpoint accepts. A viewer
// in through rentals:read alone (accounts, rental_manager) holds none of
// them, so those tabs — and their page-level count queries — are skipped
// rather than rendered as 403s.
const RETURNS_TABS_CODES = [crmPermissions.READ, wmsPermissions.RETURNS_READ] as const

export interface SalesOrderDetailViewProps {
  /** The order to show. Omitted, it comes from the CRM route's `:id`. */
  soId?: string
  /** Header replacements for a page that reuses this layout. Passing
   *  `actions` swaps out CRM's Edit / Delete / Submit / Amend, and the
   *  dialogs those open are then not mounted either. */
  header?: SoDetailHeaderOverrides
  /** Shown above the order's sections — e.g. a banner the reusing page
   *  needs read before anything else. */
  banner?: ReactNode
  /** Tabs appended after Line Items (and Rental Returns), before History. */
  extraTabs?: DetailTab[]
  /** The agreement layout: Billings card first, Invoices after the
   *  attachments, no Totals card. Off on the CRM order page (sales does
   *  not run billing); the agreement page turns it on. */
  showRentalBilling?: boolean
  /** Extra file groups for the Attachments section — paperwork filed
   *  against something else (the agreement page adds each PO's paper). */
  extraAttachmentGroups?: SoAttachmentGroup[]
}

/** The sales order detail layout — header, sections, cards and tabs.
 *
 *  The CRM sales-order page renders it as-is. The rentals agreement page
 *  renders the SAME layout for the same order, with the agreement's status
 *  and rental actions in the header and its own tabs added, so the two can
 *  never drift into looking like different documents.
 */
export function SalesOrderDetailView({
  soId,
  header,
  banner,
  extraTabs = [],
  showRentalBilling = false,
  extraAttachmentGroups,
}: SalesOrderDetailViewProps = {}) {
  const detail = useSalesOrderDetail(soId)
  const { so } = detail
  const showCrmDialogs = header?.actions === undefined
  const backHref = header?.backHref ?? detail.backHref
  const { canAny } = usePermission()
  const features = useFeatures()
  const canSeeMaterialIssues = canAny(wmsCan.materialIssueList)
  const canSeeReturns = canAny(RETURNS_TABS_CODES)
  const canSeeRentalReturns = canAny([crmPermissions.READ, rentalsPermissions.RETURN])
  // A rental order's replacements are also the rental manager's — the
  // replacement endpoints accept the rentals codes for rental orders.
  const canSeeReplacements =
    canSeeReturns ||
    (so?.sellable_type === "rental_sales" && canAny(rentalsCan.replacementView))

  // SO-wide fulfillment — fetched once here so the rollup card sits above the
  // tabs (general stats) and the Line Items tab reuses the per-line map.
  const fulfillment = useSalesOrderFulfillment(so?.id)
  const fulfillmentByLineId = useMemo(() => {
    const map = new Map<string, LineFulfillmentWire>()
    for (const line of fulfillment.data?.lines ?? []) {
      map.set(line.sales_order_item_id, line)
    }
    return map
  }, [fulfillment.data])

  // SO line id → { name, description }, so the Material Issues + Dispatch
  // accordions can label which ordered line each issued/dispatched unit is for.
  const soLineById = useMemo(() => {
    const map = new Map<string, DetailLineBrief>()
    for (const item of so?.items ?? []) {
      map.set(item.id, { name: item.item_name, description: item.description })
    }
    return map
  }, [so?.items])

  // A demo-converted SO's fulfillment (MI + dispatch) lives under the demo, but
  // a demo can fan out to several SOs. These are THIS SO's units (DRIs) — the MI
  // and Dispatch tabs use them to show only its own fulfillment, not the demo's.
  const soUnitDriIds = useMemo(
    () =>
      (so?.items ?? [])
        .map((i) => i.source_dispatch_request_item_id)
        .filter((id): id is string => !!id),
    [so?.items],
  )

  // Per-tab unit counts for the tab badges. The stage rollup (already fetched)
  // supplies in-progress / dispatched / returned units; the replacement rollup
  // (deduped with the Replacement tab's own query) supplies replaced units.
  const rollup = fulfillment.data?.rollup

  // Issued units across this SO's material issues, for the tab badge — summed
  // from the MI list rather than the stage rollup (whose in-progress count
  // reads 0 for issues whose units sit on a stage it doesn't fold in).
  // Deduped with the Material Issues tab's own query (identical params).
  const materialIssues = useMaterialIssues(
    soUnitDriIds.length > 0
      ? { dispatch_request_item_ids: soUnitDriIds }
      : { source_entity_type: "sales_orders", source_entity_id: so?.id ?? "" },
    { enabled: !!so?.id && canSeeMaterialIssues },
  )
  const materialIssueUnits = useMemo(
    () =>
      (materialIssues.data?.items ?? []).reduce(
        (n, mi) => n + (mi.line_count ?? 0),
        0,
      ),
    [materialIssues.data],
  )

  const replacementRollup = useSalesOrderReplacementRollup(so?.id, {
    enabled: canSeeReplacements,
  })
  const replacementUnits = useMemo(
    () =>
      (replacementRollup.data ?? []).reduce(
        (n, line) => n + Number(line.replaced_qty),
        0,
      ),
    [replacementRollup.data],
  )
  // Approved replacements per line, appended under each line in the grid.
  const replacementsByLineId = useMemo(
    () =>
      new Map(
        (replacementRollup.data ?? []).map((row) => [row.sales_order_item_id, row.replacements ?? []]),
      ),
    [replacementRollup.data],
  )

  // Number of replacement requests raised against this SO — the list's `total`,
  // deduped with the Replacement Requests tab's own query (identical params).
  const replacementRequests = useReplacementRequests(
    so?.id
      ? { entity_type: "sales_orders", entity_id: so.id }
      : {},
    { enabled: !!so?.id && canSeeReplacements },
  )
  const replacementCount = replacementRequests.data?.total ?? 0

  // Returned units come from the SO's sales-return records (one saved line =
  // one unit), not the stage rollup — the rollup's `returned` only counts units
  // reconciled back into stock, which reads 0 while returns are still open.
  // Deduped with the Sales Returns tab's own query.
  const salesReturns = useSalesReturnRequests(
    so?.id
      ? { entity_type: "sales_orders", entity_id: so.id }
      : {},
    { enabled: !!so?.id && canSeeReturns },
  )
  const returnedUnits = useMemo(
    () =>
      (salesReturns.data?.items ?? []).reduce(
        (n, sret) =>
          n +
          (sret.items ?? []).filter(
            (item) => item.approval_status === "approved",
          ).length,
        0,
      ),
    [salesReturns.data],
  )

  if (detail.isLoading && !so) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {S.detail.loading}
      </div>
    )
  }

  if (detail.isError || !so) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">
          {S.detail.notFoundTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {S.detail.notFoundDescription}
        </p>
        <Button variant="outline" render={<Link to={backHref} />}>
          {S.detail.back}
        </Button>
      </div>
    )
  }

  const headlineCount = so.items.filter((it) => !it.parent_sales_order_item_id).length

  const tabs = [
    {
      id: "line-items",
      label: S.detail.tabs.lineItems,
      // Number of headline lines, matching the rows the tab's table shows.
      // `rollup.ordered` is ordered UNITS (sum of qty), so a single line with
      // qty 2 showed "2" here while the table listed one row.
      count: headlineCount,
      content: (
        <SoLineItemsTab
          so={so}
          fulfillmentByLineId={fulfillmentByLineId}
          replacementsByLineId={replacementsByLineId}
        />
      ),
    },
    // Warehouse documents for this order — shown while the `wms` feature
    // switch (FEATURE_WMS) is on.
    ...(features.wms
      ? [
        {
          id: "material-issues",
          label: S.detail.tabs.materialIssues,
          count: materialIssueUnits,
          content: (
            <SoMaterialIssuesTab
              soId={so.id}
              lineById={soLineById}
              dispatchRequestItemIds={soUnitDriIds}
            />
          ),
        },
        {
          id: "dispatch-requests",
          label: S.detail.tabs.dispatchRequests,
          count: rollup?.dispatched ?? 0,
          content: (
            <SoDispatchRequestsTab
              soId={so.id}
              lineById={soLineById}
              dispatchRequestItemIds={soUnitDriIds}
            />
          ),
        },
        {
          id: "replacement-requests",
          label: S.detail.tabs.replacementRequests,
          count: replacementUnits,
          content: <SoReplacementRequestsTab soId={so.id} soNumber={so.order_number} />,
        },
        // A sale returns through a Sales Return Request. A rental order never
        // does: that path restocks the box without settling the device's
        // billing, so the order shows only its rental returns (below).
        ...(so.sellable_type === "rental_sales"
          ? []
          : [
              {
                id: "sales-returns",
                label: S.detail.tabs.salesReturns,
                count: returnedUnits,
                content: <SoSalesReturnsTab soId={so.id} soNumber={so.order_number} />,
              },
            ]),
        ]
      : []),
    // Rentals only: the Rental Return Request, which names the units and
    // settles each device's billing on inward.
    // Gated on GET /crm/rental-return-requests (crm:read | rentals:return):
    // the accounts team (rentals:read only) would just get a 403 here.
    ...(so.sellable_type === "rental_sales" && canSeeRentalReturns
      ? [
          {
            id: "rental-return-requests",
            label: S.detail.tabs.rentalReturns,
            content: <SoRentalReturnRequestsTab soId={so.id} />,
          },
        ]
      : []),
    ...extraTabs,
    {
      // One timeline for the whole order. The backend's `expand_children`
      // pulls in the lines, the rental configuration, every device event,
      // the material issue, the dispatch, the returns and the invoices —
      // so this is the order's working life, not just its CRM header.
      id: "history",
      label: S.detail.tabs.history,
      content: <EntityAuditTrailTab entity="sales_order" entityId={so.id} sortable />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* SO header context — always visible above the tabs. */}
      <SoDetailHeader so={so} detail={detail} overrides={header} />
      {banner}
      <SoViewerBanner so={so} />
      <SoAmendmentBanner so={so} />
      {/* The agreement page leads with the billing contract (its stage
          strip included), then the order: info, addresses, attachments,
          invoices, and the line items in the tabs below. No totals card —
          a rental order's money is its monthly rent, on the billing card. */}
      {showRentalBilling ? (
        <RentalSalesOrderBillingsCard salesOrderId={so.id} sellableType={so.sellable_type} />
      ) : null}
      <SoInfoSections so={so} detail={detail} />
      <SoAddressSections so={so} detail={detail} />
      <SoAttachmentSections so={so} extraGroups={extraAttachmentGroups} />
      {showRentalBilling ? (
        <RentalSalesOrderInvoicesCard salesOrderId={so.id} sellableType={so.sellable_type} />
      ) : null}
      <SoLinkedDocs so={so} detail={detail} />
      {showRentalBilling ? null : <SoTotalsSection so={so} />}
      <SoTermsNotes so={so} />

      {/* General fulfillment stats — SO-wide, above the tabs. */}
      {features.wms && (
        <SoFulfillmentRollup
          rollup={fulfillment.data?.rollup}
          // Without the returns read codes the list query never ran; fall back
          // to the order's own stage rollup rather than a fabricated 0.
          returnedUnits={canSeeReturns ? returnedUnits : undefined}
          replacementCount={replacementCount}
          isLoading={fulfillment.isLoading}
          isError={fulfillment.isError}
        />
      )}

      {/* Per-domain detail. */}
      <DetailTabs tabs={tabs} defaultTab="line-items" />

      {showCrmDialogs ? <SoDetailDialogs so={so} detail={detail} /> : null}
    </div>
  )
}

