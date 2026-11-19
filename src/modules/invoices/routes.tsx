import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"

const InvoiceDashboard = lazy(() => import("./pages/dashboard/InvoiceDashboard"))
const SalesInvoicesPage = lazy(() => import("./pages/sales/SalesInvoicesPage"))
const SalesInvoiceFormPage = lazy(() => import("./pages/sales/SalesInvoiceFormPage"))
const SalesInvoiceDetailPage = lazy(() => import("./pages/sales/SalesInvoiceDetailPage"))
const PurchaseInvoicesPage = lazy(() => import("./pages/purchase/PurchaseInvoicesPage"))
const CreditNotesPage = lazy(() => import("./pages/credit-notes/CreditNotesPage"))

export function InvoicesRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Invoices" />}>
      <Routes>
        <Route index element={<InvoiceDashboard />} />
        <Route path="sales" element={<SalesInvoicesPage />} />
        <Route path="sales/new" element={<SalesInvoiceFormPage />} />
        <Route path="sales/:id" element={<SalesInvoiceDetailPage />} />
        <Route path="purchase" element={<PurchaseInvoicesPage />} />
        <Route path="credit-notes" element={<CreditNotesPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
