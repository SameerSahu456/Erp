import { lazy, type ReactElement } from "react"
import { Route, Routes } from "react-router-dom"

import { NoAccess } from "@shared/components/feedback/NoAccess"
import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { RouteGuard } from "@shared/rbac"
import { crmCan } from "@modules/crm"
import { rentalsCan } from "@modules/rentals"
import { procurementCan } from "@modules/procurement"

// HIDDEN pages — not wired to the backend yet (mock data). Blocked for
// EVERYONE (renders <NoAccess />) and dropped from the sidebar, same idiom as
// WMS routes/hidden.tsx. Swap `hidden(...)` for the real element to bring one
// live. Dashboard, Purchase Requests and GRN Matching are the unwired ones.
const hidden = (_el: ReactElement) => <NoAccess />

const ProcurementDashboard = lazy(
  () => import("./pages/dashboard/ProcurementDashboard"),
)
const PurchaseRequestsPage = lazy(
  () => import("./pages/purchase-requests/PurchaseRequestsPage"),
)
const PRFormPage = lazy(() => import("./pages/purchase-requests/PRFormPage"))
const PRDetailPage = lazy(() => import("./pages/purchase-requests/PRDetailPage"))
const PurchaseOrdersPage = lazy(
  () => import("./pages/purchase-orders/PurchaseOrdersPage"),
)
const POFormPage = lazy(() => import("./pages/purchase-orders/POFormPage"))
const POAmendPage = lazy(() => import("./pages/purchase-orders/POAmendPage"))
const PODetailPage = lazy(() => import("./pages/purchase-orders/PODetailPage"))
const PoApprovalsPage = lazy(() => import("./pages/purchase-orders/PoApprovalsPage"))
const PoApprovalCardPage = lazy(() => import("./pages/purchase-orders/PoApprovalCardPage"))
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"))
const VendorDetailPage = lazy(() => import("./pages/vendors/VendorDetailPage"))
const GRNMatchingPage = lazy(() => import("./pages/grns/GRNMatchingPage"))
const GRNDetailPage = lazy(() => import("./pages/grns/GRNDetailPage"))
const PMApprovalsPage = lazy(() => import("./pages/pm-approvals/PMApprovalsPage"))
const PMApprovalDetailPage = lazy(
  () => import("./pages/pm-approvals/PMApprovalDetailPage"),
)

// PM Approvals is an aggregate inbox — visible if the user can act on any of
// its tabs. Include the finer `procurement:po_approve` alongside the legacy
// umbrella so PM/APM granted only the fine code still see the queue.
const PM_APPROVALS_ANY = [
  ...crmCan.approveMi,
  ...crmCan.approveSo,
  ...crmCan.approveDr,
  ...crmCan.approveQuote,
  ...procurementCan.approve,
  ...procurementCan.approvePo,
  // Rental rate changes are decided in the sales-order tab here.
  ...rentalsCan.approveRateChange,
]

// DRY route guard — every gated element goes through the same wrapper so the
// route table stays declarative. `guarded(<Page />, bundle)` is the same as
// `<RouteGuard required={bundle}><Page /></RouteGuard>` but keeps the JSX
// table shorter and easier to scan.
const guarded = (element: ReactElement, required: readonly string[]) => (
  <RouteGuard required={[...required]}>{element}</RouteGuard>
)

export function ProcurementRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Procurement" />}>
      {/* Layout-transparent (display:contents) scope that gives every
          Procurement list toolbar the WMS look — 20rem search box, 40px
          controls (comprint.css, shared with `.wms-search-scope`). */}
      <div className="procurement-search-scope">
      <Routes>
        {/* Dashboard, Purchase Requests and GRN Matching aren't wired to the
            backend yet (mock data) — hidden for everyone and dropped from the
            sidebar. Swap `hidden(...)` for the gated element to bring one live. */}
        <Route index element={hidden(<ProcurementDashboard />)} />
        <Route path="pr" element={hidden(<PurchaseRequestsPage />)} />
        <Route path="pr/new" element={hidden(<PRFormPage />)} />
        <Route path="pr/:id" element={hidden(<PRDetailPage />)} />

        {/* Purchase Orders — read for list/detail/edit page (edit form still
            renders read-only for a user without write); write for create; the
            approval queue needs approve. */}
        <Route path="po" element={guarded(<PurchaseOrdersPage />, procurementCan.readPo)} />
        <Route path="po/new" element={guarded(<POFormPage />, procurementCan.writePo)} />
        <Route path="po/:id/edit" element={guarded(<POFormPage />, procurementCan.writePo)} />
        <Route path="po/:id/amend" element={guarded(<POAmendPage />, procurementCan.writePo)} />
        <Route path="po/approvals" element={guarded(<PoApprovalsPage />, procurementCan.approvePo)} />
        <Route path="po/approvals/:id" element={guarded(<PoApprovalCardPage />, procurementCan.approvePo)} />
        <Route path="po/:id" element={guarded(<PODetailPage />, procurementCan.readPo)} />

        {/* Vendors. */}
        <Route path="vendors" element={guarded(<VendorsPage />, procurementCan.readVendor)} />
        <Route path="vendors/:id" element={guarded(<VendorDetailPage />, procurementCan.readVendor)} />

        <Route path="grn-matching" element={hidden(<GRNMatchingPage />)} />
        <Route path="grn-matching/:id" element={hidden(<GRNDetailPage />)} />
        <Route
          path="pm-approvals"
          element={
            <RouteGuard required={PM_APPROVALS_ANY}>
              <PMApprovalsPage />
            </RouteGuard>
          }
        />
        {/* Detail page enforces per-`:type` gating internally — same
            component renders MI/SO/PR/PO/DR, so the granular check lives
            after the param is read. */}
        <Route
          path="pm-approvals/:type/:id"
          element={
            <RouteGuard required={PM_APPROVALS_ANY}>
              <PMApprovalDetailPage />
            </RouteGuard>
          }
        />
      </Routes>
      </div>
    </ErrorBoundary>
  )
}
