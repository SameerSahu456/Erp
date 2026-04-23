import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { mockChecklistTemplates } from '../data/checklist-templates'
import { mockCategories } from '@/modules/ims/data/categories'
import type { ChecklistType, ChecklistTemplateItem, IMSCategory } from '../types'

const CHECKLIST_TYPES: { value: ChecklistType; label: string }[] = [
  { value: 'INWARD', label: 'Inward' },
  { value: 'OUTWARD', label: 'Outward' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'QC', label: 'QC' },
]

const ASSIGN_LEVELS = [
  { value: 'category', label: 'Category' },
  { value: 'subcategory', label: 'Subcategory' },
  { value: 'part', label: 'Part' },
] as const

function flattenCategories(cats: IMSCategory[], level: 'category' | 'subcategory' | 'part'): { id: string; name: string }[] {
  if (level === 'category') {
    return cats.map((c) => ({ id: c.id, name: c.name }))
  }
  const result: { id: string; name: string }[] = []
  for (const cat of cats) {
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        result.push({ id: sub.id, name: `${cat.name} > ${sub.name}` })
        if (level === 'part' && sub.subcategories) {
          for (const part of sub.subcategories) {
            result.push({ id: part.id, name: `${cat.name} > ${sub.name} > ${part.name}` })
          }
        }
      }
    }
  }
  return result
}

function ChecklistTemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/checklists')
  const existing = id ? mockChecklistTemplates.find((t) => t.id === id) : null
  const isEdit = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<ChecklistType>(existing?.type ?? 'INWARD')
  const [assignLevel, setAssignLevel] = useState<'category' | 'subcategory' | 'part'>(
    existing?.assignedTo.level ?? 'category',
  )
  const [assignId, setAssignId] = useState(existing?.assignedTo.id ?? '')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const [items, setItems] = useState<ChecklistTemplateItem[]>(
    existing?.items ?? [],
  )

  const assignOptions = useMemo(
    () => flattenCategories(mockCategories, assignLevel),
    [assignLevel],
  )

  const handleAddItem = () => {
    const newItem: ChecklistTemplateItem = {
      id: `item-${Date.now()}`,
      label: '',
      group: '',
      description: '',
      required: true,
    }
    setItems((prev) => [...prev, newItem])
  }

  const handleUpdateItem = (
    index: number,
    field: keyof ChecklistTemplateItem,
    value: string | boolean,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const a = next[index]
      const b = next[targetIndex]
      if (a && b) {
        next[index] = b
        next[targetIndex] = a
      }
      return next
    })
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Template name is required.')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one checklist item.')
      return
    }
    toast.success(isEdit ? 'Template updated successfully' : 'Template created successfully')
    navigate('/wms/checklists')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="cpt-page-title">
            {isEdit ? `Edit: ${existing?.name}` : 'Create Checklist Template'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? 'Update template details and items' : 'Define a new checklist template'}
          </p>
        </div>
      </div>

      {/* Template Details */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-name" className="font-ui">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tmpl-name"
                placeholder="e.g., Laptop Inward Checklist"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-ui">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={type} onValueChange={(val) => { if (val) setType(val as ChecklistType) }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHECKLIST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-ui">Assign To Level</Label>
              <Select
                value={assignLevel}
                onValueChange={(val) => {
                  if (val) {
                    setAssignLevel(val as 'category' | 'subcategory' | 'part')
                    setAssignId('')
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGN_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-ui">Assign To</Label>
              <Select value={assignId} onValueChange={(val) => { if (val) setAssignId(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {assignOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="tmpl-active" className="font-ui">Active</Label>
              <Switch
                id="tmpl-active"
                checked={isActive}
                onCheckedChange={(val) => setIsActive(Boolean(val))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Checklist Items ({items.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={handleAddItem}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No items yet. Click "Add Item" to start building the checklist.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="hidden md:grid md:grid-cols-[40px_1fr_150px_1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground px-2">
                <span>#</span>
                <span>Label</span>
                <span>Group</span>
                <span>Description</span>
                <span className="text-center">Required</span>
                <span className="text-center">Actions</span>
              </div>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[40px_1fr_150px_1fr_80px_80px] gap-2 items-center rounded-md border p-2"
                >
                  <span className="text-sm text-muted-foreground">{index + 1}</span>
                  <Input
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Group"
                    value={item.group}
                    onChange={(e) => handleUpdateItem(index, 'group', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={item.description ?? ''}
                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex justify-center">
                    <Checkbox
                      checked={item.required}
                      onCheckedChange={(val) => handleUpdateItem(index, 'required', Boolean(val))}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleMoveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleMoveItem(index, 'down')}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={goBack}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEdit ? 'Update Template' : 'Create Template'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ChecklistTemplateFormPage
