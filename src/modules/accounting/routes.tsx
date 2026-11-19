import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"

const AccountingDashboard = lazy(() => import("./pages/dashboard/AccountingDashboard"))
const LedgerPage = lazy(() => import("./pages/ledger/LedgerPage"))
const PaymentsPage = lazy(() => import("./pages/payments/PaymentsPage"))
const AccountingReportsPage = lazy(() => import("./pages/reports/AccountingReportsPage"))

export function AccountingRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Accounting" />}>
      <Routes>
        <Route index element={<AccountingDashboard />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<AccountingReportsPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
