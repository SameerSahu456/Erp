import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Users, UserCheck, UserX, Shield, Pencil, Ban } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { USER_ROLES } from '@/types/auth'
import { ROLE_HIERARCHY } from '@/constants/roles'
import { MOCK_USERS } from '@/constants/mock-users'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import { BusinessMetricsTable, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import { TagInput } from '@/components/common/TagInput'

type MockUserRow = Record<string, unknown> & {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: string
  lastLogin: string
}

const DEPARTMENTS = ['Sales', 'Warehouse', 'Procurement', 'Finance', 'IT', 'Management']

const MOCK_USER_ROWS: MockUserRow[] = [
  ...MOCK_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: ROLE_HIERARCHY[u.role]?.label ?? u.role,
    department: u.role.includes('SALES') ? 'Sales' : u.role.includes('WAREHOUSE') || u.role.includes('INSPECTION') || u.role.includes('TECHNICAL') || u.role.includes('QC') ? 'Warehouse' : u.role.includes('PROCUREMENT') ? 'Procurement' : u.role.includes('FINANCE') ? 'Finance' : u.role.includes('ECOMMERCE') ? 'IT' : 'Management',
    status: u.role === 'VIEWER' ? 'Inactive' : 'Active',
    lastLogin: '2026-04-15',
  })),
  { id: '9', name: 'Ravi Patel', email: 'ravi@comprinttech.com', role: 'Sales Representative', department: 'Sales', status: 'Active', lastLogin: '2026-04-14' },
  { id: '10', name: 'Meena Iyer', email: 'meena@comprinttech.com', role: 'Procurement Executive', department: 'Procurement', status: 'Active', lastLogin: '2026-04-13' },
  { id: '11', name: 'Arjun Nair', email: 'arjun@comprinttech.com', role: 'QC Engineer', department: 'Warehouse', status: 'Inactive', lastLogin: '2026-03-28' },
  { id: '12', name: 'Pooja Gupta', email: 'pooja@comprinttech.com', role: 'Finance Executive', department: 'Finance', status: 'Active', lastLogin: '2026-04-15' },
]

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'lastLogin', label: 'Last Login', sortable: true },
  { key: 'actions', label: 'Actions', align: 'right' as const },
]

export default function UserManagementPage() {
  const { user: _currentUser } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [users] = useState(MOCK_USER_ROWS)

  // Add user form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState<string>('SALES_REP')
  const [newDepartment, setNewDepartment] = useState('Sales')
  const [newCategories, setNewCategories] = useState<string[]>([])
  const [newActive, setNewActive] = useState(true)

  const activeUsers = useMemo(() => users.filter((u) => u.status === 'Active'), [users])
  const inactiveUsers = useMemo(() => users.filter((u) => u.status === 'Inactive'), [users])
  const adminUsers = useMemo(
    () => users.filter((u) => u.role === 'Super Admin' || u.role === 'Admin'),
    [users]
  )

  const cellFormatter: CellFormatter = (value, key, _row) => {
    if (key === 'role') {
      return {
        display: <StatusBadge variant="info">{String(value)}</StatusBadge>,
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }
    if (key === 'actions') {
      return {
        display: (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => toast.info(`Edit ${_row.name}`)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                toast.info(
                  `${_row.status === 'Active' ? 'Deactivated' : 'Activated'} ${_row.name}`
                )
              }
            >
              <Ban className="size-3.5" />
            </Button>
          </div>
        ),
      }
    }
    return null
  }

  const handleCreateUser = () => {
    if (!newName || !newEmail) {
      toast.error('Name and email are required')
      return
    }
    toast.success(`User "${newName}" created successfully`)
    setDialogOpen(false)
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setNewRole('SALES_REP')
    setNewDepartment('Sales')
    setNewCategories([])
    setNewActive(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Add, edit, and deactivate users across roles and departments."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-1.5 size-4" />
                  Add User
                </Button>
              }
            />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Name *</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@comprinttech.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_HIERARCHY[role]?.label ?? role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={newDepartment} onValueChange={(v) => setNewDepartment(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newRole === 'PRODUCT_MANAGER' && (
                <div className="space-y-1.5">
                  <Label>Assigned Categories</Label>
                  <TagInput
                    value={newCategories}
                    onChange={setNewCategories}
                    placeholder="Add category..."
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="new-active">Active</Label>
                <Switch
                  checked={newActive}
                  onCheckedChange={(val) => setNewActive(val as boolean)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total Users', value: users.length, icon: Users, accent: 'primary' as const },
          { label: 'Active', value: activeUsers.length, icon: UserCheck, accent: 'success' as const },
          { label: 'Inactive', value: inactiveUsers.length, icon: UserX, accent: 'warning' as const },
          { label: 'Admins', value: adminUsers.length, icon: Shield, accent: 'violet' as const },
        ]}
      />

      <BusinessMetricsTable
        tabs={[
          {
            id: 'active',
            label: 'Active',
            columns,
            data: activeUsers,
          },
          {
            id: 'inactive',
            label: 'Inactive',
            columns,
            data: inactiveUsers,
          },
          {
            id: 'all',
            label: 'All',
            columns,
            data: users,
          },
        ]}
        cellFormatter={cellFormatter}
        persistKey="settings-users"
      />
    </div>
  )
}
