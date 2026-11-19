import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"

const VendorListPage = lazy(() => import("./pages/vendors/VendorListPage"))
const VendorFormPage = lazy(() => import("./pages/vendors/VendorFormPage"))
const VendorDetailPage = lazy(() => import("./pages/vendors/VendorDetailPage"))
const VendorApprovalsPage = lazy(() => import("./pages/approvals/VendorApprovalsPage"))

export function VendorsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Vendors" />}>
      <Routes>
        <Route index element={<VendorListPage />} />
        <Route path="new" element={<VendorFormPage />} />
        <Route path="approvals" element={<VendorApprovalsPage />} />
        <Route path=":id/edit" element={<VendorFormPage />} />
        <Route path=":id" element={<VendorDetailPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
