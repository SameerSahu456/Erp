import { useState, useMemo } from 'react'
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
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockOEMs } from '../data/oems'
import { mockCategories } from '../data/categories'

export default function OEMFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existing = id ? mockOEMs.find((o) => o.id === id) : undefined
  const isEdit = !!existing

  const [name, setName] = useState(existing?.name ?? '')
  const [code, setCode] = useState(existing?.code ?? '')
  const [status, setStatus] = useState<'active' | 'inactive'>(existing?.status ?? 'active')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(existing?.categories ?? [])
  const [notes, setNotes] = useState(existing?.notes ?? '')

  // L1 categories only (top-level)
  const l1Categories = useMemo(
    () => mockCategories.filter((c) => !('parentId' in c)),
    []
  )

  // Auto-generate code from name (uppercase first 3 chars)
  function handleNameChange(value: string) {
    setName(value)
    if (!isEdit && value.trim().length > 0) {
      setCode(value.trim().substring(0, 3).toUpperCase())
    }
  }

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    )
  }

  const backHref = isEdit ? `/ims/oems/${id}` : '/ims/oems'

  function handleSave() {
    if (!name.trim()) {
      toast.error('OEM name is required')
      return
    }
    toast.success(isEdit ? 'OEM updated successfully' : 'OEM created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit OEM: ${existing!.name}` : 'Add OEM'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit OEM Details' : 'New OEM'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="oem-name">Name *</Label>
                <Input
                  id="oem-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Dell"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oem-code">Code</Label>
                <Input
                  id="oem-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., DEL"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from name. You can edit it manually.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oem-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus((v ?? 'active') as 'active' | 'inactive')}>
                  <SelectTrigger id="oem-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Categories</Label>
                <div className="rounded-md border p-3 space-y-2 max-h-60 overflow-y-auto">
                  {l1Categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-input"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oem-notes">Notes</Label>
                <Textarea
                  id="oem-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this OEM..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
