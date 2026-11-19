import { lazy, type ReactElement } from "react"
import { Route, Routes } from "react-router-dom"

import { NoAccess } from "@shared/components/feedback/NoAccess"
import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { RouteGuard } from "@shared/rbac"
import { EmptyState } from "@/components/common/feedback/EmptyState"

import { imsCan } from "./permissions"
import { IMS_ROUTE_STRINGS } from "./routes.strings"

// HIDDEN — the IMS Dashboard isn't wired to the backend yet; block it for
// everyone (NoAccess) and drop its sidebar link. Swap back when it's wired.
const hidden = (_el: ReactElement) => <NoAccess />

const ImsDashboard = lazy(() => import("./pages/dashboard/ImsDashboard"))
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage"))
const CategoryDetailPage = lazy(() => import("./pages/categories/CategoryDetailPage"))
const CategoryFormPage = lazy(() => import("./pages/categories/CategoryFormPage"))
const OEMsPage = lazy(() => import("./pages/oems/OEMsPage"))
const OEMDetailPage = lazy(() => import("./pages/oems/OEMDetailPage"))
const OEMFormPage = lazy(() => import("./pages/oems/OEMFormPage"))
const HSNCodesPage = lazy(() => import("./pages/hsn-codes/HSNCodesPage"))
const HSNCodeFormPage = lazy(() => import("./pages/hsn-codes/HSNCodeFormPage"))
const SpecificationAttributesPage = lazy(
  () => import("./pages/specification-attributes/SpecificationAttributesPage"),
)
const SpecificationAttributeFormPage = lazy(
  () => import("./pages/specification-attributes/SpecificationAttributeFormPage"),
)
const PartsPage = lazy(() => import("./pages/parts/PartsPage"))
const PartFormPage = lazy(() => import("./pages/parts/PartFormPage"))
const PartDetailPage = lazy(() => import("./pages/parts/PartDetailPage"))
const VariantDetailPage = lazy(() => import("./pages/variants/VariantDetailPage"))
const VariantFormPage = lazy(() => import("./pages/variants/VariantFormPage"))
const ChecklistFormPage = lazy(() => import("./pages/checklists/ChecklistFormPage"))
const PMAssignmentsPage = lazy(() => import("./pages/pm-assignments/PMAssignmentsPage"))
const PMAssignmentDetailPage = lazy(
  () => import("./pages/pm-assignments/PMAssignmentDetailPage"),
)
const StockPage = lazy(() => import("./pages/stock/StockPage"))
const SkuHistoryPage = lazy(() => import("./pages/sku-history/SkuHistoryPage"))
const StockAdjustmentsPage = lazy(
  () => import("./pages/stock-adjustments/StockAdjustmentsPage"),
)
const StockAdjustmentDetailPage = lazy(
  () => import("./pages/stock-adjustments/StockAdjustmentDetailPage"),
)
const StockAdjustmentFormPage = lazy(
  () => import("./pages/stock-adjustments/StockAdjustmentFormPage"),
)
const ExportJobsPage = lazy(() => import("./pages/exports/ExportJobsPage"))

// Two helpers cut repetition: every list/detail route is gated on
// `imsCan.view` (`ims:read` OR `ims:manage`), and every create / edit
// form route is gated on `imsCan.write` (`ims:manage` only). Users with
// only `ims:read` who hit `/ims/parts/new` or `…/edit` get bounced to
// `/` instead of mounting a form they can't submit.
const view = ([...imsCan.view] as string[])
const write = ([...imsCan.write] as string[])

const Viewable = ({ children }: { children: React.ReactNode }) => (
  <RouteGuard required={view}>{children}</RouteGuard>
)
const Writable = ({ children }: { children: React.ReactNode }) => (
  <RouteGuard required={write}>{children}</RouteGuard>
)

// Stock adjustments + exports carry their own codes (admin-only by default),
// independent of ims:read / ims:manage.
const adjustView = [...imsCan.stockAdjustView] as string[]
const adjustWrite = [...imsCan.stockAdjust] as string[]
const exportView = [...imsCan.export] as string[]

