import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockParts } from '../data/parts'
import { mockWarehouses } from '@/modules/wms/data/warehouses'
import type { VariantCondition } from '@/modules/wms/types'

const CONDITIONS: VariantCondition[] = ['New', 'Refurbished', 'New Pull']

interface VariantRow {
  id: string
  condition: VariantCondition
  quantity: string
  unitPrice: string
}

function newVariantRow(condition: VariantCondition = 'New'): VariantRow {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    condition,
    quantity: '0',
    unitPrice: '0',
  }
}

export default function StockItemFormPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/ims/stock-items')

  const [partId, setPartId] = useState<string>('none')
  const [warehouseId, setWarehouseId] = useState<string>('none')
  const [location, setLocation] = useState<string>('')
  const [reorderLevel, setReorderLevel] = useState<string>('5')
  const [aliasesInput, setAliasesInput] = useState<string>('')
  const [variants, setVariants] = useState<VariantRow[]>([newVariantRow('New')])

  const eligibleParts = useMemo(
    () => mockParts.filter((p) => p.isActive && (p.productType ?? 'parent') === 'parent'),
    [],
  )

  const selectedPart = partId !== 'none' ? mockParts.find((p) => p.id === partId) : undefined
  const selectedWarehouse = warehouseId !== 'none'
    ? mockWarehouses.find((w) => w.id === warehouseId)
    : undefined

  function updateVariant<K extends keyof VariantRow>(id: string, field: K, value: VariantRow[K]) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  function addVariant() {
    const used = new Set(variants.map((v) => v.condition))
    const next = CONDITIONS.find((c) => !used.has(c)) ?? 'New'
    setVariants((prev) => [...prev, newVariantRow(next)])
  }

  function removeVariant(id: string) {
    if (variants.length <= 1) return
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }

  const totalQty = variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0)

  function handleSave() {
    if (partId === 'none' || !selectedPart) {
      toast.error('Select a part')
      return
    }
    if (warehouseId === 'none' || !selectedWarehouse) {
      toast.error('Select a warehouse')
      return
    }
    const conditions = new Set<string>()
    for (const v of variants) {
      if (conditions.has(v.condition)) {
        toast.error(`Duplicate condition "${v.condition}" — combine rows`)
        return
      }
      conditions.add(v.condition)
      if ((parseInt(v.quantity) || 0) < 0) {
        toast.error('Quantity cannot be negative')
        return
      }
      if ((parseFloat(v.unitPrice) || 0) < 0) {
        toast.error('Unit price cannot be negative')
        return
      }
    }
    toast.success(`Stock item created for ${selectedPart.name} at ${selectedWarehouse.code}`)
    navigate('/ims/stock-items')
  }

  function handleCancel() {
    goBack()
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title="Add Stock Item"
        subtitle="Create an inventory record for an existing part"
        backHref="/ims/stock-items"
        actions={
          <>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Stock Item</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5 text-muted-foreground" />
                Part
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="si-part">Select part</Label>
                <Select
                  value={partId}
                  onValueChange={(v: string | null) => setPartId(v ?? 'none')}
                >
                  <SelectTrigger id="si-part">
                    <SelectValue placeholder="Pick a part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select —</SelectItem>
                    {eligibleParts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-1 text-xs text-muted-foreground">· {p.sku}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPart ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedPart.sku} · {selectedPart.categoryName} · {selectedPart.brand}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="si-aliases">Aliases</Label>
                <Input
                  id="si-aliases"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  placeholder="comma separated (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Alternate names used internally or by vendors
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Condition</th>
                      <th className="px-3 py-2 text-right font-medium">Quantity</th>
                      <th className="px-3 py-2 text-right font-medium">Unit Price (₹)</th>
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-3 py-2">
                          <Select
                            value={v.condition}
                            onValueChange={(val: string | null) =>
                              updateVariant(v.id, 'condition', (val ?? 'New') as VariantCondition)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITIONS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={v.quantity}
                            onChange={(e) => updateVariant(v.id, 'quantity', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={v.unitPrice}
                            onChange={(e) => updateVariant(v.id, 'unitPrice', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeVariant(v.id)}
                            disabled={variants.length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={variants.length >= CONDITIONS.length}
              >
                <Plus className="mr-1.5 size-4" />
                Add Condition
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="si-warehouse">Warehouse</Label>
                <Select
                  value={warehouseId}
                  onValueChange={(v: string | null) => setWarehouseId(v ?? 'none')}
                >
                  <SelectTrigger id="si-warehouse">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select —</SelectItem>
                    {mockWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="font-medium">{w.name}</span>
                        <span className="ml-1 text-xs text-muted-foreground">· {w.code}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="si-location">Location / Bin</Label>
                <Input
                  id="si-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={selectedWarehouse ? `${selectedWarehouse.code}-R1-B1` : 'Row-Bin code'}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="si-reorder">Reorder level</Label>
                <Input
                  id="si-reorder"
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Trigger a replenishment when total stock drops below this
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Part</span>
                <span className="font-medium">{selectedPart?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-medium">{selectedWarehouse?.code ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Variants</span>
                <span className="font-medium">{variants.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total qty</span>
                <span className="font-medium tabular-nums">{totalQty}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
