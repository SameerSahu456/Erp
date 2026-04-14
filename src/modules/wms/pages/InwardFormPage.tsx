import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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

const OWNERSHIP_TYPES = [
  { value: 'REFURB_PURCHASE', label: 'Refurb Purchase' },
  { value: 'RENTAL_RETURN', label: 'Rental Return' },
  { value: 'ADVANCE_RETURN', label: 'Advance Return' },
] as const

const CATEGORIES = ['Laptop', 'Desktop'] as const
const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple'] as const

function generateBatchNumber() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BATCH-2026-${num}`
}

function InwardFormPage() {
  const navigate = useNavigate()

  const [batchNumber] = useState(generateBatchNumber)
  const [ownershipType, setOwnershipType] = useState<string>(OWNERSHIP_TYPES[0].value)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [brand, setBrand] = useState<string>(BRANDS[0])
  const [deviceCount, setDeviceCount] = useState('')
  const [notes, setNotes] = useState('')

  function handleCreate() {
    if (!deviceCount || Number(deviceCount) <= 0) return

    toast.success('Batch created successfully', {
      description: `${batchNumber} with ${deviceCount} devices`,
    })
    // Navigate to the batch devices page (using a mock ID)
    navigate(`/wms/inward/batch-new/devices`)
  }

  function handleCancel() {
    navigate('/wms/inward')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link to="/wms/inward" />}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Create Batch
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new inward batch / GRN
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="batch-number" className="font-ui">
                  Batch Number
                </Label>
                <Input
                  id="batch-number"
                  value={batchNumber}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Ownership Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={ownershipType}
                  onValueChange={(val) => {
                    if (val) setOwnershipType(val as string)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => {
                    if (val) setCategory(val as string)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={brand}
                  onValueChange={(val) => {
                    if (val) setBrand(val as string)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="device-count" className="font-ui">
                  Device Count <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="device-count"
                  type="number"
                  placeholder="0"
                  min={1}
                  value={deviceCount}
                  onChange={(e) => setDeviceCount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Full width notes */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="batch-notes" className="font-ui">
              Notes
            </Label>
            <Textarea
              id="batch-notes"
              placeholder="Optional notes about this batch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!deviceCount || Number(deviceCount) <= 0}
          >
            Create Batch
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { InwardFormPage }
export default InwardFormPage
