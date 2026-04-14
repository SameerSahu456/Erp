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
  'FINANCE_MANAGER',
  'FINANCE_EXEC',
  'RENTAL_MANAGER',
  'ECOMMERCE_ADMIN',
  'VIEWER',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

export interface Permission {
  module: string
  entity: string
  actions: PermissionAction[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  permissions: Permission[]
  assignedCategories?: string[]
}

export interface RoleConfig {
  role: UserRole
  label: string
  inherits?: UserRole[]
  crossModuleView?: string[]
  defaultDashboard: string
}
