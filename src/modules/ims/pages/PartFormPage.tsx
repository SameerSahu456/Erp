import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { MediaGallery, type MediaItem } from '@/components/common/MediaGallery'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockParts } from '../data/parts'
import { mockCategories } from '../data/categories'
import { mockChecklistTemplates } from '@/modules/wms/data/checklist-templates'
import type {
  IMSCategory,
  PartAssemblyType,
} from '@/modules/wms/types'

const UNITS_OF_MEASURE = ['Units', 'Pieces', 'Sets']

function flattenCategories(cats: IMSCategory[], depth = 0): { cat: IMSCategory; depth: number }[] {
  const result: { cat: IMSCategory; depth: number }[] = []
  for (const cat of cats) {
    result.push({ cat, depth })
    if (cat.subcategories) {
      result.push(...flattenCategories(cat.subcategories, depth + 1))
    }
  }
  return result
}

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existing = id ? mockParts.find((p) => p.id === id) : undefined
  const isEdit = !!existing

  const isVariantMode =
    !isEdit && searchParams.get('type') === 'variant' && !!searchParams.get('parentId')
  const parentPart = useMemo(() => {
    const parentId = searchParams.get('parentId')
    if (!parentId) return undefined
    return mockParts.find((p) => p.id === parentId)
  }, [searchParams])

  const [assemblyType, setAssemblyType] = useState<PartAssemblyType | ''>(existing?.assemblyType ?? '')

  const [name, setName] = useState(existing?.name ?? '')
  const [sku, setSku] = useState(existing?.sku ?? '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? 'none')
  const [subcategoryId, setSubcategoryId] = useState(existing?.subcategoryId ?? 'none')
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [model, setModel] = useState(existing?.model ?? '')
  const [unitOfMeasure, setUnitOfMeasure] = useState(existing?.unitOfMeasure ?? 'Units')
  const [hsnCode, setHsnCode] = useState(existing?.hsnCode ?? '')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const [description, setDescription] = useState(existing?.description ?? '')
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? [])
  const [aliasInput, setAliasInput] = useState('')
  const [media, setMedia] = useState<MediaItem[]>(() => {
    const items: MediaItem[] = []
    existing?.images?.forEach((src, i) =>
      items.push({ id: `existing-img-${i}`, type: 'image', src, name: src }),
    )
    existing?.videos?.forEach((src, i) =>
      items.push({ id: `existing-vid-${i}`, type: 'video', src, name: src }),
    )
    return items
  })
  const [inwardChecklistId, setInwardChecklistId] = useState(existing?.inwardChecklistId ?? 'none')
  const [outwardChecklistId, setOutwardChecklistId] = useState(existing?.outwardChecklistId ?? 'none')
  const [inspectionChecklistId, setInspectionChecklistId] = useState(existing?.inspectionChecklistId ?? 'none')

  const allCategories = useMemo(() => flattenCategories(mockCategories), [])

  // Get subcategories for selected category
  const subcategories = useMemo(() => {
    if (categoryId === 'none') return []
    function findCat(cats: IMSCategory[], id: string): IMSCategory | undefined {
      for (const cat of cats) {
        if (cat.id === id) return cat
        if (cat.subcategories) {
          const found = findCat(cat.subcategories, id)
          if (found) return found
        }
      }
      return undefined
    }
    const cat = findCat(mockCategories, categoryId)
    return cat?.subcategories ?? []
  }, [categoryId])

  const inwardTemplates = mockChecklistTemplates.filter((t) => t.type === 'INWARD' && t.isActive)
  const outwardTemplates = mockChecklistTemplates.filter((t) => t.type === 'OUTWARD' && t.isActive)
  const inspectionTemplates = mockChecklistTemplates.filter((t) => t.type === 'INSPECTION' && t.isActive)

  const backHref = isEdit ? `/ims/parts/${id}` : '/ims/parts'
  const goBack = useNavigateBack(backHref)

  // Auto-suggest SKU
  function suggestSku() {
    if (brand && model) {
      const b = brand.substring(0, 3).toUpperCase()
      const m = model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
      setSku(`${b}-${m}`)
    }
  }

  function addAlias(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault()
      if (!aliases.includes(aliasInput.trim())) {
        setAliases([...aliases, aliasInput.trim()])
      }
      setAliasInput('')
    }
  }

  function removeAlias(alias: string) {
    setAliases(aliases.filter((a) => a !== alias))
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Part name is required')
      return
    }
    if (!sku.trim()) {
      toast.error('Part No is required')
      return
    }
    toast.success(isEdit ? 'Part updated successfully' : 'Part created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
  }

  const headerTitle = isEdit
    ? `Edit Part: ${existing!.name}`
    : isVariantMode && parentPart
      ? `Add Variant of ${parentPart.name}`
      : 'Add Part'

  return (
    <div className="space-y-6">
      <EntityHeader
        title={headerTitle}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Edit Part Details' : isVariantMode ? 'New Variant' : 'New Part'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {isVariantMode && parentPart && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parent Part
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="parent-name">Parent Product Name</Label>
                  <Input
                    id="parent-name"
                    value={parentPart.name}
                    readOnly
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parent-sku">Parent Part No</Label>
                  <Input
                    id="parent-sku"
                    value={parentPart.sku}
                    readOnly
                    disabled
                    className="bg-muted/50 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Two-column grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="part-name">Name *</Label>
                <Input
                  id="part-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dell Latitude 5540"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-model">Model</Label>
                <Input
                  id="part-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., Latitude 5540"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-sku">Part No *</Label>
                <div className="flex gap-2">
                  <Input
                    id="part-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g., DL-LAT-5540"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={suggestSku}>
                    Suggest
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-category">Category</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v ?? 'none'); setSubcategoryId('none') }}>
                  <SelectTrigger id="part-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allCategories
                      .filter((c) => c.depth === 0)
                      .map((c) => (
                        <SelectItem key={c.cat.id} value={c.cat.id}>
                          {c.cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-subcategory">Subcategory</Label>
                <Select value={subcategoryId} onValueChange={(v) => setSubcategoryId(v ?? 'none')}>
                  <SelectTrigger id="part-subcategory" className="w-full">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subcategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-brand">Brand/OEM</Label>
                <Input
                  id="part-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Dell"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="part-assembly">Assembly</Label>
                <Select
                  value={assemblyType || 'none'}
                  onValueChange={(v) =>
                    setAssemblyType(((v ?? 'none') === 'none' ? '' : v) as PartAssemblyType | '')
                  }
                >
                  <SelectTrigger id="part-assembly" className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Assembled">Assembled</SelectItem>
                    <SelectItem value="Disassembled">Disassembled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-uom">Unit of Measure</Label>
                <Select value={unitOfMeasure} onValueChange={(v) => setUnitOfMeasure(v ?? 'Units')}>
                  <SelectTrigger id="part-uom" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASURE.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-hsn">HSN Code</Label>
                <Input
                  id="part-hsn"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="e.g., 84713010"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="part-active"
                />
                <Label htmlFor="part-active">Active</Label>
              </div>
            </div>
          </div>

          {/* Full width fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="part-desc">Description</Label>
              <Textarea
                id="part-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this part/product..."
                rows={3}
              />
            </div>

            {/* Aliases (tag input) */}
            <div className="space-y-1.5">
              <Label htmlFor="part-aliases">Aliases (press Enter to add)</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                {aliases.map((alias) => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {alias}
                    <button onClick={() => removeAlias(alias)} className="hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <Input
                  id="part-aliases"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={addAlias}
                  placeholder="Type alias and press Enter..."
                  className="min-w-[200px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Media</Label>
              <MediaGallery items={media} onChange={setMedia} />
            </div>
          </div>

          {/* Checklist Assignment section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Checklist Assignment</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Inward Checklist</Label>
                <Select value={inwardChecklistId} onValueChange={(v) => setInwardChecklistId(v ?? 'none')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {inwardTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Outward Checklist</Label>
                <Select value={outwardChecklistId} onValueChange={(v) => setOutwardChecklistId(v ?? 'none')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {outwardTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Inspection Checklist</Label>
                <Select value={inspectionChecklistId} onValueChange={(v) => setInspectionChecklistId(v ?? 'none')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {inspectionTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
