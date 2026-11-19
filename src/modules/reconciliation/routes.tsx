import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"

const BankReconciliationPage = lazy(
  () => import("./pages/bank/BankReconciliationPage"),
)
const VendorReconciliationPage = lazy(
  () => import("./pages/vendor/VendorReconciliationPage"),
)
const InventoryReconciliationPage = lazy(
  () => import("./pages/inventory/InventoryReconciliationPage"),
)
const InterModuleReconciliationPage = lazy(
  () => import("./pages/inter-module/InterModuleReconciliationPage"),
)

export function ReconciliationRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Reconciliation" />}>
      <Routes>
        <Route path="bank" element={<BankReconciliationPage />} />
        <Route path="vendor" element={<VendorReconciliationPage />} />
        <Route path="inventory" element={<InventoryReconciliationPage />} />
        <Route path="inter-module" element={<InterModuleReconciliationPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
