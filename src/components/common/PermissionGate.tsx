import type { ReactNode } from 'react'
import type { UserRole, PermissionAction } from '@/types/auth'
import { useAuth } from '@/contexts/AuthContext'

interface PermissionGateProps {
  children: ReactNode
  role?: UserRole
  permission?: {
    module: string
    entity: string
    action: PermissionAction
  }
  categoryScope?: string[]
  fallback?: ReactNode
}

export function PermissionGate({
  children,
  role,
  permission,
  categoryScope,
  fallback = null,
}: PermissionGateProps) {
  const { hasRole, hasPermission, user } = useAuth()

  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  if (permission && !hasPermission(permission.module, permission.entity, permission.action)) {
    return <>{fallback}</>
  }

  if (categoryScope && categoryScope.length > 0) {
    const userCategories = user.assignedCategories ?? []
    const hasCategory = categoryScope.some((cat) => userCategories.includes(cat))
    if (!hasCategory && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
