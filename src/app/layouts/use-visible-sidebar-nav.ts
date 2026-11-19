import { useMemo } from "react";

import { hasAccess, usePermission } from "@shared/rbac";
import { useAuth } from "@shared/auth/use-auth";
import { useFeatures } from "@shared/features";
import { useVendorServiceNavItems, useWmsStageAccess } from "@modules/wms";
import { Layers, Store } from "lucide-react";
import type { DataScope, NavGroup, NavItem } from "@app/layouts/navigation";

import {
  buildSidebarNav,
  VENDOR_SERVICE_NAV_PLACEHOLDER,
  VENDOR_MASTERS_NAV_PLACEHOLDER,
  VENDOR_MASTER_NAV_PERMISSIONS,
} from "./sidebar-nav-config";

const WAREHOUSE_MANAGER_ROLES = new Set([
  "warehouse_manager",
  "store_manager",
  "mis",
]);

/**
 * The sidebar groups the signed-in user may see — the single source of truth
 * for both the sidebar and the post-login landing redirect, so the page a user
 * lands on is always one their menu actually shows.
 */
export function useVisibleSidebarNav(): NavGroup[] {
  const { can, isSuperuser } = usePermission();
  const { canSeeStage, isManager } = useWmsStageAccess();
  const { user } = useAuth();
  // Memoised so the nav filter below can depend on it without re-running on
  // every render (a bare `?? []` would be a new array each time).
  const roles: string[] = useMemo(() => user?.roles ?? [], [user?.roles]);
  // Record-scope gate (`visibleForScopes`): sales-team users get the request
  // pages under CRM instead of the Warehouse menu. Superusers see every entry.
  const dataScope = user?.data_scope ?? "all";

  // Hide the top Dashboard link for warehouse-only users — engineers and
  // warehouse/store/MIS managers have no cross-module dashboard (CP-193 #6).
  // Superusers and anyone with a non-warehouse role (CRM / IMS / procurement)
  // keep it.
  // HIDDEN: only used by the Home dashboard nav link
  // const isWarehouseOnly =
  //   !isSuperuser &&
  //   roles.length > 0 &&
  //   roles.every((r) => WAREHOUSE_ONLY_ROLES.has(r));
  // A pure engineer (no manager role) — the engineer view hides Locations
  // entirely (CP-193 #7).
  const isEngineerOnly =
    !isSuperuser &&
    roles.includes("engineer") &&
    !roles.some((r) => WAREHOUSE_MANAGER_ROLES.has(r));

  // Filter each item by its `requiredPermissions` bundle (OR semantics in
  // `usePermission().can`), its `superuserOnly` gate, and — for WMS device-
  // operation tabs — its `requiredWmsStage` warehouse-capability gate. Groups
  // with no remaining items collapse entirely. Memoised so unrelated re-renders
  // (route changes) don't re-walk the tree.
  // One sidebar entry per ACTIVE service section, resolved at render time
  // rather than hardcoded — a newly seeded section shows up on next load.
  // Cache-only: never triggers the /wms/service-sections fetch (see the hook) —
  // the dynamic section links show once a vendor-jobs page has loaded them.
  const vendorServiceItems = useVendorServiceNavItems();
  const features = useFeatures();

  const visibleGroups = useMemo(() => {
    const inScope = (scopes?: readonly DataScope[]) =>
      isSuperuser || !scopes || scopes.includes(dataScope);
    return buildSidebarNav(features)
      // Group-level gate: hide the whole group (e.g. CRM) when the user holds
      // none of its `requiredPermissions`, regardless of per-item codes.
      .filter((group) => inScope(group.visibleForScopes))
      .filter((group) =>
        group.requiredPermissions && group.requiredPermissions.length > 0
          ? can([...group.requiredPermissions])
          : true,
      )
      .map((group) => ({
        ...group,
        // Expand the vendor-services marker into its data-driven entries
        // BEFORE gating, so each one still passes the normal stage check.
        items: group.items.flatMap((item): NavItem[] => {
          const masterHrefs = new Set([
            `${VENDOR_SERVICE_NAV_PLACEHOLDER.href}/vendors`,
            `${VENDOR_SERVICE_NAV_PLACEHOLDER.href}/sections`,
          ]);
          // "All Vendor Jobs" — the operational-flow entry: the data-driven
          // service sections (Battery Boost, Display Repair, Paint, …) nested
          // under one parent, so a warehouse with many sections no longer
          // stretches the group into a wall of flat rows. The parent links to
          // the cross-section "all jobs" view. Masters are NOT nested here —
          // they render separately at the end of the menu.
          if (item.label === VENDOR_SERVICE_NAV_PLACEHOLDER.label) {
            const sectionChildren: NavItem[] = vendorServiceItems
              .filter(
                (vs) =>
                  vs.href !== VENDOR_SERVICE_NAV_PLACEHOLDER.href &&
                  !masterHrefs.has(vs.href),
              )
              .map((vs) => ({
                label: vs.label,
                href: vs.href,
                icon: VENDOR_SERVICE_NAV_PLACEHOLDER.icon,
                requiredPermissions: VENDOR_SERVICE_NAV_PLACEHOLDER.requiredPermissions,
              }));
            return [
              {
                ...VENDOR_SERVICE_NAV_PLACEHOLDER,
                label: "All Vendor Jobs",
                children: sectionChildren,
              },
            ];
          }
          // Vendor MASTERS at the very end — Service Sections then
          // Service Vendors. Gated on the service-vendor permission (matches
          // the route), not the service_job device stage (§D7).
          if (item.label === VENDOR_MASTERS_NAV_PLACEHOLDER.label) {
            return vendorServiceItems
              .filter((vs) => masterHrefs.has(vs.href))
              // Sections before Vendors.
              .sort((a, b) =>
                a.href.endsWith("/sections") === b.href.endsWith("/sections")
                  ? 0
                  : a.href.endsWith("/sections")
                    ? -1
                    : 1,
              )
              .map((vs) => ({
                label: vs.label,
                href: vs.href,
                icon: vs.href.endsWith("/vendors") ? Store : Layers,
                requiredPermissions: VENDOR_MASTER_NAV_PERMISSIONS,
              }));
          }
          return [item];
        }).filter((item) => {
          // Engineer view hides Locations entirely (CP-193 #7), even though an
          // engineer holds warehouse_read for the read-only Locations page.
          if (isEngineerOnly && item.href === "/wms/locations") return false;
          // Superuser-only items are a strict gate — no permission code
          // satisfies them.
          if (item.superuserOnly && !isSuperuser) return false;
          // Role gate — the user must hold one of the listed roles.
          if (
            item.requiredRoles &&
            item.requiredRoles.length > 0 &&
            !hasAccess(
              { isSuperuser, roles, permissions: [] },
              { roles: item.requiredRoles },
            )
          ) {
            return false;
          }
          if (!inScope(item.visibleForScopes)) return false;
          // An item ungated by both stage and permissions is always visible.
          if (
            !item.requiredWmsStage &&
            !(item.requiredPermissions && item.requiredPermissions.length > 0)
          ) {
            return true;
          }
          // WMS capability gate: the user can work that stage at any warehouse
          // (or is a manager / admin / superadmin).
          const stageOk = item.requiredWmsStage
            ? item.requiredWmsStage === "manager"
              ? isManager
              : canSeeStage(item.requiredWmsStage)
            : false;
          const permsOk =
            item.requiredPermissions && item.requiredPermissions.length > 0
              ? can([...item.requiredPermissions])
              : false;
          // OR the declared gates: an item with only one gate behaves exactly as
          // before; an item with BOTH (Material Issue = qc stage OR outward
          // codes) shows when EITHER passes, matching its route guard.
          return stageOk || permsOk;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [can, isSuperuser, roles, canSeeStage, isManager, isEngineerOnly, vendorServiceItems, dataScope, features]);
  return visibleGroups;
}

/** First page the user can open: the first item of the first visible group. */
export function firstVisibleHref(groups: readonly NavGroup[]): string | null {
  for (const group of groups) {
    const item = group.items[0];
    if (item) return item.href;
  }
  return null;
}
