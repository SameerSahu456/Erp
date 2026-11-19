import type { AccessRule } from "@shared/rbac";

/**
 * Who may see the "Unassigned" lead / deal tiles on the Sales Team widget
 * (`unassigned_lead_count` / `unassigned_deal_count` from
 * `GET /crm/dashboard/hierarchy_wise_report`).
 *
 * This is a PRESENTATION gate, not a security one — the backend decides what
 * the counts contain and returns 0 to anyone outside its own audience, so the
 * worst a too-wide rule here can do is render a permanent "Unassigned 0". The
 * tiles additionally hide on a 0 count, so a role that the API doesn't serve
 * simply sees nothing rather than a dead tile.
 *
 * ┌─ TO GRANT ACCESS TO A NEW ROLE OR PERMISSION, EDIT HERE ─────────────────┐
 * │  • add a role name to `roles`         (e.g. "channel_manager")           │
 * │  • add a permission code to `permissions`                                │
 * │ Nothing at the call site changes.                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `product_manager` / `asst_product_manager` are the same PM/APM pair the
 * backend treats as a visibility lane on this endpoint (`_PM_ROLE_NAMES` in
 * `services/dashboard/revenue_report/sales_team_revenue.py`).
 *
 * `channel_manager` / `end_customer` were added 2026-08-19 to match the
 * backend's `_UNASSIGNED_TAIL_ROLE_NAMES`. Both hold
 * `crm:lead_view_unassigned` / `crm:deal_view_unassigned`, so they already
 * open unassigned rows from the Leads and Deals lists; before this they got
 * a permanently hidden tile here and the widget read as "there are none".
 * Keep this list in step with that backend constant — a role present here
 * but absent there just sees the tile hide on the server's 0.
 */
export const SALES_TEAM_UNASSIGNED_ACCESS: AccessRule = {
  roles: [
    "admin",
    "superadmin",
    "product_manager",
    "asst_product_manager",
    "channel_manager",
    "end_customer",
  ],
  // is_superuser bypasses (allowSuperuser defaults to true).
};
