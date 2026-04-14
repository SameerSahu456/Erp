import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityHeader } from '../components/EntityHeader'
import { accounts } from '../data/accounts'
import type { Account } from '../types'

const INDUSTRIES = ['IT Services', 'Manufacturing', 'Banking', 'Telecom', 'Retail', 'Healthcare'] as const
const ACCOUNT_TYPES = ['Enterprise', 'SMB', 'Startup', 'Government'] as const
const ACCOUNT_STATUSES = ['Active', 'Inactive', 'Prospect'] as const
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function AccountFormPage() {
  const { accountId } = useParams<{ accountId: string }>()
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
  const [address, setAddress] = useState('')

  const backHref = isEdit ? `/crm/accounts/${accountId}` : '/crm/accounts'

  function handleSave() {
    if (!name.trim()) return

    toast.success(isEdit ? 'Account updated successfully' : 'Account created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Account: ${existingAccount.name}` : 'Create Account'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Account Details' : 'New Account Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
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
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
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
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
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

            {/* Right column */}
            <div className="space-y-4">
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
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Account Manager</Label>
                <Select value={owner} onValueChange={(val) => { if (val) setOwner(val as string) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_OWNERS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Full width address */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="account-address" className="font-ui">Address</Label>
            <Textarea
              id="account-address"
              placeholder="Full address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Save Changes' : 'Create Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { AccountFormPage }

export default AccountFormPage
