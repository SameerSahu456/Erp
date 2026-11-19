import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"

const CustomerListPage = lazy(() => import("./pages/customers/CustomerListPage"))
const CustomerFormPage = lazy(() => import("./pages/customers/CustomerFormPage"))
const CustomerDetailPage = lazy(() => import("./pages/customers/CustomerDetailPage"))
const CustomerApprovalsPage = lazy(() => import("./pages/approvals/CustomerApprovalsPage"))

export function CustomersRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Customers" />}>
      <Routes>
        <Route index element={<CustomerListPage />} />
        <Route path="new" element={<CustomerFormPage />} />
        <Route path="approvals" element={<CustomerApprovalsPage />} />
        <Route path=":id/edit" element={<CustomerFormPage />} />
        <Route path=":id" element={<CustomerDetailPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
