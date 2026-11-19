import { Route } from "react-router-dom"

import { RouteGuard } from "@shared/rbac"

import { wmsCan } from "../permissions"
import {
  BatchDevicesPage,
  InwardExceptionDetailPage,
  InwardExceptionsPage,
  InwardFormPage,
  InwardPage,
  RentalScanPage,
} from "./lazy-pages"

/** Inward / GRN routes, gated like the backend. Returns <Route> elements for use inside <Routes>. */
export function inwardRoutes() {
  return (
    <>
      <Route
        path="inward"
        element={
          <RouteGuard required={[...wmsCan.inwardView]}>
            <InwardPage />
          </RouteGuard>
        }
      />
      <Route
        path="inward/new"
        element={
          <RouteGuard required={[...wmsCan.inwardManage]}>
            <InwardFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="inward/:id/edit"
        element={
          <RouteGuard required={[...wmsCan.inwardManage]}>
            <InwardFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="inward/:id/rental-scan"
        element={
          <RouteGuard required={[...wmsCan.inwardManage]}>
            <RentalScanPage />
          </RouteGuard>
        }
      />
      <Route
        path="inward/:id/devices"
        element={
          <RouteGuard required={[...wmsCan.inwardView]}>
            <BatchDevicesPage />
          </RouteGuard>
        }
      />
      {/* Held rental-return boxes (return-by-count §8). Readable by inward
          readers and resolvers, mirroring the list endpoint's gate. */}
      <Route
        path="inward-exceptions"
        element={
          <RouteGuard required={[...wmsCan.inwardExceptionView]}>
            <InwardExceptionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="inward-exceptions/:id"
        element={
          <RouteGuard required={[...wmsCan.inwardExceptionView]}>
            <InwardExceptionDetailPage />
          </RouteGuard>
        }
      />
    </>
  )
}