export function ImsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="IMS" />}>
      <Routes>
        <Route index element={hidden(<ImsDashboard />)} />
        <Route path="categories" element={<Viewable><CategoriesPage /></Viewable>} />
        <Route path="categories/new" element={<Writable><CategoryFormPage /></Writable>} />
        <Route path="categories/:id/edit" element={<Writable><CategoryFormPage /></Writable>} />
        <Route path="categories/:id" element={<Viewable><CategoryDetailPage /></Viewable>} />
        <Route path="oems" element={<Viewable><OEMsPage /></Viewable>} />
        <Route path="oems/new" element={<Writable><OEMFormPage /></Writable>} />
        <Route path="oems/:id/edit" element={<Writable><OEMFormPage /></Writable>} />
        <Route path="oems/:id" element={<Viewable><OEMDetailPage /></Viewable>} />
        <Route path="hsn-codes" element={<Viewable><HSNCodesPage /></Viewable>} />
        <Route path="hsn-codes/new" element={<Writable><HSNCodeFormPage /></Writable>} />
        <Route path="hsn-codes/:id/edit" element={<Writable><HSNCodeFormPage /></Writable>} />
        <Route
          path="specification-attributes"
          element={<Viewable><SpecificationAttributesPage /></Viewable>}
        />
        <Route
          path="specification-attributes/new"
          element={<Writable><SpecificationAttributeFormPage /></Writable>}
        />
        <Route
          path="specification-attributes/:id/edit"
          element={<Writable><SpecificationAttributeFormPage /></Writable>}
        />
        <Route path="parts" element={<Viewable><PartsPage /></Viewable>} />
        <Route path="parts/new" element={<Writable><PartFormPage /></Writable>} />
        <Route path="parts/:partId/edit" element={<Writable><PartFormPage /></Writable>} />
        <Route
          path="parts/:partId/variants/new"
          element={<Writable><VariantFormPage /></Writable>}
        />
        <Route
          path="parts/:partId/variants/:variantId/edit"
          element={<Writable><VariantFormPage /></Writable>}
        />
        <Route
          path="parts/:partId/variants/:variantId"
          element={<Viewable><VariantDetailPage /></Viewable>}
        />
        <Route
          path="parts/:partId/checklists/new"
          element={<Writable><ChecklistFormPage /></Writable>}
        />
        <Route
          path="parts/:partId/checklists/:templateId/edit"
          element={<Writable><ChecklistFormPage /></Writable>}
        />
        <Route path="parts/:partId" element={<Viewable><PartDetailPage /></Viewable>} />
        {/* For those who manage the grants, not every IMS reader: a Store
            Manager given ims:read must not see them. */}
        <Route path="pm-assignments" element={<Writable><PMAssignmentsPage /></Writable>} />
        {/* PM assignment edit is intentionally an in-page modal (on both
            the list page and the detail page) — not a dedicated route.
            Product preference: edit should feel like the create dialog,
            not a route change. */}
        <Route
          path="pm-assignments/:id"
          element={<Writable><PMAssignmentDetailPage /></Writable>}
        />
        <Route path="stock-items" element={<Viewable><StockPage /></Viewable>} />
        <Route
          path="stock-items/:id/sku/:sku"
          element={<Viewable><SkuHistoryPage /></Viewable>}
        />
        <Route path="inventory" element={<Viewable><StockPage /></Viewable>} />
        <Route
          path="stock-adjustments"
          element={<RouteGuard required={adjustView}><StockAdjustmentsPage /></RouteGuard>}
        />
        <Route
          path="stock-adjustments/new"
          element={<RouteGuard required={adjustWrite}><StockAdjustmentFormPage /></RouteGuard>}
        />
        <Route
          path="stock-adjustments/:id/edit"
          element={<RouteGuard required={adjustWrite}><StockAdjustmentFormPage /></RouteGuard>}
        />
        <Route
          path="stock-adjustments/:id"
          element={<RouteGuard required={adjustView}><StockAdjustmentDetailPage /></RouteGuard>}
        />
        <Route
          path="exports"
          element={<RouteGuard required={exportView}><ExportJobsPage /></RouteGuard>}
        />
        {/* Unknown /ims/* paths render a not-found state, never a blank page. */}
        <Route
          path="*"
          element={
            <EmptyState
              title={IMS_ROUTE_STRINGS.pageNotFoundTitle}
              description={IMS_ROUTE_STRINGS.pageNotFound}
            />
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}
