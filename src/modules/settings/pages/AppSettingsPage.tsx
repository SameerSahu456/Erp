import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Sun, Moon, Monitor } from 'lucide-react'

import { useTheme, THEMES } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/page'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { cn } from '@/lib/utils'

// Theme color swatches (primary, background, card approximate colors)
const THEME_SWATCHES: Record<string, { primary: string; bg: string; card: string }> = {
  'shadcn-default': { primary: '#18181b', bg: '#ffffff', card: '#ffffff' },
  'comprint-crm': { primary: '#2563eb', bg: '#f8fafc', card: '#ffffff' },
  'corporate-slate': { primary: '#475569', bg: '#f8fafc', card: '#ffffff' },
  'modern-minimalist': { primary: '#0f172a', bg: '#fafafa', card: '#ffffff' },
  'high-contrast': { primary: '#000000', bg: '#ffffff', card: '#ffffff' },
  'ocean-blue': { primary: '#0369a1', bg: '#f0f9ff', card: '#ffffff' },
  'forest-green': { primary: '#15803d', bg: '#f0fdf4', card: '#ffffff' },
  'amber-warm': { primary: '#d97706', bg: '#fffbeb', card: '#ffffff' },
}

export default function AppSettingsPage() {
  const { theme, setTheme, colorMode, setColorMode } = useTheme()

  const [sidebarDefault, setSidebarDefault] = useState('expanded')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [currency, setCurrency] = useState('INR')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [notifCRM, setNotifCRM] = useState(true)
  const [notifWMS, setNotifWMS] = useState(true)
  const [notifProcurement, setNotifProcurement] = useState(true)
  const [notifInvoices, setNotifInvoices] = useState(false)
  const [digestFrequency, setDigestFrequency] = useState('daily')

  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  const handleExportData = () => {
    toast.info('Exporting all data...')
  }

  const handleDeleteAccount = () => {
    toast.error('Account deletion is not available in demo mode')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Settings"
        subtitle="Theme, color mode, notifications, and account preferences."
        breadcrumbs={[{ label: 'Settings' }, { label: 'App' }]}
      />

      {/* Section 1: Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme cards grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEMES.map((t) => {
              const swatch = THEME_SWATCHES[t.id]
              const isActive = theme === t.id

              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:shadow-sm',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent ring-1 ring-foreground/10 hover:ring-foreground/20'
                  )}
                >
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                  {/* Color swatches */}
                  <div className="flex gap-1.5">
                    <div
                      className="size-5 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: swatch?.primary }}
                      title="Primary"
                    />
                    <div
                      className="size-5 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: swatch?.bg }}
                      title="Background"
                    />
                    <div
                      className="size-5 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: swatch?.card }}
                      title="Card"
                    />
                  </div>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Color mode toggle */}
          <div className="space-y-1.5">
            <Label>Color Mode</Label>
            <div className="flex items-center gap-1 rounded-lg border p-0.5 w-fit">
              <Button
                variant={colorMode === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('light')}
              >
                <Sun className="mr-1.5 size-4" />
                Light
              </Button>
              <Button
                variant={colorMode === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('dark')}
              >
                <Moon className="mr-1.5 size-4" />
                Dark
              </Button>
              <Button
                variant={colorMode === 'system' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('system')}
              >
                <Monitor className="mr-1.5 size-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Display */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sidebar Default State</Label>
              <Select value={sidebarDefault} onValueChange={(v) => setSidebarDefault(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expanded">Expanded</SelectItem>
                  <SelectItem value="collapsed">Collapsed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Items per Page</Label>
              <Select value={itemsPerPage} onValueChange={(v) => setItemsPerPage(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value="en" disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="English" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">More languages coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Email Notifications</Label>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(v) => setEmailNotifications(v as boolean)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Push Notifications</Label>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(v) => setPushNotifications(v as boolean)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notification Types</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notifCRM} onCheckedChange={(v) => setNotifCRM(v as boolean)} />
                CRM
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notifWMS} onCheckedChange={(v) => setNotifWMS(v as boolean)} />
                WMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={notifProcurement}
                  onCheckedChange={(v) => setNotifProcurement(v as boolean)}
                />
                Procurement
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={notifInvoices}
                  onCheckedChange={(v) => setNotifInvoices(v as boolean)}
                />
                Invoices
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Digest Frequency</Label>
            <Select value={digestFrequency} onValueChange={(v) => setDigestFrequency(v as string)}>
              <SelectTrigger className="w-40">
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

      {/* Section 4: Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Export All Data</p>
              <p className="text-xs text-muted-foreground">
                Download all your data as a ZIP archive
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
            <div>
              <p className="font-medium text-sm text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <ConfirmDialog
              title="Delete Account"
              description="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
              confirmLabel="Delete Account"
              variant="destructive"
              onConfirm={handleDeleteAccount}
              trigger={
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
