import type { ReactElement } from "react"
import { Route } from "react-router-dom"

import { NoAccess } from "@shared/components/feedback/NoAccess"

import {
  BOMDetailPage,
  BOMListPage,
  ComponentMovementHistoryPage,
  InventoryPage,
  RelatedPartsPage,
  WmsDashboard,
  WorkOrderDetailPage,
  WorkOrderListPage,
} from "./lazy-pages"

// Unwired demo pages are hidden from everyone, incl. superusers (2026-10-05 RBAC decision).
// To restore one, swap `hidden(...)` for the real gate and restore its sidebar entry.
const hidden = (_el: ReactElement) => <NoAccess />

/** The temporarily hidden demo-data pages (see `hidden` above). */
export function hiddenRoutes() {
  return (
    <>
      <Route index element={hidden(<WmsDashboard />)} />
      <Route path="inventory" element={hidden(<InventoryPage />)} />
      <Route path="bom" element={hidden(<BOMListPage />)} />
      <Route path="bom/:id" element={hidden(<BOMDetailPage />)} />
      <Route path="related-parts" element={hidden(<RelatedPartsPage />)} />
      <Route path="work-orders" element={hidden(<WorkOrderListPage />)} />
      <Route path="work-orders/:id" element={hidden(<WorkOrderDetailPage />)} />
      <Route path="component-history" element={hidden(<ComponentMovementHistoryPage />)} />
    </>
  )
}
