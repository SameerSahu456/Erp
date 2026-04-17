import type { RoleConfig } from '@/types/auth'

export const ROLE_HIERARCHY: Record<string, RoleConfig> = {
  SUPERADMIN: {
    role: 'SUPERADMIN',
    label: 'Super Admin',
    inherits: ['ADMIN'],
    defaultDashboard: '/dashboard',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    inherits: [
      'PRODUCT_MANAGER',
      'SALES_MANAGER',
      'WAREHOUSE_MANAGER',
      'PROCUREMENT_MANAGER',
      'FINANCE_MANAGER',
      'RENTAL_MANAGER',
      'ECOMMERCE_ADMIN',
    ],
    defaultDashboard: '/dashboard',
  },
  PRODUCT_MANAGER: {
    role: 'PRODUCT_MANAGER',
    label: 'Product Manager',
    crossModuleView: ['crm', 'procurement', 'ims'],
    defaultDashboard: '/crm',
  },
  SALES_MANAGER: {
    role: 'SALES_MANAGER',
    label: 'Sales Manager',
    inherits: ['SALES_REP'],
    crossModuleView: ['ims'],
    defaultDashboard: '/crm',
  },
  SALES_REP: {
    role: 'SALES_REP',
    label: 'Sales Representative',
    defaultDashboard: '/crm',
  },
  WAREHOUSE_MANAGER: {
    role: 'WAREHOUSE_MANAGER',
    label: 'Warehouse Manager',
    inherits: ['WAREHOUSE_EXECUTIVE', 'INSPECTION_ENGINEER', 'TECHNICAL_TEAM', 'QC_ENGINEER'],
    crossModuleView: ['procurement'],
    defaultDashboard: '/wms',
  },
  WAREHOUSE_EXECUTIVE: {
    role: 'WAREHOUSE_EXECUTIVE',
    label: 'Warehouse Executive',
    defaultDashboard: '/wms',
  },
  INSPECTION_ENGINEER: {
    role: 'INSPECTION_ENGINEER',
    label: 'Inspection Engineer',
    defaultDashboard: '/wms',
  },
  TECHNICAL_TEAM: {
    role: 'TECHNICAL_TEAM',
    label: 'Technical Team',
    defaultDashboard: '/wms',
  },
  QC_ENGINEER: {
    role: 'QC_ENGINEER',
    label: 'QC Engineer',
    defaultDashboard: '/wms',
  },
  PROCUREMENT_MANAGER: {
    role: 'PROCUREMENT_MANAGER',
    label: 'Procurement Manager',
    inherits: ['PROCUREMENT_EXEC'],
    crossModuleView: ['ims'],
    defaultDashboard: '/procurement',
  },
  PROCUREMENT_EXEC: {
    role: 'PROCUREMENT_EXEC',
    label: 'Procurement Executive',
    defaultDashboard: '/procurement',
  },
  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER',
    label: 'Finance Manager',
    inherits: ['FINANCE_EXEC'],
    crossModuleView: ['crm', 'procurement', 'wms', 'ims', 'rentals'],
    defaultDashboard: '/accounting',
  },
  FINANCE_EXEC: {
    role: 'FINANCE_EXEC',
    label: 'Finance Executive',
    defaultDashboard: '/accounting',
  },
  RENTAL_MANAGER: {
    role: 'RENTAL_MANAGER',
    label: 'Rental Manager',
    crossModuleView: ['ims', 'customers'],
    defaultDashboard: '/rentals',
  },
  ECOMMERCE_ADMIN: {
    role: 'ECOMMERCE_ADMIN',
    label: 'E-commerce Admin',
    crossModuleView: ['ims'],
    defaultDashboard: '/ecommerce',
  },
  VIEWER: {
    role: 'VIEWER',
    label: 'Viewer',
    defaultDashboard: '/reports',
  },
  // CRM-specific roles
  CRM_CHANNEL_MANAGER: {
    role: 'CRM_CHANNEL_MANAGER',
    label: 'Channel Manager',
    inherits: ['CRM_SR_ACCOUNT_MANAGER'],
    defaultDashboard: '/crm',
  },
  CRM_SR_ACCOUNT_MANAGER: {
    role: 'CRM_SR_ACCOUNT_MANAGER',
    label: 'Sr. Account Manager',
    inherits: ['CRM_AREA_MANAGER'],
    defaultDashboard: '/crm',
  },
  CRM_AREA_MANAGER: {
    role: 'CRM_AREA_MANAGER',
    label: 'Area Manager',
    inherits: ['CRM_BDE_CHANNEL'],
    defaultDashboard: '/crm',
  },
  CRM_BDE_CHANNEL: {
    role: 'CRM_BDE_CHANNEL',
    label: 'BDE (Channel)',
    defaultDashboard: '/crm',
  },
  CRM_INSIDE_SALES_MANAGER: {
    role: 'CRM_INSIDE_SALES_MANAGER',
    label: 'Inside Sales Manager',
    inherits: ['CRM_INSIDE_SALES_REP'],
    defaultDashboard: '/crm',
  },
  CRM_INSIDE_SALES_REP: {
    role: 'CRM_INSIDE_SALES_REP',
    label: 'Inside Sales Rep',
    inherits: ['CRM_BDE_END_CUSTOMER'],
    defaultDashboard: '/crm',
  },
  CRM_BDE_END_CUSTOMER: {
    role: 'CRM_BDE_END_CUSTOMER',
    label: 'BDE (End Customer)',
    defaultDashboard: '/crm',
  },
  CRM_SUPPORT_MANAGER: {
    role: 'CRM_SUPPORT_MANAGER',
    label: 'Support Manager',
    inherits: ['CRM_SUPPORT_AGENT'],
    defaultDashboard: '/crm',
  },
  CRM_SUPPORT_AGENT: {
    role: 'CRM_SUPPORT_AGENT',
    label: 'Support Agent',
    defaultDashboard: '/crm',
  },
}

export function hasRoleAccess(userRole: string, targetRole: string): boolean {
  if (userRole === targetRole) return true
  const config = ROLE_HIERARCHY[userRole]
  if (!config?.inherits) return false
  return config.inherits.some(
    (inherited) => inherited === targetRole || hasRoleAccess(inherited, targetRole)
  )
}

export function hasCrossModuleView(userRole: string, module: string): boolean {
  const config = ROLE_HIERARCHY[userRole]
  if (!config) return false
  if (config.crossModuleView?.includes(module)) return true
  if (config.inherits) {
    return config.inherits.some((inherited) => hasCrossModuleView(inherited, module))
  }
  return false
}
