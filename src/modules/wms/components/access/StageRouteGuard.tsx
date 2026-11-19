import type { ReactNode } from "react";

import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { useWmsStageAccess } from "../../hooks/operations/useStageAccess";
import type { WmsStage } from "../../permissions";
import { WMS_ACCESS_STRINGS } from "./access.strings";

interface StageRouteGuardProps {
  /**
   * Access rule for the route:
   *  - a `WmsStage` — the user must hold that stage capability at ANY of
   *    their warehouses (engineer capability / manager assignment);
   *  - `"manager"` — store_manager / MIS assignment anywhere (the Devices
   *    assignment hub, Assign-to-Rack style surfaces);
   *  - `"member"` — any active warehouse-team assignment (device detail:
   *    every team member may open dossiers for their warehouses).
   * Superusers (and the admin/superadmin roles, per `useWmsStageAccess`)
   * always pass.
   */
  stage: WmsStage | "manager" | "member";
  children: ReactNode;
}

/**
 * Route-level gate for WMS device-operation pages. `RouteGuard` can't cover
 * these: stage authority comes from the user's warehouse_user_assignment
 * (via GET /wms/my-warehouses), NOT from global permission codes — operators
 * hold none of the `wms:*` codes. Renders nothing while assignments load
 * (fast, cached) so users never see a wrong flash of NoAccess, then either
 * the page or the standard Access-Denied panel with a "who can unblock you"
 * hint.
 */
export function StageRouteGuard({ stage, children }: StageRouteGuardProps) {
  const access = useWmsStageAccess();

  if (access.isLoading) return null;

  const allowed =
    stage === "manager"
      ? access.isManager
      : stage === "member"
        ? access.isMember
        : access.canSeeStage(stage);

  if (!allowed) {
    const description =
      stage === "manager"
        ? WMS_ACCESS_STRINGS.managerDenied
        : stage === "member"
          ? WMS_ACCESS_STRINGS.memberDenied
          : WMS_ACCESS_STRINGS.stageDenied;
    return (
      <NoAccess
        title={WMS_ACCESS_STRINGS.stageDeniedTitle}
        description={description}
      />
    );
  }

  return <>{children}</>;
}
