import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FormPageShell } from '@/components/page'
import { accounts } from '../data/accounts'
import { IMS_CATEGORIES } from '../types'
import type { Account, AccountAddress } from '../types'

const INDUSTRIES = ['IT Services', 'Manufacturing', 'Banking', 'Telecom', 'Retail', 'Healthcare'] as const
const ACCOUNT_TYPES = ['Enterprise', 'SMB', 'Startup', 'Government'] as const
const ACCOUNT_STATUSES = ['Active', 'Inactive', 'Prospect'] as const
const COMPANY_SIZES = ['Startup', 'SMB', 'Mid-Market', 'Large Enterprise'] as const
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function AccountFormPage() {
  const { id: accountId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingAccount = accountId ? accounts.find((a) => a.id === accountId) : undefined
  const isEdit = !!existingAccount

  const [name, setName] = useState(existingAccount?.name ?? '')
  const [industry, setIndustry] = useState(existingAccount?.industry ?? INDUSTRIES[0])
  const [type, setType] = useState<Account['type']>(existingAccount?.type ?? 'Enterprise')
  const [website, setWebsite] = useState(existingAccount?.website ?? '')
  const [revenue, setRevenue] = useState(existingAccount?.revenue?.toString() ?? '')
  const [city, setCity] = useState(existingAccount?.city ?? '')
  const [status, setStatus] = useState<Account['status']>(existingAccount?.status ?? 'Active')
  const [owner, setOwner] = useState(existingAccount?.owner ?? MOCK_OWNERS[0])
  const [location, setLocation] = useState(existingAccount?.location ?? '')
  const [companySize, setCompanySize] = useState(existingAccount?.companySize ?? '')
  const [employees, setEmployees] = useState(existingAccount?.employees?.toString() ?? '')
  const [parentAccountId, setParentAccountId] = useState(existingAccount?.parentAccountId ?? '')
  const [categoriesInterested, setCategoriesInterested] = useState<string[]>(existingAccount?.categoriesInterested ?? [])
  const [categoriesBuyed, setCategoriesBuyed] = useState<string[]>(existingAccount?.categoriesBuyed ?? [])
  const [addresses, setAddresses] = useState<AccountAddress[]>(existingAccount?.addresses ?? [])

  const backHref = isEdit ? `/crm/accounts/${accountId}` : '/crm/accounts'
  const goBack = useNavigateBack(backHref)

  let addressCounter = addresses.length

  function createBlankAddress(type: 'Billing' | 'Shipping'): AccountAddress {
    addressCounter += 1
    return {
      id: `ADDR-NEW-${Date.now()}-${addressCounter}`,
      type,
      label: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: false,
    }
  }

  function addAddress(type: 'Billing' | 'Shipping') {
    setAddresses((prev) => [...prev, createBlankAddress(type)])
  }

  function removeAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  function updateAddress(id: string, field: keyof AccountAddress, value: string | boolean) {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  function toggleDefault(id: string, type: 'Billing' | 'Shipping') {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.type === type) return { ...a, isDefault: a.id === id }
        return a
      })
    )
  }

  function handleSave() {
    if (!name.trim()) return

    toast.success(isEdit ? 'Account updated successfully' : 'Account created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
  }

  const otherAccounts = accounts.filter((a) => a.id !== accountId)
  const canSave = Boolean(name.trim())

  return (
    <FormPageShell
      title={isEdit ? `Edit Account: ${existingAccount.name}` : 'Create Account'}
      subtitle={isEdit ? 'Update account profile, addresses, and categories.' : 'Add a new customer or partner account.'}
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Accounts', href: '/crm/accounts' },
              { label: existingAccount.name, href: `/crm/accounts/${accountId}` },
              { label: 'Edit' },
            ]
          : [
              { label: 'CRM' },
              { label: 'Accounts', href: '/crm/accounts' },
              { label: 'New Account' },
            ]
      }
      backHref={backHref}
      onSave={handleSave}
      onCancel={handleCancel}
      canSave={canSave}
      saveLabel={isEdit ? 'Save Changes' : 'Create Account'}
      footerLeft={!canSave ? <span className="text-destructive/80">Account name is required.</span> : undefined}
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Account Details' : 'New Account Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-name" className="font-ui">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="account-name"
                  placeholder="Account name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Industry</Label>
                <Select value={industry} onValueChange={(val) => { if (val) setIndustry(val as string) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as Account['type'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account-website" className="font-ui">Website</Label>
                <Input
                  id="account-website"
                  placeholder="https://www.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-location" className="font-ui">Location</Label>
                <Input
                  id="account-location"
                  placeholder="City, State"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account-employees" className="font-ui">Employees</Label>
                <Input
                  id="account-employees"
                  type="number"
                  placeholder="Number of employees"
                  value={employees}
                  onChange={(e) => setEmployees(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account-revenue" className="font-ui">Revenue</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    &#8377;
                  </span>
                  <Input
                    id="account-revenue"
                    type="number"
                    placeholder="0"
                    className="pl-7"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-city" className="font-ui">City</Label>
                <Input
                  id="account-city"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Account['status'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Account Owner</Label>
                <Select value={owner} onValueChange={(val) => { if (val) setOwner(val as string) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_OWNERS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Parent Account</Label>
                <Select value={parentAccountId} onValueChange={setParentAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {otherAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Categories Interested */}
          <div className="mt-6 space-y-1.5">
            <Label className="font-ui">Categories Interested</Label>
            <MultiSelect
              options={IMS_CATEGORIES}
              value={categoriesInterested}
              onValueChange={setCategoriesInterested}
              placeholder="Select categories interested..."
            />
          </div>

          {/* Categories Bought */}
          <div className="mt-6 space-y-1.5">
            <Label className="font-ui">Categories Bought</Label>
            <MultiSelect
              options={IMS_CATEGORIES}
              value={categoriesBuyed}
              onValueChange={setCategoriesBuyed}
              placeholder="Select categories bought..."
            />
          </div>

        </CardContent>
      </Card>

      {/* Addresses Card */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Billing Addresses</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => addAddress('Billing')}>
                <Plus className="mr-1 h-4 w-4" /> Add Billing Address
              </Button>
            </div>
            {addresses.filter((a) => a.type === 'Billing').length === 0 && (
              <p className="text-sm text-muted-foreground">No billing addresses added yet.</p>
            )}
            {addresses
              .filter((a) => a.type === 'Billing')
              .map((addr) => (
                <div key={addr.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Label (e.g. HQ Billing)"
                        value={addr.label}
                        onChange={(e) => updateAddress(addr.id, 'label', e.target.value)}
                        className="w-56"
                      />
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="default-billing"
                          checked={!!addr.isDefault}
                          onChange={() => toggleDefault(addr.id, 'Billing')}
                          className="accent-primary"
                        />
                        Default
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeAddress(addr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Address Line 1</Label>
                      <Input
                        placeholder="Street address"
                        value={addr.line1}
                        onChange={(e) => updateAddress(addr.id, 'line1', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Address Line 2</Label>
                      <Input
                        placeholder="Apt, suite, area (optional)"
                        value={addr.line2 ?? ''}
                        onChange={(e) => updateAddress(addr.id, 'line2', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">City</Label>
                      <Input
                        placeholder="City"
                        value={addr.city}
                        onChange={(e) => updateAddress(addr.id, 'city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">State</Label>
                      <Input
                        placeholder="State"
                        value={addr.state}
                        onChange={(e) => updateAddress(addr.id, 'state', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Pincode</Label>
                      <Input
                        placeholder="Pincode"
                        value={addr.pincode}
                        onChange={(e) => updateAddress(addr.id, 'pincode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <Separator />

          {/* Shipping Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Shipping Addresses</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => addAddress('Shipping')}>
                <Plus className="mr-1 h-4 w-4" /> Add Shipping Address
              </Button>
            </div>
            {addresses.filter((a) => a.type === 'Shipping').length === 0 && (
              <p className="text-sm text-muted-foreground">No shipping addresses added yet.</p>
            )}
            {addresses
              .filter((a) => a.type === 'Shipping')
              .map((addr) => (
                <div key={addr.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Label (e.g. Warehouse)"
                        value={addr.label}
                        onChange={(e) => updateAddress(addr.id, 'label', e.target.value)}
                        className="w-56"
                      />
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="default-shipping"
                          checked={!!addr.isDefault}
                          onChange={() => toggleDefault(addr.id, 'Shipping')}
                          className="accent-primary"
                        />
                        Default
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeAddress(addr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Address Line 1</Label>
                      <Input
                        placeholder="Street address"
                        value={addr.line1}
                        onChange={(e) => updateAddress(addr.id, 'line1', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Address Line 2</Label>
                      <Input
                        placeholder="Apt, suite, area (optional)"
                        value={addr.line2 ?? ''}
                        onChange={(e) => updateAddress(addr.id, 'line2', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">City</Label>
                      <Input
                        placeholder="City"
                        value={addr.city}
                        onChange={(e) => updateAddress(addr.id, 'city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">State</Label>
                      <Input
                        placeholder="State"
                        value={addr.state}
                        onChange={(e) => updateAddress(addr.id, 'state', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-ui text-xs">Pincode</Label>
                      <Input
                        placeholder="Pincode"
                        value={addr.pincode}
                        onChange={(e) => updateAddress(addr.id, 'pincode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </FormPageShell>
  )
}

export { AccountFormPage }

export default AccountFormPage
