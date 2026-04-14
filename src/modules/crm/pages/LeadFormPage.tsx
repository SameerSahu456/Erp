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
import { Checkbox } from '@/components/ui/checkbox'
import { EntityHeader } from '../components/EntityHeader'
import { leads } from '../data/leads'
import { LEAD_STAGES, IMS_CATEGORIES } from '../types'
import type { Lead } from '../types'

const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Trade Show', 'Cold Call'] as const
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

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
  const [owner, setOwner] = useState(existingLead?.owner ?? MOCK_OWNERS[0])
  const [notes, setNotes] = useState(existingLead?.notes ?? '')
  const [description, setDescription] = useState(existingLead?.description ?? '')
  const [categories, setCategories] = useState<string[]>(existingLead?.categories ?? [])

  const backHref = isEdit ? `/crm/leads/${leadId}` : '/crm/leads'

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
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
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Stage</Label>
                <Select value={stage} onValueChange={(val) => setStage(val as Lead['stage'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
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
                <Label className="font-ui">Source</Label>
                <Select value={source} onValueChange={(val) => { if (val) setSource(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Owner</Label>
                <Select value={owner} onValueChange={(val) => { if (val) setOwner(val) }}>
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {IMS_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
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
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !company.trim() || !description.trim()}>
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { LeadFormPage }

export default LeadFormPage
