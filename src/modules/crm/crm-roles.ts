import type { UserRole } from '@shared/auth/roles'

export type AccessLevel = 'both' | 'pre-sales' | 'post-sales'

export interface CrmRoleConfig {
  role: UserRole
  label: string
  group: 'channel-sales' | 'end-customer-sales' | 'support'
  accessLevel: AccessLevel
  reportsTo?: UserRole
  canReinstateLead: boolean
}

export const CRM_ROLES: Record<string, CrmRoleConfig> = {
  CRM_CHANNEL_MANAGER: {
    role: 'CRM_CHANNEL_MANAGER',
    label: 'Channel Manager',
    group: 'channel-sales',
    accessLevel: 'both',
    canReinstateLead: true,
  },
  CRM_SR_ACCOUNT_MANAGER: {
    role: 'CRM_SR_ACCOUNT_MANAGER',
    label: 'Sr. Account Manager',
    group: 'channel-sales',
    accessLevel: 'both',
    reportsTo: 'CRM_CHANNEL_MANAGER',
    canReinstateLead: true,
  },
  CRM_AREA_MANAGER: {
    role: 'CRM_AREA_MANAGER',
    label: 'Area Manager',
    group: 'channel-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_SR_ACCOUNT_MANAGER',
    canReinstateLead: false,
  },
  CRM_BDE_CHANNEL: {
    role: 'CRM_BDE_CHANNEL',
    label: 'BDE (Channel)',
    group: 'channel-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_AREA_MANAGER',
    canReinstateLead: false,
  },
  CRM_INSIDE_SALES_MANAGER: {
    role: 'CRM_INSIDE_SALES_MANAGER',
    label: 'Inside Sales Manager',
    group: 'end-customer-sales',
    accessLevel: 'both',
    canReinstateLead: true,
  },
  CRM_INSIDE_SALES_REP: {
    role: 'CRM_INSIDE_SALES_REP',
    label: 'Inside Sales Rep',
    group: 'end-customer-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_INSIDE_SALES_MANAGER',
    canReinstateLead: false,
  },
  CRM_BDE_END_CUSTOMER: {
    role: 'CRM_BDE_END_CUSTOMER',
    label: 'BDE (End Customer)',
    group: 'end-customer-sales',
    accessLevel: 'pre-sales',
    reportsTo: 'CRM_INSIDE_SALES_REP',
    canReinstateLead: false,
  },
  CRM_SUPPORT_MANAGER: {
    role: 'CRM_SUPPORT_MANAGER',
    label: 'Support Manager',
    group: 'support',
    accessLevel: 'post-sales',
    canReinstateLead: false,
  },
  CRM_SUPPORT_AGENT: {
    role: 'CRM_SUPPORT_AGENT',
    label: 'Support Agent',
    group: 'support',
    accessLevel: 'post-sales',
    reportsTo: 'CRM_SUPPORT_MANAGER',
    canReinstateLead: false,
  },
}

// ── Dropdown role groupings ────────────────────────────────────────────────
// Backend `roles.name` values (lowercase, snake_case) — used as `role_names=`
// query params on `GET /api/v1/users`. One constant per dropdown so changing
// which roles populate a dropdown is a single-line edit.
//
// Canonical role set (per `roles` table seed migrations):
//   admin, superadmin, manager, staff, product_manager, asst_product_manager,
//   channel_manager, area_manager, sr_account_manager, account_manager,
//   bde_channel, end_customer, key_account_manager, bde_end_customer,
//   inside_sales_rep, presales, bde

