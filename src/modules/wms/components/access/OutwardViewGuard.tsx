import type { ReactNode } from "react";

import { usePermission } from "@shared/rbac";
import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { useWmsStageAccess } from "../../hooks/operations/useStageAccess";
import { wmsCan } from "../../permissions";
import { WMS_ACCESS_STRINGS } from "./access.strings";

/**
 * The material-issue worklist + detail are visible to managers (who hold the
 * `wms:outward_*` permission codes) AND to QC-capability engineers, who hold no
 * `wms:*` codes at all — their authority to run the OUTWARD-QC step comes from a
 * warehouse assignment carrying the `qc` capability. A plain `RouteGuard` on the
 * outward permissions would wrongly lock the QC engineer out, and a plain
 * `StageRouteGuard` on `qc` would lock a store/warehouse manager out. So this
 * passes on EITHER; the page itself narrows a QC-only engineer to the QC tabs +
 * the QC action.
 */
export function OutwardViewGuard({ children }: { children: ReactNode }) {
  const { can } = usePermission();
  const access = useWmsStageAccess();

  // Wait for assignments (fast, cached) so a QC engineer never sees a NoAccess
  // flash before their capability resolves.
  if (access.isLoading) return null;

  const allowed = can(wmsCan.outwardView) || access.canSeeStage("qc");
  if (!allowed) {
    return (
      <NoAccess
        title={WMS_ACCESS_STRINGS.stageDeniedTitle}
        description={WMS_ACCESS_STRINGS.stageDenied}
      />
    );
  }

  return <>{children}</>;
}
