import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // OR-bundle of permission codes; user passes if they hold at least one.
  // Absent or empty → always visible to authenticated users.
  // `is_superuser=true` bypasses (handled in `usePermission`).
  requiredPermissions?: readonly string[];
  // Strict superuser gate — shown ONLY to `is_superuser` users, never
  // satisfiable by a permission code.
  superuserOnly?: boolean;
  // Role gate (case-insensitive, OR): the item shows only to users holding at
  // least one of these role names. Superusers bypass. ANDed with the other
  // gates. Used where access is defined by role, not permission code
  // (e.g. Reports: superadmin / admin / store_manager / product_manager).
  requiredRoles?: readonly string[];
  // WMS warehouse-capability gate for device-operation tabs. The item shows
  // only when the user can work that stage at any of their warehouses (or is
  // a warehouse manager, for `"manager"`), or is admin/superadmin. Evaluated
  // via `useWmsStageAccess` in the Sidebar — orthogonal to (and ANDed with)
  // any `requiredPermissions`. Warehouse operators don't hold global WMS
  // codes, so this is what surfaces their stage tab.
  requiredWmsStage?:
    | "inspection"
    | "repair"
    | "qc"
    | "service_job"
    | "spares"
    | "rack_assign"
    | "manager";
  // Optional nested sub-items, rendered as an indented, collapsible sub-menu
  // under this item. Used for the data-driven vendor-service sections, which
  // would otherwise flood the Warehouse group with one flat row each — they
  // nest under a single "All Vendor Jobs" parent instead.
  children?: readonly NavItem[];
  // Record-scope gate (`user.data_scope`): shown only to users whose scope is
  // listed. Absent → every scope. Superusers bypass.
  visibleForScopes?: readonly DataScope[];
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  // OR-bundle gating the whole group: if set, the group is hidden unless the
  // user holds at least one of these codes — even if an individual item would
  // otherwise be visible. Absent → group visibility is driven solely by which
  // of its items survive per-item filtering. `is_superuser` bypasses.
  requiredPermissions?: readonly string[];
  // Record-scope gate for the whole group — see `NavItem.visibleForScopes`.
  visibleForScopes?: readonly DataScope[];
}

// A user's effective record scope, as `/auth/me` reports it.
export type DataScope = "all" | "rental_orders" | "sales_team";