// Global exclusion list for "Assigned To"-style dropdowns (Lead assignee +
// Account owner picker). Sourced as a negative filter via the backend
// `?exclude_role_names=` query, so any new role added to the seed is
// automatically eligible unless it appears in this list. Maintained as a
// single source of truth so all assignee dropdowns stay in lockstep.
// (Was previously two parallel inclusion lists — see git blame.)
// ── BDE roles — single source of truth ─────────────────────────────────────
// Add a new BDE role slug to `ALL_ROLE` HERE and it flows to every list that
// composes from it (the assignee-exclude list, the lead BDE picker, …) — so
// you never have to add a BDE role in multiple places again.
export const BDE_ROLES: {
  // Every BDE-flavoured role slug — channel, end-customer, cloud/DC, the
  // generic executive, and the BD manager.
  ALL_ROLE: string[]
  // BDE roles surfaced in the first 3 (channel) sections. Fill in the slugs
  // you want visible there.
  first_3_section_visible_role: string[]
} = {
  ALL_ROLE: [
    "bde",
    "bde_channel",
    "bde_end_customer",
    "bde_cloud_dc",
    "business_development_executive",
    "business_development_executive_channel_partner",
    "business_development_executive_end_customer",
    "business_development_manager",
  ],
  first_3_section_visible_role: [
    //  "business_development_executive",
    // "business_development_executive_channel_partner",
    // "business_development_executive_end_customer",
  ],
}

/**
 * True when a user holds a role that should only see the first 3 lead pipeline
 * sections — New / Contacted / Qualified (`BDE_ROLES.first_3_section_visible_role`).
 * Pass the user's `roles` array; `null` / `undefined` / empty → not restricted.
 */
export function isFirst3SectionRole(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((r) => BDE_ROLES.first_3_section_visible_role.includes(r))
}

export const ASSIGNEE_EXCLUDE_ROLE_NAMES: string[] = [
  // All BDE-flavoured roles — edit BDE_ROLES.ALL_ROLE, not this line.
  ...BDE_ROLES.ALL_ROLE,
  "presales",
  "asst_product_manager",
  "product_manager",
  // Admin / superadmin are no longer assignable as a Lead "Assigned To".
  // They're excluded from the scoped query here; the Lead form also drops the
  // separate admin/superadmin "pinned" /users call that used to re-add them.
  "admin",
  "superadmin",
]

/**
 * True when a user's role list contains an excluded-assignee role
 * (`ASSIGNEE_EXCLUDE_ROLE_NAMES`). Such users are filtered OUT of the
 * "Assigned To" picker, so they must NOT be auto-selected as the default
 * assignee on lead create either — otherwise the form seeds a value the
 * picker can't show or re-select. Pass the user's `roles` array; `null` /
 * `undefined` / empty → not excluded.
 */
export function isAssigneeExcluded(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((r) => ASSIGNEE_EXCLUDE_ROLE_NAMES.includes(r))
}

// ── Owner / Assigned-To "always-assignable" roles ──────────────────────────
// Admin / Superadmin oversee every channel, so they may be picked as a Lead
// Assigned-To, Deal Owner, or Account Owner REGARDLESS of the selected channel
// type — even though their roles carry no `channel_tags` (unrestricted).
//
// The backend can't express "(channel_tag match) OR (admin/superadmin)" in one
// `GET /users` call (it AND-combines `channel_tags` + `role_names`), so the FE
// pickers PIN these roles on top of the tag-scoped list via a second query
// (see `useUserOptionsWithPinnedRoles`), and the save-time validators bypass
// the channel_tags check for them (see `isOwnerExempt`).
//
// Slugs match the backend `roles.name` seed (lowercase).
export const OWNER_INCLUDE_ROLE_NAMES: string[] = ["admin", "superadmin"]

/**
 * True when a user's role list contains an "owner-exempt" role
 * (`OWNER_INCLUDE_ROLE_NAMES` — admin / superadmin). Such users may be assigned
 * as Owner / Assigned-To irrespective of the selected channel type. Used by
 * both the picker (to keep them) and the save-time validation (to bypass the
 * `channel_tags` consistency check). Pass the user's `roles` array (or the
 * re-fetched detail's roles); `null` / `undefined` / empty → not exempt.
 */
