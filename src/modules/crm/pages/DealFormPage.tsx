import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FormPageShell } from '@/components/page'
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'
import { DEAL_STAGES, IMS_CATEGORIES, ORDER_TYPES, MOCK_USERS } from '../types'
import type { Deal, OrderType, CustomerType } from '../types'

const COMPANY_SIZES = ['Startup', 'SMB', 'Mid-Market', 'Large Enterprise'] as const

function DealFormPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingDeal = dealId ? deals.find((d) => d.id === dealId) : undefined
  const isEdit = !!existingDeal

  // Account name first, then Name (renamed from Deal Name)
  const [accountId, setAccountId] = useState(existingDeal?.accountId ?? '')
  const [name, setName] = useState(existingDeal?.name ?? '')
  const [stage, setStage] = useState<Deal['stage']>(existingDeal?.stage ?? 'New')
  const [closeDate, setCloseDate] = useState(existingDeal?.closeDate ?? '')
  const [value, setValue] = useState(existingDeal?.value?.toString() ?? '')
  const [description, setDescription] = useState(existingDeal?.description ?? '')
  const [categories, setCategories] = useState<string[]>(existingDeal?.categories ?? [])

  // New fields
  const [location, setLocation] = useState(existingDeal?.location ?? '')
  const [companySize, setCompanySize] = useState(existingDeal?.companySize ?? '')
  const [website, setWebsite] = useState(existingDeal?.website ?? '')
  const [employees, setEmployees] = useState(existingDeal?.employees?.toString() ?? '')
  const [owner, setOwner] = useState(existingDeal?.owner ?? MOCK_USERS[0])
  const [presalesManager, setPresalesManager] = useState(existingDeal?.presalesManager ?? '')
  const [priority, setPriority] = useState(existingDeal?.priority ?? 'Medium')
  const [customerType, setCustomerType] = useState<CustomerType>(existingDeal?.customerType ?? 'End Customer')
  const [orderType, setOrderType] = useState<OrderType | ''>(existingDeal?.orderType ?? '')

  const backHref = isEdit ? `/crm/deals/${dealId}` : '/crm/deals'
  const goBack = useNavigateBack(backHref)

  function handleSave() {
    if (!name.trim()) return

    toast.success('Deal saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
  }

  const canSave = Boolean(name.trim())

  return (
    <FormPageShell
      title={isEdit ? `Edit Deal: ${existingDeal.name}` : 'Create Deal'}
      subtitle={isEdit ? 'Update deal details and assignments.' : 'Open a new deal in the pipeline.'}
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Deals', href: '/crm/deals' },
              { label: existingDeal.name, href: `/crm/deals/${dealId}` },
              { label: 'Edit' },
            ]
          : [
              { label: 'CRM' },
              { label: 'Deals', href: '/crm/deals' },
              { label: 'New Deal' },
            ]
      }
      backHref={backHref}
      onSave={handleSave}
      onCancel={handleCancel}
      canSave={canSave}
      saveLabel={isEdit ? 'Save Changes' : 'Create Deal'}
      footerLeft={!canSave ? <span className="text-destructive/80">Deal name is required.</span> : undefined}
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Deal Details' : 'New Deal Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Column 1 — Account Name first, then Name */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">
                  Account Name <span className="text-destructive">*</span>
                </Label>
                <Select value={accountId} onValueChange={(val) => { if (val) setAccountId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-name" className="font-ui">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deal-name"
                  placeholder="Deal name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-location" className="font-ui">Location</Label>
                <Input
                  id="deal-location"
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
                <Label htmlFor="deal-website" className="font-ui">Website</Label>
                <Input
                  id="deal-website"
                  placeholder="https://www.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-employees" className="font-ui">Employees</Label>
                <Input
                  id="deal-employees"
                  type="number"
                  placeholder="Number of employees"
                  value={employees}
                  onChange={(e) => setEmployees(e.target.value)}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Stage</Label>
                <Select value={stage} onValueChange={(val) => setStage(val as Deal['stage'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-close-date" className="font-ui">Close Date</Label>
                <Input
                  id="deal-close-date"
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-value" className="font-ui">Value</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    &#8377;
                  </span>
                  <Input
                    id="deal-value"
                    type="number"
                    placeholder="0"
                    className="pl-7"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val as Deal['priority'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Type</Label>
                <Select value={customerType} onValueChange={(val) => setCustomerType(val as CustomerType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="End Customer">End Customer</SelectItem>
                    <SelectItem value="Channel Partner">Channel Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Order Type</Label>
                <Select value={orderType} onValueChange={(val) => setOrderType(val as OrderType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Owner</Label>
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Presales Manager</Label>
                <Select value={presalesManager} onValueChange={setPresalesManager}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select presales manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Full width description */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="deal-description" className="font-ui">Description</Label>
            <Textarea
              id="deal-description"
              placeholder="Add a description for this deal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Categories */}
          <div className="mt-6 space-y-1.5">
            <Label className="font-ui">Categories</Label>
            <MultiSelect
              options={IMS_CATEGORIES}
              value={categories}
              onValueChange={setCategories}
              placeholder="Select categories..."
            />
          </div>
        </CardContent>
      </Card>
    </FormPageShell>
  )
}

export { DealFormPage }

export default DealFormPage
