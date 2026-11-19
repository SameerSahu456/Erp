import { crmCan } from "@modules/crm";
import type { AccessRule } from "@shared/rbac";

/**
 * Who may see a user's Activity Log — the slide-over in User Management and the
 * Activity History card on the User Detail page.
 *
 * Backend contract (`GET /api/v1/crm/activity-log`, codes.py `CRM_USER_LOG_READ`):
 * allowed for `is_superuser` OR holders of `crm:user_log_read`. We mirror that
 * and additionally open it to the `admin` / `superadmin` roles by name — the
 * same privileged-role convenience the rest of the app uses.
 *
 * ┌─ TO GRANT ACCESS TO A NEW ROLE OR PERMISSION, EDIT HERE ─────────────────┐
 * │  • add a role name to `roles`         (e.g. "sales_manager")             │
 * │  • add a permission code to `permissions` (e.g. crmCan.readSomething)    │
 * │ Nothing at the call sites changes.                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Note: role-only access still hits the backend gate — if a role is neither
 * `is_superuser` nor granted `crm:user_log_read`, the API 403s and the panel
 * shows the friendly no-access state. Granting the permission (or is_superuser)
 * to that role is what actually makes the data load.
 */
export const USER_ACTIVITY_LOG_ACCESS: AccessRule = {
  permissions: crmCan.readUserLog, // ["crm:user_log_read"]
  roles: ["admin", "superadmin"],
  // is_superuser bypasses (allowSuperuser defaults to true).
};
