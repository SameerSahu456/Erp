import { Navigate, Route } from "react-router-dom"

import { RouteGuard } from "@shared/rbac"

import { StageRouteGuard } from "../components/access/StageRouteGuard"
import { wmsCan, wmsPermissions } from "../permissions"
import {
  AssignToRackPage,
  DeviceDetailPage,
  DevicesAssignmentPage,
  InspectionPage,
  QCPage,
  RepairPage,
  ScrapPlacementQueuePage,
  ServiceSectionsPage,
  ServiceVendorsPage,
  SparesPage,
  VendorJobsPage,
  WorkAssignmentDetailPage,
  WorkAssignmentIssuePage,
  WorkAssignmentsPage,
} from "./lazy-pages"

/** Work assignments + the device-operation stages (inspection, repair, vendor
 *  services, QC, spares, rack assign) and the devices hub / detail. */
export function operationsRoutes() {
  return (
    <>
      {/* Work assignments — a warehouse-wide document list, so a CODE gate
          rather than StageRouteGuard: there is no device in the path for a
          stage guard to resolve a warehouse from. NOT wrapped in mock() —
          this page is wired to a live API. */}
      <Route
        path="work-assignments"
        element={
          <RouteGuard required={[...wmsCan.workAssignmentView]}>
            <WorkAssignmentsPage />
          </RouteGuard>
        }
      />
      {/* Issuing is a WRITE — gated on the manage codes, not the view ones,
          so an engineer with read access is not shown a form the backend
          would refuse. Registered BEFORE the :id route or "new" would be
          parsed as an assignment id. */}
      <Route
        path="work-assignments/new"
        element={
          <RouteGuard required={[...wmsCan.workAssignmentManage]}>
            <WorkAssignmentIssuePage />
          </RouteGuard>
        }
      />
      <Route
        path="work-assignments/:id"
        element={
          <RouteGuard required={[...wmsCan.workAssignmentView]}>
            <WorkAssignmentDetailPage />
          </RouteGuard>
        }
      />
      {/* Device-operation stages — authority is warehouse-assignment based
          (StageRouteGuard), NOT permission codes. */}
      <Route
        path="inspection"
        element={
          <StageRouteGuard stage="inspection">
            <InspectionPage />
          </StageRouteGuard>
        }
      />
      <Route
        path="repair"
        element={
          <StageRouteGuard stage="repair">
            <RepairPage />
          </StageRouteGuard>
        }
      />
      {/* Vendor services. The LITERAL path must precede the :sectionCode
          param route, or "vendors" would be swallowed as a section code. */}
      <Route
        path="vendor-jobs/sections"
        element={
          <RouteGuard required={[...wmsCan.serviceVendorView]}>
            <ServiceSectionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="vendor-jobs/vendors"
        element={
          <RouteGuard required={[...wmsCan.serviceVendorView]}>
            <ServiceVendorsPage />
          </RouteGuard>
        }
      />
      {/* No section = the cross-section view: "what is outside the building
          right now" is one page, not one per section. */}
      {/* The cross-section QUEUE gates on the service_job_read CODE (managers),
          not the service_job device stage — an engineer holds the stage to raise
          a vendor request on a device they work, but not this read code, so a
          direct URL hit lands on NoAccess instead of the generic fetch error
          (CP-605 #6). */}
      <Route
        path="vendor-jobs"
        element={
          <RouteGuard required={[...wmsCan.serviceJobView]}>
            <VendorJobsPage />
          </RouteGuard>
        }
      />
      <Route
        path="vendor-jobs/:sectionCode"
        element={
          <RouteGuard required={[...wmsCan.serviceJobView]}>
            <VendorJobsPage />
          </RouteGuard>
        }
      />
      <Route
        path="qc"
        element={
          <StageRouteGuard stage="qc">
            <QCPage />
          </StageRouteGuard>
        }
      />
      <Route
        path="spares"
        element={
          // View needs SPARES_READ (matches backend); write actions use `canStage('spares')`.
          <RouteGuard required={[wmsPermissions.SPARES_READ]}>
            <SparesPage />
          </RouteGuard>
        }
      />
      <Route
        path="assign-rack"
        element={
          <StageRouteGuard stage="rack_assign">
            <AssignToRackPage />
          </StageRouteGuard>
        }
      />
      {/* Store manager's worklist for condemned units with no shelf location
          (device-scrap D6). "manager" tier, same as Devices/Assign-to-Rack —
          the row action itself narrows further to store/warehouse manager. */}
      <Route
        path="scrap-placement"
        element={
          /* Gated on the devices_scrap CODE (warehouse/store managers only —
             what the backend list endpoint requires), not the "manager" stage
             that also admits mis, who would otherwise 403 on the data call
             (CP-550 #8). */
          <RouteGuard required={wmsPermissions.DEVICES_SCRAP}>
            <ScrapPlacementQueuePage />
          </RouteGuard>
        }
      />
      <Route
        path="devices"
        element={
          <StageRouteGuard stage="manager">
            <DevicesAssignmentPage />
          </StageRouteGuard>
        }
      />
      {/* Device detail is for every warehouse-team member — engineers reach
          it from their own stage queues, so "member", not "manager". */}
      <Route
        path="devices/:id"
        element={
          <StageRouteGuard stage="member">
            <DeviceDetailPage />
          </StageRouteGuard>
        }
      />
      {/* Paint became a vendor-service section; keep old bookmarks working. */}
      <Route path="paint" element={<Navigate to="/wms/vendor-jobs" replace />} />
    </>
  )
}
