import { Navigate } from "react-router-dom";

import { useWmsStageAccess } from "@modules/wms";
import { useFeatures } from "@shared/features";

import { firstVisibleHref, useVisibleSidebarNav } from "./layouts/use-visible-sidebar-nav";

/** Where a user with no visible module lands — everyone owns their profile. */
const FALLBACK_HREF = "/settings/profile";

/**
 * Landing redirect for the bare `/` URL (and the post-login target): sends the
 * user to the FIRST page their sidebar shows. The sidebar's own visibility hook
 * is the single source of truth, so the landing page and the menu can never
 * disagree — and the matching section opens in the sidebar on arrival.
 */
export function HomeRedirect() {
  const groups = useVisibleSidebarNav();
  const features = useFeatures();
  const wms = useWmsStageAccess();

  // Warehouse operators hold no `wms:*` codes — their stage tabs appear in the
  // sidebar only once /wms/my-warehouses resolves. Wait for it so an engineer
  // isn't sent to Profile (or a later item) by a first-load race.
  if (features.wms && !wms.isAdmin && wms.isLoading) return null;

  return <Navigate to={firstVisibleHref(groups) ?? FALLBACK_HREF} replace />;
}