export function isOwnerExempt(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((r) => OWNER_INCLUDE_ROLE_NAMES.includes(r))
}

// ── CRM dashboard: My View / Team View toggle ──────────────────────────────
// Roles that oversee the whole org rather than a team of their own. The
// dashboard's My / Team toggle is HIDDEN for them: they have no reports, so
// "My View" would scope the board to their own (empty) sales numbers and
// "Team View" is simply the board they already see.
//
// Everyone else — channel/area managers, account managers, KAMs, BDEs, and the
// product managers (PM / APM, who own their own product book alongside the
// org-wide roll-up) — gets the toggle. Team View leaves scope to the backend
// (it resolves self + reports from the caller's own RBAC); My View narrows it
// to the logged-in user by sending `user_ids=[<their id>]`.
//
// Slugs match the backend `roles.name` seed (lowercase).
export const DASHBOARD_SCOPE_TOGGLE_HIDDEN_ROLES: string[] = [
  "admin",
  "superadmin",
]

/**
 * True when the CRM dashboard should show the My View / Team View toggle for
 * this user — i.e. they hold NO role in `DASHBOARD_SCOPE_TOGGLE_HIDDEN_ROLES`.
 * Pass the user's `roles` array; `null` / `undefined` / empty → no toggle
 * (an unknown scope is not a team scope).
 */
export function hasDashboardScopeToggle(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return false
  return !roles.some((r) =>
    DASHBOARD_SCOPE_TOGGLE_HIDDEN_ROLES.includes(r.toLowerCase()),
  )
}

export const LEAD_PRESALES_ROLE_NAMES: string[] = ["presales"]

// Product-Manager roles for the "Filter by PM" dropdown on the Leads & Deals
// list pages. Mirrors the backend `PM_ASSIGNABLE_ROLE_NAMES`
// (app/core/rbac/pm_eligibility.py) — the users who can hold pm_assignments and
// therefore have a resolvable category scope.
export const CRM_PM_FILTER_ROLE_NAMES: string[] = ["product_manager", "asst_product_manager"]

// All BDE roles eligible for the lead BDE picker — sourced from BDE_ROLES so a
// new BDE slug added there shows up here automatically.
export const LEAD_BDE_ROLE_NAMES: string[] = [...BDE_ROLES.ALL_ROLE]

// Channel-type → BDE role mapping for the Lead form's BDE picker. Same
// shape and intent as `DEAL_BDE_ROLES_BY_CHANNEL` below — kept as a
// separate constant so the lead and deal pickers can diverge later
// without cross-contamination (matches the LEAD_*/DEAL_* split above).
// `bde_cloud_dc` is referenced eagerly; until that role is seeded on the
// backend the Cloud / Data Center picker will return "No BDEs found".
export const LEAD_BDE_ROLES_BY_CHANNEL: Record<string, string[]> = {
  "Channel Partner": ["bde_channel", "business_development_executive_channel_partner"],
  "End Customer": ["bde_end_customer", "business_development_executive_end_customer"],
  "Cloud / Data Center": ["bde_cloud_dc"],
  // End User records are worked by the Channel Partner BDEs.
  "End User": ["bde_channel", "business_development_executive_channel_partner"],
}

// ── Deal-form dropdown role groupings ───────────────────────────────────────
// Same idea as the LEAD_* groupings above but scoped to the Deal form so the
// two can diverge later without cross-contamination. Edit one of these to
// change which roles populate the corresponding deal-form dropdown — no
// component code changes needed.

export const DEAL_PRESALES_ROLE_NAMES: string[] = ["presales"]

/**
 * Check if a role can reinstate rejected leads.
 * Manager-level CRM roles + legacy manager roles + admins.
 */
export function canReinstateLead(role: UserRole): boolean {
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'SALES_MANAGER') return true
  const crmRole = CRM_ROLES[role]
  return crmRole?.canReinstateLead ?? false
}
