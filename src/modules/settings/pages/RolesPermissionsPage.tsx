import { useState, useMemo } from 'react'
import { toast } from 'sonner'

import { USER_ROLES, type UserRole } from '@/types/auth'
import { ROLE_HIERARCHY } from '@/constants/roles'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/common/StatusBadge'

const MODULES = [
  'CRM',
  'WMS',
  'IMS',
  'Procurement',
  'Invoices',
  'Accounting',
  'Reconciliation',
  'E-commerce',
  'Vendors',
  'Customers',
  'Rentals',
  'Reports',
  'Settings',
] as const

// Pre-computed module access mapping
const MODULE_ACCESS: Record<string, Set<string>> = {
  SUPERADMIN: new Set(MODULES),
  ADMIN: new Set(MODULES),
  PRODUCT_MANAGER: new Set(['CRM', 'Procurement', 'IMS', 'Reports']),
  SALES_MANAGER: new Set(['CRM', 'IMS', 'Invoices', 'Reports']),
  SALES_REP: new Set(['CRM']),
  WAREHOUSE_MANAGER: new Set(['WMS', 'IMS', 'Procurement', 'Reports']),
  WAREHOUSE_EXECUTIVE: new Set(['WMS']),
  INSPECTION_ENGINEER: new Set(['WMS']),
  TECHNICAL_TEAM: new Set(['WMS', 'IMS']),
  QC_ENGINEER: new Set(['WMS']),
  PROCUREMENT_MANAGER: new Set(['Procurement', 'IMS', 'Vendors']),
  PROCUREMENT_EXEC: new Set(['Procurement']),
  FINANCE_MANAGER: new Set(['Accounting', 'Invoices', 'Reconciliation', 'CRM', 'Procurement', 'WMS', 'IMS', 'Rentals', 'Reports']),
  FINANCE_EXEC: new Set(['Accounting', 'Invoices']),
  RENTAL_MANAGER: new Set(['Rentals', 'IMS', 'Customers']),
  ECOMMERCE_ADMIN: new Set(['E-commerce', 'IMS']),
  VIEWER: new Set(MODULES),
}

function getRoleIndentLevel(role: UserRole): number {
  const childRoles: Set<string> = new Set([
    'SALES_REP',
    'WAREHOUSE_EXECUTIVE',
    'INSPECTION_ENGINEER',
    'TECHNICAL_TEAM',
    'QC_ENGINEER',
    'PROCUREMENT_EXEC',
    'FINANCE_EXEC',
  ])
  if (role === 'SUPERADMIN') return 0
  if (role === 'ADMIN') return 1
  if (childRoles.has(role)) return 3
  return 2
}

export default function RolesPermissionsPage() {
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const role of USER_ROLES) {
      initial[role] = new Set(MODULE_ACCESS[role] ?? [])
    }
    return initial
  })

  const handleTogglePermission = (role: UserRole, module: string) => {
    if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'VIEWER') return

    setPermissions((prev) => {
      const next = { ...prev }
      const roleSet = new Set(prev[role])
      if (roleSet.has(module)) {
        roleSet.delete(module)
      } else {
        roleSet.add(module)
      }
      next[role] = roleSet
      return next
    })
    toast.info(`Permission updated for ${ROLE_HIERARCHY[role]?.label}`)
  }

  const roleTableData = useMemo(() => {
    return USER_ROLES.map((role) => {
      const config = ROLE_HIERARCHY[role]
      return {
        role,
        label: config?.label ?? role,
        inherits: config?.inherits ?? [],
        crossModuleView: config?.crossModuleView ?? [],
        defaultDashboard: config?.defaultDashboard ?? '/dashboard',
        indent: getRoleIndentLevel(role),
      }
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Role hierarchy and permission matrix across modules."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles' }]}
      />

      {/* Section 1: Role List */}
      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Role Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Inherits From</TableHead>
                  <TableHead>Cross-Module View</TableHead>
                  <TableHead>Default Dashboard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleTableData.map(({ role, label, inherits, crossModuleView, defaultDashboard, indent }) => (
                  <TableRow key={role}>
                    <TableCell>
                      <span style={{ paddingLeft: `${indent * 16}px` }} className="flex items-center gap-1.5">
                        {indent > 0 && (
                          <span className="text-muted-foreground/40">
                            {indent === 1 ? '|--' : indent === 2 ? '|--' : '   |--'}
                          </span>
                        )}
                        <code className="text-xs">{role}</code>
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inherits.map((r) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {ROLE_HIERARCHY[r]?.label ?? r}
                          </Badge>
                        ))}
                        {inherits.length === 0 && (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {crossModuleView.map((m) => (
                          <Badge key={m} variant="secondary" className="text-xs">
                            {m}
                          </Badge>
                        ))}
                        {crossModuleView.length === 0 && (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{defaultDashboard}</code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 min-w-[180px] bg-background">
                    Role
                  </TableHead>
                  {MODULES.map((mod) => (
                    <TableHead key={mod} className="min-w-[90px] text-center text-xs">
                      {mod}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {USER_ROLES.map((role) => {
                  const isLocked = role === 'SUPERADMIN' || role === 'ADMIN'
                  const isViewer = role === 'VIEWER'
                  const rolePerms = permissions[role] ?? new Set()
                  const config = ROLE_HIERARCHY[role]

                  return (
                    <TableRow key={role}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{config?.label ?? role}</span>
                          {isLocked && (
                            <StatusBadge variant="warning" className="text-[10px]">
                              Full Access
                            </StatusBadge>
                          )}
                          {isViewer && (
                            <StatusBadge variant="neutral" className="text-[10px]">
                              Read-only
                            </StatusBadge>
                          )}
                        </div>
                      </TableCell>
                      {MODULES.map((mod) => {
                        const checked = isLocked || isViewer || rolePerms.has(mod)
                        const disabled = isLocked || isViewer

                        return (
                          <TableCell key={mod} className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={() =>
                                  handleTogglePermission(role, mod)
                                }
                              />
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
