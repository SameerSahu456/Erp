import { useState } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HIERARCHY } from '@/constants/roles'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  const { user } = useAuth()
  const roleConfig = ROLE_HIERARCHY[user.role]

  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState('+91 98765 43210')
  const [department, setDepartment] = useState('Management')
  const [bio, setBio] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [emailDigest, setEmailDigest] = useState('daily')

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleSave = () => {
    toast.success('Profile updated successfully')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Update your personal information and preferences."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Profile' }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Personal Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                  <button
                    onClick={() => toast.info('Avatar upload coming soon')}
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <div className="flex h-8 items-center">
                    <StatusBadge variant="info">
                      {roleConfig?.label ?? user.role}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <StatusBadge variant="info">
                  {roleConfig?.label ?? user.role}
                </StatusBadge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm font-medium">January 15, 2024</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="text-sm font-medium">Today, 09:30 AM</p>
              </div>
              {user.role === 'PRODUCT_MANAGER' && user.assignedCategories && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Assigned Categories
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {user.assignedCategories.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(val) => setNotificationsEnabled(val as boolean)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email Digest</Label>
                <Select value={emailDigest} onValueChange={(v) => setEmailDigest(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
