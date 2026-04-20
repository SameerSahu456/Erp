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
import { MultiSelect } from '@/components/ui/multi-select'
import { EntityHeader } from '../components/EntityHeader'
import { BOMQuoteBuilder } from '../components/BOMQuoteBuilder'
import { leads } from '../data/leads'
import { LEAD_STAGES, IMS_CATEGORIES, ORDER_TYPES, MOCK_USERS } from '../types'
import type { Lead, OrderType, CustomerType } from '../types'

const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Trade Show', 'Cold Call'] as const
const COMPANY_SIZES = ['Startup', 'SMB', 'Mid-Market', 'Large Enterprise'] as const

function LeadFormPage() {
  const { id: leadId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingLead = leadId ? leads.find((l) => l.id === leadId) : undefined
  const isEdit = !!existingLead

  const [name, setName] = useState(existingLead?.name ?? '')
  const [email, setEmail] = useState(existingLead?.email ?? '')
  const [phone, setPhone] = useState(existingLead?.phone ?? '')
  const [company, setCompany] = useState(existingLead?.company ?? '')
  const [stage, setStage] = useState<Lead['stage']>(existingLead?.stage ?? 'New')
  const [value, setValue] = useState(existingLead?.value?.toString() ?? '')
  const [source, setSource] = useState(existingLead?.source ?? 'Website')
  const [notes, setNotes] = useState(existingLead?.notes ?? '')
  const [description, setDescription] = useState(existingLead?.description ?? '')
  const [categories, setCategories] = useState<string[]>(existingLead?.categories ?? [])

  // New fields
  const [location, setLocation] = useState(existingLead?.location ?? '')
  const [companySize, setCompanySize] = useState(existingLead?.companySize ?? '')
  const [website, setWebsite] = useState(existingLead?.website ?? '')
  const [employees, setEmployees] = useState(existingLead?.employees?.toString() ?? '')
  const [assignedTo, setAssignedTo] = useState(existingLead?.assignedTo ?? MOCK_USERS[0])
  const [presalesManager, setPresalesManager] = useState(existingLead?.presalesManager ?? '')
  const [priority, setPriority] = useState(existingLead?.priority ?? 'Medium')
  const [customerType, setCustomerType] = useState<CustomerType>(existingLead?.customerType ?? 'End Customer')
  const [orderType, setOrderType] = useState<OrderType | ''>(existingLead?.orderType ?? '')
  const [bde, setBde] = useState(existingLead?.bde ?? '')
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(true)

  const backHref = isEdit ? `/crm/leads/${leadId}` : '/crm/leads'

  function handleSave() {
    if (!name.trim() || !company.trim() || !description.trim()) return

    toast.success('Lead saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Lead: ${existingLead.name}` : 'Create Lead'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Lead Details' : 'New Lead Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name" className="font-ui">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lead-name"
                  placeholder="Contact name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-company" className="font-ui">
                  Company <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lead-company"
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className="font-ui">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-phone" className="font-ui">Phone</Label>
                <Input
                  id="lead-phone"
                  placeholder="+91 98XXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-website" className="font-ui">Website</Label>
                <Input
                  id="lead-website"
                  placeholder="https://www.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-location" className="font-ui">Location</Label>
                <Input
                  id="lead-location"
                  placeholder="City, State"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
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
                <Label htmlFor="lead-employees" className="font-ui">Employees</Label>
                <Input
                  id="lead-employees"
                  type="number"
                  placeholder="Number of employees"
                  value={employees}
                  onChange={(e) => setEmployees(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Stage</Label>
                <Select value={stage} onValueChange={(val) => setStage(val as Lead['stage'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-value" className="font-ui">Value</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    &#8377;
                  </span>
                  <Input
                    id="lead-value"
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
                <Select value={priority} onValueChange={(val) => setPriority(val as Lead['priority'])}>
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
                <Label className="font-ui">Source</Label>
                <Select value={source} onValueChange={(val) => { if (val) setSource(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
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

              <div className="space-y-1.5">
                <Label className="font-ui">BDE</Label>
                <Select value={bde} onValueChange={setBde}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select BDE" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
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
          </div>

          {/* Full width description */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="lead-description" className="font-ui">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="lead-description"
              placeholder="Describe what the customer needs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
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

          {/* Full width notes */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="lead-notes" className="font-ui">Notes</Label>
            <Textarea
              id="lead-notes"
              placeholder="Add any notes about this lead..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={() => setShowQuoteBuilder(!showQuoteBuilder)}>
            {showQuoteBuilder ? 'Hide Quote Builder' : 'Open Quote Builder'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || !company.trim() || !description.trim()}>
              {isEdit ? 'Save Changes' : 'Create Lead'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Quote Builder */}
      {showQuoteBuilder && (
        <BOMQuoteBuilder
          leadId={leadId}
          leadName={name || undefined}
          accountName={company || undefined}
          initialEmpty={!isEdit}
        />
      )}
    </div>
  )
}

export { LeadFormPage }

export default LeadFormPage
