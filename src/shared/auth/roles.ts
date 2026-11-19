export const USER_ROLES = [
  'SUPERADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'SALES_MANAGER',
  'SALES_REP',
  'WAREHOUSE_MANAGER',
  'WAREHOUSE_EXECUTIVE',
  'INSPECTION_ENGINEER',
  'TECHNICAL_TEAM',
  'QC_ENGINEER',
  'PROCUREMENT_MANAGER',
  'PROCUREMENT_EXEC',
  // IMS role labels — the FE doesn't gate IMS UI on these strings.
  // Visibility is driven by the `ims:read` / `ims:manage` permission
  // codes the backend assigns to the role (see `src/modules/ims/
  // permissions.ts` for the gate helpers). Adding new IMS roles is a
  // backend role-permission-mapping change; this list just types the
  // role label so existing role-display surfaces stay happy.
  'IMS_MANAGER',
  'IMS_EXECUTIVE',
  'FINANCE_MANAGER',
  'FINANCE_EXEC',
  'RENTAL_MANAGER',
  'ECOMMERCE_ADMIN',
  'VIEWER',
  // CRM-specific roles
  'CRM_CHANNEL_MANAGER',
  'CRM_SR_ACCOUNT_MANAGER',
  'CRM_AREA_MANAGER',
  'CRM_BDE_CHANNEL',
  'CRM_INSIDE_SALES_MANAGER',
  'CRM_INSIDE_SALES_REP',
  'CRM_BDE_END_CUSTOMER',
  'CRM_SUPPORT_MANAGER',
  'CRM_SUPPORT_AGENT',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface RoleConfig {
  role: UserRole
  label: string
  inherits?: UserRole[]
  crossModuleView?: string[]
  defaultDashboard: string
}
