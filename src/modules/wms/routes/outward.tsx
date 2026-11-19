import { Route } from "react-router-dom"

import { RouteGuard } from "@shared/rbac"

import { OutwardViewGuard } from "../components/access/OutwardViewGuard"
import { wmsCan } from "../permissions"
import {
  DispatchCreatePage,
  DispatchDetailPage,
  DispatchListPage,
  MaterialIssueDetailPage,
  MaterialIssueFormPage,
  MaterialIssueLinesPage,
  MoveStockPage,
  WarehouseTransferDetailPage,
  WarehouseTransfersPage,
} from "./lazy-pages"

/** Outward: warehouse transfers, material issue and dispatches. */
export function outwardRoutes() {
  return (
    <>
      {/* Stock in flight between warehouses (stock-transfer spec §12). Wired
          to the live transfer API (server pagination/search/counts, IST
          overdue) — gated on outward READ, matching the endpoint's read gate
          and the sidebar entry, no longer the superuser-only mock wrapper. */}
      <Route
        path="transfers"
        element={
          <RouteGuard required={[...wmsCan.outwardView]}>
            <WarehouseTransfersPage />
          </RouteGuard>
        }
      />
      {/* Full-page Move Stock. Sending to another warehouse needs outward
          manage (the transfer endpoint's gate); rack moves are gated per rack. */}
      <Route
        path="transfers/move"
        element={
          <RouteGuard required={[...wmsCan.outwardManage]}>
            <MoveStockPage />
          </RouteGuard>
        }
      />
      <Route
        path="transfers/:transferId"
        element={
          <RouteGuard required={[...wmsCan.outwardView]}>
            <WarehouseTransferDetailPage />
          </RouteGuard>
        }
      />
      <Route
        path="material-issue"
        element={
          // Managers (outward perms) OR a QC-capability engineer (outward QC).
          <OutwardViewGuard>
            <MaterialIssueLinesPage />
          </OutwardViewGuard>
        }
      />
      <Route
        path="material-issue/new"
        element={
          <RouteGuard required={[...wmsCan.outwardManage]}>
            <MaterialIssueFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="material-issue/:id/edit"
        element={
          <RouteGuard required={[...wmsCan.outwardManage]}>
            <MaterialIssueFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="material-issue/:id"
        element={
          <OutwardViewGuard>
            <MaterialIssueDetailPage />
          </OutwardViewGuard>
        }
      />
      <Route
        path="dispatches"
        element={
          <RouteGuard required={[...wmsCan.outwardView]}>
            <DispatchListPage />
          </RouteGuard>
        }
      />
      {/* Real MI-driven create flow (source-doc-anchored). Legacy mock form
          remains on the /edit route until the rest of the UI is rebuilt. */}
      <Route
        path="dispatches/new"
        element={
          <RouteGuard required={[...wmsCan.outwardManage]}>
            <DispatchCreatePage />
          </RouteGuard>
        }
      />
      <Route
        path="dispatches/:id"
        element={
          <RouteGuard required={[...wmsCan.outwardView]}>
            <DispatchDetailPage />
          </RouteGuard>
        }
      />
    </>
  )
}
