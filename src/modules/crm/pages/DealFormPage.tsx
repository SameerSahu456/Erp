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
import { deals } from '../data/deals'
import { accounts } from '../data/accounts'
import { leads } from '../data/leads'
import { DEAL_STAGES, IMS_CATEGORIES } from '../types'
import type { Deal } from '../types'

const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function DealFormPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingDeal = dealId ? deals.find((d) => d.id === dealId) : undefined
  const isEdit = !!existingDeal

  const [name, setName] = useState(existingDeal?.name ?? '')
  const [accountId, setAccountId] = useState(existingDeal?.accountId ?? '')
  const [stage, setStage] = useState<Deal['stage']>(existingDeal?.stage ?? 'New')
  const [closeDate, setCloseDate] = useState(existingDeal?.closeDate ?? '')
  const [value, setValue] = useState(existingDeal?.value?.toString() ?? '')
  const [probability, setProbability] = useState(existingDeal?.probability?.toString() ?? '')
  const [owner, setOwner] = useState(existingDeal?.owner ?? MOCK_OWNERS[0])
  const [description, setDescription] = useState(existingDeal?.description ?? '')
  const [categories, setCategories] = useState<string[]>(existingDeal?.categories ?? [])
  const [leadId, setLeadId] = useState(existingDeal?.leadId ?? '')

  const backHref = isEdit ? `/crm/deals/${dealId}` : '/crm/deals'

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSave() {
    if (!name.trim()) return

    toast.success('Deal saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Deal: ${existingDeal.name}` : 'Create Deal'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Deal Details' : 'New Deal Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-name" className="font-ui">
                  Deal Name <span className="text-destructive">*</span>
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
                <Label className="font-ui">Account</Label>
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
                <Label className="font-ui">Stage</Label>
                <Select value={stage} onValueChange={(val) => setStage(val as Deal['stage'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
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
            </div>

            {/* Right column */}
            <div className="space-y-4">
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
                <Label htmlFor="deal-probability" className="font-ui">Probability</Label>
                <div className="relative">
                  <Input
                    id="deal-probability"
                    type="number"
                    placeholder="0"
                    min={0}
                    max={100}
                    className="pr-7"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
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

              <div className="space-y-1.5">
                <Label className="font-ui">Linked Lead</Label>
                <Select value={leadId} onValueChange={(val) => setLeadId(val ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select lead (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.company})
                      </SelectItem>
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
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Save Changes' : 'Create Deal'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { DealFormPage }

export default DealFormPage
