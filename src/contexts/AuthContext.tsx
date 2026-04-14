import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, UserRole, PermissionAction } from '@/types/auth'
import { ROLE_HIERARCHY, hasRoleAccess, hasCrossModuleView } from '@/constants/roles'
import { MOCK_USERS } from '@/constants/mock-users'

interface AuthContextValue {
  user: User
  switchUser: (userId: string) => void
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  hasPermission: (module: string, entity: string, action: PermissionAction) => boolean
  hasModuleAccess: (module: string) => boolean
  getDefaultDashboard: () => string
  allUsers: User[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(MOCK_USERS[0]!)

  const switchUser = useCallback((userId: string) => {
    const found = MOCK_USERS.find((u) => u.id === userId)
    if (found) setUser(found)
  }, [])

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => ({ ...prev, role }))
  }, [])

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return hasRoleAccess(user.role, role)
    },
    [user.role]
  )

  const hasPermission = useCallback(
    (module: string, _entity: string, action: PermissionAction): boolean => {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true

      const perm = user.permissions.find(
        (p) => p.module === module && p.entity === _entity
      )
      if (perm?.actions.includes(action)) return true

      if (action === 'view' && hasCrossModuleView(user.role, module)) {
        return true
      }

      return false
    },
    [user]
  )

  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true
      if (user.role === 'VIEWER') return true

      const roleModules: Record<string, string[]> = {
        PRODUCT_MANAGER: ['crm', 'procurement', 'ims'],
        SALES_MANAGER: ['crm', 'invoices', 'reports'],
        SALES_REP: ['crm'],
        WAREHOUSE_MANAGER: ['wms', 'ims', 'reports'],
        WAREHOUSE_EXECUTIVE: ['wms'],
        INSPECTION_ENGINEER: ['wms'],
        TECHNICAL_TEAM: ['wms', 'ims'],
        QC_ENGINEER: ['wms'],
        PROCUREMENT_MANAGER: ['procurement', 'purchase-orders', 'vendors'],
        PROCUREMENT_EXEC: ['procurement'],
        FINANCE_MANAGER: ['accounting', 'invoices', 'reconciliation', 'reports'],
        FINANCE_EXEC: ['accounting', 'invoices'],
        RENTAL_MANAGER: ['rentals', 'ims', 'customers'],
        ECOMMERCE_ADMIN: ['ecommerce', 'ims'],
      }

      const directModules = roleModules[user.role] ?? []
      if (directModules.includes(module)) return true

      return hasCrossModuleView(user.role, module)
    },
    [user.role]
  )

  const getDefaultDashboard = useCallback((): string => {
    return ROLE_HIERARCHY[user.role]?.defaultDashboard ?? '/dashboard'
  }, [user.role])

  return (
    <AuthContext.Provider
      value={{
        user,
        switchUser,
        switchRole,
        hasRole,
        hasPermission,
        hasModuleAccess,
        getDefaultDashboard,
        allUsers: MOCK_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
