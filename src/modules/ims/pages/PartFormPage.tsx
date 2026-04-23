import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
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
import { mockParts } from '../data/parts'
import { mockCategories } from '../data/categories'
import { mockChecklistTemplates } from '@/modules/wms/data/checklist-templates'
import type {
  IMSCategory,
  PartProductType,
  PartAssemblyType,
  VariantCondition,
} from '@/modules/wms/types'

const MOCK_PRODUCT_MANAGERS = [
  { name: 'Rahul Mehta', email: 'rahul@comprinttech.com' },
  { name: 'Vikram Singh', email: 'vikram@comprinttech.com' },
  { name: 'Priya Sharma', email: 'priya@comprinttech.com' },
  { name: 'Amit Patel', email: 'amit@comprinttech.com' },
]

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

  // Read type & parent hints from the query string when creating a new part.
  const queryType = searchParams.get('type') === 'variant' ? 'variant' : null
  const queryParentId = searchParams.get('parentId') ?? null
  const queryParent = queryParentId
    ? mockParts.find((p) => p.id === queryParentId && (p.productType ?? 'parent') === 'parent')
    : undefined

  const initialProductType: PartProductType =
    existing?.productType ?? (queryType === 'variant' ? 'variant' : 'parent')
  const initialParentPartId =
    existing?.parentPartId ?? queryParent?.id ?? 'none'

  const [productType, setProductType] = useState<PartProductType>(initialProductType)
  const [parentPartId, setParentPartId] = useState<string>(initialParentPartId)
  const [condition, setCondition] = useState<VariantCondition | ''>(
    existing?.condition ?? (initialProductType === 'variant' ? 'New' : '')
  )
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice?.toString() ?? '')
  const [assemblyType, setAssemblyType] = useState<PartAssemblyType | ''>(existing?.assemblyType ?? '')

  const [name, setName] = useState(
    existing?.name ?? (queryParent ? `${queryParent.name} · New` : '')
  )
  const [sku, setSku] = useState(
    existing?.sku ?? (queryParent ? `${queryParent.sku}-NEW` : '')
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? queryParent?.categoryId ?? 'none')
  const [subcategoryId, setSubcategoryId] = useState(existing?.subcategoryId ?? queryParent?.subcategoryId ?? 'none')
  const [brand, setBrand] = useState(existing?.brand ?? queryParent?.brand ?? '')
  const [model, setModel] = useState(existing?.model ?? queryParent?.model ?? '')
  const [productManager, setProductManager] = useState(existing?.productManager ?? queryParent?.productManager ?? 'none')
  const [unitOfMeasure, setUnitOfMeasure] = useState(existing?.unitOfMeasure ?? queryParent?.unitOfMeasure ?? 'Units')
  const [hsnCode, setHsnCode] = useState(existing?.hsnCode ?? queryParent?.hsnCode ?? '')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const [description, setDescription] = useState(existing?.description ?? '')
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? [])
  const [aliasInput, setAliasInput] = useState('')
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>(
    existing?.specifications
      ? Object.entries(existing.specifications).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
  )
  const [inwardChecklistId, setInwardChecklistId] = useState(existing?.inwardChecklistId ?? 'none')
  const [outwardChecklistId, setOutwardChecklistId] = useState(existing?.outwardChecklistId ?? 'none')
  const [inspectionChecklistId, setInspectionChecklistId] = useState(existing?.inspectionChecklistId ?? 'none')

  // Parents available for variant selection: any parent-type part.
  const availableParents = useMemo(
    () =>
      mockParts.filter(
        (p) => (p.productType ?? 'parent') === 'parent' && p.isActive && p.id !== existing?.id
      ),
    [existing?.id]
  )

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

  function addSpecRow() {
    setSpecifications([...specifications, { key: '', value: '' }])
  }

  function removeSpecRow(index: number) {
    setSpecifications(specifications.filter((_, i) => i !== index))
  }

  function updateSpec(index: number, field: 'key' | 'value', val: string) {
    setSpecifications(specifications.map((s, i) => (i === index ? { ...s, [field]: val } : s)))
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Part name is required')
      return
    }
    if (!sku.trim()) {
      toast.error('SKU is required')
      return
    }
    if (productType === 'variant') {
      if (!parentPartId || parentPartId === 'none') {
        toast.error('A variant must have a parent product')
        return
      }
      if (!condition) {
        toast.error('Select a condition for the variant')
        return
      }
    }
    toast.success(isEdit ? 'Part updated successfully' : 'Part created successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  const headerTitle = isEdit
    ? `Edit ${productType === 'variant' ? 'Variant' : 'Part'}: ${existing!.name}`
    : productType === 'variant'
      ? 'Add Variant'
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
            {isEdit
              ? productType === 'variant'
                ? 'Edit Variant Details'
                : 'Edit Part Details'
              : productType === 'variant'
                ? 'New Variant'
                : 'New Part'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Product type + parent link (top of form) */}
          <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="part-type">Product Type</Label>
              <Select
                value={productType}
                onValueChange={(v) => {
                  const next = (v ?? 'parent') as PartProductType
                  setProductType(next)
                  if (next === 'parent') {
                    setParentPartId('none')
                    setCondition('')
                  } else if (!condition) {
                    setCondition('New')
                  }
                }}
              >
                <SelectTrigger id="part-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent Product</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {productType === 'variant' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="part-parent">
                    Parent Product <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={parentPartId}
                    onValueChange={(v) => setParentPartId(v ?? 'none')}
                  >
                    <SelectTrigger id="part-parent" className="w-full">
                      <SelectValue placeholder="Select parent product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableParents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentPartId !== 'none' && (
                    <Link
                      to={`/ims/parts/${parentPartId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View parent →
                    </Link>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="part-condition">
                    Condition <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={condition || 'New'}
                    onValueChange={(v) => setCondition((v ?? 'New') as VariantCondition)}
                  >
                    <SelectTrigger id="part-condition" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Refurbished">Refurbished</SelectItem>
                      <SelectItem value="New Pull">New Pull</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

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
                <Label htmlFor="part-sku">SKU *</Label>
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
                <Label htmlFor="part-brand">Brand</Label>
                <Input
                  id="part-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Dell"
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
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="part-pm">Product Manager</Label>
                <Select value={productManager} onValueChange={(v) => setProductManager(v ?? 'none')}>
                  <SelectTrigger id="part-pm" className="w-full">
                    <SelectValue placeholder="Select PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {MOCK_PRODUCT_MANAGERS.map((pm) => (
                      <SelectItem key={pm.name} value={pm.name}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-price">Price (INR)</Label>
                <Input
                  id="part-price"
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  min={0}
                  placeholder="e.g., 89000"
                />
              </div>

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

            {/* Specifications (key-value editor) */}
            <div className="space-y-1.5">
              <Label>Specifications</Label>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Key</th>
                      <th className="px-3 py-2 text-left font-medium">Value</th>
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {specifications.map((spec, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <Input
                            value={spec.key}
                            onChange={(e) => updateSpec(index, 'key', e.target.value)}
                            placeholder="e.g., RAM"
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={spec.value}
                            onChange={(e) => updateSpec(index, 'value', e.target.value)}
                            placeholder="e.g., 16GB DDR5"
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => removeSpecRow(index)}
                            className="rounded p-1 hover:bg-destructive/10"
                          >
                            <X className="size-3.5 text-destructive" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t p-2">
                  <Button type="button" variant="ghost" size="sm" onClick={addSpecRow}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add Row
                  </Button>
                </div>
              </div>
            </div>

            {/* Media Upload placeholder — images & videos */}
            <div className="space-y-1.5">
              <Label>Media</Label>
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Drag and drop images or videos here, or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, MP4, WebM (placeholder)
                </p>
              </div>
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
