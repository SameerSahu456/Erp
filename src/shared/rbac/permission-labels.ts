// Human-readable labels for every RBAC permission code, so a denied UI can name
// the specific missing permission ("Edit Accounts (crm:account_write)") instead
// of a generic "access denied". Codes mirror the per-module `permissions.ts`
// files (crm / ims / procurement / settings / audit), which in turn mirror the
// backend `codes.py`. Keep this map in sync when a code is added there.
//
// §16.12 (no naked strings): this is the centralized copy source for RBAC
// requirement text; NoAccess renders it via <Typography>.

export const PERMISSION_LABELS: Record<string, string> = {
  // ── CRM · broad ──────────────────────────────────────────────────────
  "crm:read": "View CRM",
  "crm:manage": "Manage CRM",
  "crm:approve": "Approve CRM records",
  "crm:lead_convert": "Convert Leads",
  // ── CRM · lead ───────────────────────────────────────────────────────
  "crm:lead_read": "View Leads",
  "crm:lead_write": "Edit Leads",
  "crm:lead_delete": "Delete Leads",
  // ── CRM · account ────────────────────────────────────────────────────
  "crm:account_read": "View Accounts",
  "crm:account_write": "Edit Accounts",
  "crm:account_delete": "Delete Accounts",
  "crm:account_approve": "Approve Accounts",
  "crm:account_request_approve": "Approve Account Access Requests",
  // ── CRM · contact ────────────────────────────────────────────────────
  "crm:contact_read": "View Contacts",
  "crm:contact_write": "Edit Contacts",
  "crm:contact_delete": "Delete Contacts",
  // ── CRM · deal ───────────────────────────────────────────────────────
  "crm:deal_read": "View Deals",
  "crm:deal_write": "Edit Deals",
  "crm:deal_delete": "Delete Deals",
  // ── CRM · quote ──────────────────────────────────────────────────────
  "crm:quote_read": "View Quotes",
  "crm:quote_write": "Edit Quotes",
  "crm:quote_delete": "Delete Quotes",
  "crm:quote_approve": "Approve Quotes",
  // ── CRM · material inquiry ───────────────────────────────────────────
  "crm:mi_read": "View Material Inquiries",
  "crm:mi_write": "Edit Material Inquiries",
  "crm:mi_delete": "Delete Material Inquiries",
  "crm:mi_approve": "Approve Material Inquiries",
  // ── CRM · demo request ───────────────────────────────────────────────
  "crm:dr_read": "View Demo Requests",
  "crm:dr_write": "Edit Demo Requests",
  "crm:dr_delete": "Delete Demo Requests",
  "crm:dr_approve": "Approve Demo Requests",
  // ── CRM · task ───────────────────────────────────────────────────────
  "crm:task_read": "View Tasks",
  "crm:task_write": "Edit Tasks",
  "crm:task_delete": "Delete Tasks",
  // ── CRM · meeting ────────────────────────────────────────────────────
  "crm:meeting_read": "View Meetings",
  "crm:meeting_write": "Edit Meetings",
  "crm:meeting_delete": "Delete Meetings",
  // ── CRM · sales order ────────────────────────────────────────────────
  "crm:so_read": "View Sales Orders",
  "crm:so_write": "Edit Sales Orders",
  "crm:so_approve": "Approve Sales Orders",
  "crm:so_reassign": "Reassign Sales Orders",
  "crm:so_manage": "Manage Sales Orders",
  // ── IMS ──────────────────────────────────────────────────────────────
  "ims:read": "View Inventory",
  "ims:manage": "Manage Inventory",
  // ── Procurement · umbrella (legacy — still OR-fallback on every endpoint) ──
  "procurement:read": "View Procurement",
  "procurement:respond": "Respond to Procurement Requests",
  "procurement:approve": "Approve Procurement",
  // ── Procurement · vendor ─────────────────────────────────────────────
  "procurement:vendor_read": "View Vendors",
  "procurement:vendor_write": "Edit Vendors",
  "procurement:vendor_delete": "Delete Vendors",
  // ── Procurement · purchase order ─────────────────────────────────────
  "procurement:po_read": "View Purchase Orders",
  "procurement:po_write": "Edit Purchase Orders",
  "procurement:po_delete": "Delete Purchase Orders",
  "procurement:po_approve": "Approve Purchase Orders",
  // ── Procurement · purchase request ───────────────────────────────────
  "procurement:pr_read": "View Purchase Requests",
  "procurement:pr_write": "Edit Purchase Requests",
  "procurement:pr_delete": "Delete Purchase Requests",
  "procurement:pr_approve": "Approve Purchase Requests",
  // ── Procurement · purchase return ────────────────────────────────────
  "procurement:po_return_read": "View Purchase Returns",
  "procurement:po_return_write": "Manage Purchase Returns",
  "procurement:po_return_settle": "Settle Purchase Returns",
  // ── Settings ─────────────────────────────────────────────────────────
  "settings.profile.view": "View Profile",
  "settings.profile.update": "Update Profile",
  "settings.user.view": "View Users",
  "settings.user.create": "Create Users",
  "settings.user.update": "Update Users",
  "settings.user.delete": "Delete Users",
  "settings.role.view": "View Roles",
  "settings.role.update": "Update Roles",
  "settings.app_settings.view": "View App Settings",
  "settings.app_settings.update": "Update App Settings",
  // ── Audit ────────────────────────────────────────────────────────────
  "audit:read": "View Audit Trail",
  // ── Rentals ──────────────────────────────────────────────────────────
  "rentals:read": "View Rentals",
  "rentals:agreement_view": "Open Rental Agreements",
  "rentals:manage": "Edit Rental Billing Defaults",
  "rentals:configure": "Configure Rental Agreements",
  "rentals:agreement_approve": "Approve or Reject Rental Agreements",
  "rentals:signature_record": "Record Agreement Signatures",
  "rentals:hold": "Hold Rentals",
  "rentals:extend": "Extend Rentals",
  "rentals:extend_approve": "Approve Rental Extends",
  "rentals:replace": "Replace Rented Units",
  "rentals:return": "Raise Rental Returns",
  "rentals:terminate": "Terminate Rentals",
  "rentals:terminate_approve": "Decide Rental Terminations",
  "rentals:delivery_record": "Record Rental Deliveries",
  "rentals:invoice_create": "Raise Rental Invoices",
  "rentals:invoice_delete": "Delete Rental Invoices",
  "rentals:invoice_delete_approve": "Decide Rental Invoice Deletions",
  "rentals:invoice_export": "Export Rental Invoices",
  "rentals:credit_note_create": "Record Rental Credit Notes",
  "rentals:run_billing": "Run Rental Billing",
  "rentals:auto_billing_manage": "Manage Automatic Rental Billing",
  "rentals:return_approve": "Decide Rental Returns",
  "rentals:rate_change_approve": "Decide Rental Rate Changes",
  "rentals:replace_approve": "Decide Rental Replacements",
  "rentals:replace_edit": "Edit Rental Replacement Requests",
  "rentals:replace_reassign": "Reassign Rental Replacement Approvers",
  "rentals:replace_waive_return": "Waive Rental Replacement Returns",
  "rentals:swap_approve": "Approve Rental Serial Swaps",
  "rentals:adjustment_issue": "Issue Rental Billing Adjustments",
  "rentals:early_exit_waive": "Request Early-Exit Waivers",
  "rentals:early_exit_waive_approve": "Approve Early-Exit Waivers",
  "rentals:po_manage": "Record Rental Customer POs",
  "rentals:po_extend_approve": "Approve Rental PO Extensions",
};

