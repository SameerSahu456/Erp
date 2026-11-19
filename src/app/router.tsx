import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { AppShell } from "@app/layouts/AppShell"
import { RequireAuth } from "@shared/auth/RequireAuth"
import { useFeatures } from "@shared/features"

import { LoginPage } from "@modules/identity/pages/LoginPage"

import { HomeRedirect } from "./HomeRedirect"

import { CrmRoutes } from "@modules/crm"
import { WmsRoutes } from "@modules/wms"
import { ImsRoutes } from "@modules/ims"
import { ProcurementRoutes } from "@modules/procurement"
import { AccountingRoutes } from "@modules/accounting"
import { InvoicesRoutes } from "@modules/invoices"
import { ReconciliationRoutes } from "@modules/reconciliation"
import { ReportsRoutes } from "@modules/reports"
import { CustomersRoutes } from "@modules/customers"
import { RentalsRoutes } from "@modules/rentals"
import { VendorsRoutes } from "@modules/vendors"
import { SettingsRoutes } from "@modules/settings"

// Home dashboard — mounted at "/dashboard" and as the catch-all when the
// `dashboard` feature switch is on (FEATURE_DASHBOARD). When it is off, the same paths
// fall through to `<HomeRedirect />`, a role-aware redirect that picks
// the user's first accessible module (CRM → IMS → Procurement → WMS →
// Settings/Profile). That replaces the prior hard `<Navigate to="/crm/
// leads" />` which stranded users without CRM codes on a page they
// couldn't access. Selection is permission-code-based.
// HIDDEN: Home dashboard disabled — re-enable together with the /dashboard route,
// the catch-all branch below, the Sidebar link and the HomeRedirect superuser redirect.
// const HomeDashboard = lazy(() => import("@modules/dashboard/pages/DashboardPage"))
const DesignSystemPage = lazy(() => import("@modules/design-system/pages/DesignSystemPage"))

export function AppRouter() {
  const features = useFeatures()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* HIDDEN: Home dashboard
          {features.dashboard && <Route path="/dashboard" element={<HomeDashboard />} />}
          */}
          {/* `/` is the role-aware landing: each user is sent to their most
              relevant page after login (WMS manager → Inward, inspection/qc/
              repair engineer → their stage, CRM → Leads, …; superuser →
              Dashboard). The Dashboard itself lives at `/dashboard`. */}
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/crm/*" element={<CrmRoutes />} />
          {features.wms && <Route path="/wms/*" element={<WmsRoutes />} />}
          <Route path="/ims/*" element={<ImsRoutes />} />
          <Route path="/procurement/*" element={<ProcurementRoutes />} />
          <Route path="/invoices/*" element={<InvoicesRoutes />} />
          <Route path="/accounting/*" element={<AccountingRoutes />} />
          <Route path="/reconciliation/*" element={<ReconciliationRoutes />} />
          <Route path="/vendors/*" element={<VendorsRoutes />} />
          <Route path="/customers/*" element={<CustomersRoutes />} />
          <Route path="/rentals/*" element={<RentalsRoutes />} />
          <Route path="/settings/*" element={<SettingsRoutes />} />

          <Route path="/reports/*" element={<ReportsRoutes />} />
          <Route path="/design-system" element={<DesignSystemPage />} />

          <Route
            path="*"
            element={
              // HIDDEN: Home dashboard — catch-all always redirects by role.
              // features.dashboard ? (
              //   <HomeDashboard />
              // ) : (
              //   <HomeRedirect />
              // )
              <HomeRedirect />
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}
