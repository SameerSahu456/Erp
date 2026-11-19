import { Route } from "react-router-dom"

import { imsCan } from "@modules/ims"
import { RouteGuard } from "@shared/rbac"

import { wmsCan, wmsPermissions } from "../permissions"
import {
  ChecklistTemplateFormPage,
  ChecklistTemplatePreviewPage,
  ChecklistTemplatesPage,
  StageChecklistReportPage,
  WarehouseFormPage,
  WarehouseLocationsPage,
  WarehousesPage,
  WarehouseTeamPage,
} from "./lazy-pages"

/** Warehouse reports, checklist templates and the warehouses master. */
export function mastersRoutes() {
  return (
    <>
      {/* Warehouse reports. Manager-tier code gate, NOT requiredWmsStage —
          this is a warehouse-wide list with no device in the path. */}
      <Route
        path="reports/stage-checklist"
        element={
          <RouteGuard required={[...wmsCan.reportView]}>
            <StageChecklistReportPage />
          </RouteGuard>
        }
      />
      {/* Checklists ride the IMS templates API — its effective gate is
          ims:read, so the route mirrors that (not a wms:* code). */}
      <Route
        path="checklists"
        element={
          <RouteGuard required={[...imsCan.view, ...wmsCan.checklistView, ...wmsCan.checklistManage]}>
            <ChecklistTemplatesPage />
          </RouteGuard>
        }
      />
      <Route
        path="checklists/new"
        element={
          <RouteGuard required={[...imsCan.write, ...wmsCan.checklistManage]}>
            <ChecklistTemplateFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="checklists/:id/edit"
        element={
          <RouteGuard required={[...imsCan.write, ...wmsCan.checklistManage]}>
            <ChecklistTemplateFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="checklists/:id"
        element={
          <RouteGuard required={[...imsCan.view, ...wmsCan.checklistView, ...wmsCan.checklistManage]}>
            <ChecklistTemplatePreviewPage />
          </RouteGuard>
        }
      />
      {/* Warehouses master — list, full-page form, then the per-warehouse
          locations workspace on row click. Route gate mirrors the backend
          (warehouse read codes); engineers hold warehouse_read so a
          deep-link works read-only, they just don't get the nav item. */}
      <Route
        path="locations"
        element={
          <RouteGuard required={[...wmsCan.warehouseView]}>
            <WarehousesPage />
          </RouteGuard>
        }
      />
      <Route
        path="locations/new"
        element={
          <RouteGuard required={[wmsPermissions.WAREHOUSE_MANAGE]}>
            <WarehouseFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="locations/:id/edit"
        element={
          <RouteGuard required={[wmsPermissions.WAREHOUSE_MANAGE]}>
            <WarehouseFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="locations/:id/team"
        element={
          <RouteGuard required={[...wmsCan.masters]}>
            <WarehouseTeamPage />
          </RouteGuard>
        }
      />
      <Route
        path="locations/:id"
        element={
          <RouteGuard required={[...wmsCan.warehouseView]}>
            <WarehouseLocationsPage />
          </RouteGuard>
        }
      />
    </>
  )
}