/** Requirement-block copy. Centralized per §16.12. */
export const PERMISSION_REQUIREMENT_STRINGS = {
  /** Heading above the missing-permission list. */
  header: "You don't have the required permission:",
  /**
   * Joins the codes inside a single OR-bundle. The frontend gate knows the
   * whole bundle, so we show every code the user could hold to satisfy that
   * requirement (holding any one is enough).
   */
  orSeparator: " or ",
} as const;

/** "Edit Accounts (crm:account_write)", or the raw code if unlabelled. */
export function describePermission(code: string): string {
  const label = PERMISSION_LABELS[code];
  return label ? `${label} (${code})` : code;
}

export interface MissingPermissionsView {
  /** Heading for the requirement block. */
  header: string;
  /** One line per OR-bundle; options within a bundle joined by " or ". */
  lines: string[];
}

/**
 * Normalize a missing-permissions input into display-ready copy. Accepts either
 * a single OR-bundle (`string[]`, from `usePermission().missing`) or a list of
 * unmet OR-bundles (`string[][]`, from `usePermission().missingAll`).
 * Returns `null` when there is nothing to show.
 */
export function formatMissingPermissions(
  missing: readonly string[] | readonly (readonly string[])[] | undefined,
): MissingPermissionsView | null {
  if (!missing || missing.length === 0) return null;

  // Normalize to groups of codes (each group is an OR-bundle).
  const groups: string[][] = Array.isArray(missing[0])
    ? (missing as readonly (readonly string[])[]).map((g) => [...g])
    : [[...(missing as readonly string[])]];

  // One line per unmet OR-bundle. The frontend gate knows the whole bundle, so
  // each line lists every code that would satisfy that requirement, joined by
  // "or" — holding any one of them is enough.
  const nonEmpty = groups.filter((g) => g.length > 0);
  if (nonEmpty.length === 0) return null;

  const lines = nonEmpty.map((g) =>
    g.map(describePermission).join(PERMISSION_REQUIREMENT_STRINGS.orSeparator),
  );

  return { header: PERMISSION_REQUIREMENT_STRINGS.header, lines };
}
