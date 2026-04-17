import type { UserRole } from '@/types/auth'
import type { AccessLevel } from '@/types/navigation'

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

/**
 * Resolve the CRM access level for any role.
 * CRM-specific roles use their config. Legacy roles and admins get 'both'.
 */
export function getCrmAccessLevel(role: UserRole): AccessLevel {
  const crmRole = CRM_ROLES[role]
  if (crmRole) return crmRole.accessLevel
  // SUPERADMIN, ADMIN, PRODUCT_MANAGER, SALES_MANAGER, SALES_REP — all get full access
  return 'both'
}

/**
 * Check if a role can reinstate rejected leads.
 * Manager-level CRM roles + legacy manager roles + admins.
 */
export function canReinstateLead(role: UserRole): boolean {
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'SALES_MANAGER') return true
  const crmRole = CRM_ROLES[role]
  return crmRole?.canReinstateLead ?? false
}
