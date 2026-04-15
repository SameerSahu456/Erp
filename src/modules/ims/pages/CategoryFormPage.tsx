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
import { Switch } from '@/components/ui/switch'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockCategories } from '../data/categories'
import type { IMSCategory } from '@/modules/wms/types'

const MOCK_PRODUCT_MANAGERS = ['Rahul Mehta', 'Vikram Singh', 'Priya Sharma', 'Amit Patel', 'Sneha Desai']

function findCategory(cats: IMSCategory[], id: string): IMSCategory | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat
    if (cat.subcategories) {
      const found = findCategory(cat.subcategories, id)
      if (found) return found
    }
  }
  return undefined
}

function getTopLevelCategories(): IMSCategory[] {
  return mockCategories
}

export default function CategoryFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existing = id ? findCategory(mockCategories, id) : undefined
  const isEdit = !!existing

  const [name, setName] = useState(existing?.name ?? '')
  const [parentId, setParentId] = useState(existing?.parentId ?? 'none')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [productManager, setProductManager] = useState(existing?.productManager ?? 'none')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)

  const backHref = '/ims/categories'
  const topLevelCategories = getTopLevelCategories()

  function handleSave() {
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }
    toast.success(isEdit ? 'Category updated successfully' : 'Category created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Category: ${existing!.name}` : 'Create Category'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Category Details' : 'New Category'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5 max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Business Laptops"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Parent Category</Label>
              <Select value={parentId} onValueChange={(v) => setParentId(v ?? 'none')}>
                <SelectTrigger id="cat-parent" className="w-full">
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-level)</SelectItem>
                  {topLevelCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this category..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-pm">Product Manager</Label>
              <Select value={productManager} onValueChange={(v) => setProductManager(v ?? 'none')}>
                <SelectTrigger id="cat-pm" className="w-full">
                  <SelectValue placeholder="Select PM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {MOCK_PRODUCT_MANAGERS.map((pm) => (
                    <SelectItem key={pm} value={pm}>
                      {pm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                id="cat-active"
              />
              <Label htmlFor="cat-active">Active</Label>
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
