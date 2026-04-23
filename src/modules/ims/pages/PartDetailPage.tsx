import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Pencil,
  ImageOff,
  Mail,
  Plus,
  X,
  Search,
  CheckCircle2,
  ChevronDown,
  Video,
  ShoppingCart,
  ArrowRightLeft,
  Package,
  AlertTriangle,
  Wrench,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { mockParts } from '../data/parts'
import { mockStockItems } from '../data/stock-items'
import { mockChecklistTemplates } from '@/modules/wms/data/checklist-templates'
import { mockRelatedParts } from '@/modules/wms/data/related-parts'
import { mockBOMs } from '@/modules/wms/data/boms'
import { mockWarehouses } from '@/modules/wms/data/warehouses'
import { mockStockMovements } from '@/modules/wms/data/stock-movements'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import type { SalesOrder } from '@/modules/crm/types'
import { Input } from '@/components/ui/input'
import {
  HARDWARE_TAXONOMY,
  type Part,
  type RelatedPart,
  type BillOfMaterials,
  type BOMItem,
  type BOMType,
  type BOMStatus,
  type HardwareType,
} from '@/modules/wms/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function ChecklistAssignmentRow({
  label,
  checklistId,
  templateType,
  onAssign,
}: {
  label: string
  checklistId?: string
  templateType: string
  onAssign: (templateId: string) => void
}) {
  const [selecting, setSelecting] = useState(false)
  const template = checklistId
    ? mockChecklistTemplates.find((t) => t.id === checklistId)
    : undefined
  const availableTemplates = mockChecklistTemplates.filter((t) => t.type === templateType && t.isActive)

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {template ? (
          <p className="text-xs text-muted-foreground">
            {template.name} ({template.items.length} items)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No checklist assigned</p>
        )}
      </div>
      {selecting ? (
        <Select
          onValueChange={(v: string | null) => {
            if (v) onAssign(v)
            setSelecting(false)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select checklist" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setSelecting(true)}>
          {template ? 'Change' : 'Assign'}
        </Button>
      )}
    </div>
  )
}

/**
 * Inline parts picker — every hardware type listed one after another. Each section shows
 * the already-added parts at the top, plus its own search input to find and add more.
 * No group headers, no global search, no separate list below. Stays open until Cancel/Done.
 */
interface AddedItem {
  id: string       // entry id (related-part id or BOM item id)
  part: Part
  quantity: number // always 1 for Compatible; editable for BOM
}

function InlinePartPicker({
  availableParts,
  addedItems,
  onAdd,
  onRemove,
  onUpdateQuantity,
  onClose,
  title,
  description,
  withQuantity = false,
  embedded = false,
}: {
  availableParts: Part[]
  addedItems: AddedItem[]
  onAdd: (part: Part, quantity: number) => void
  onRemove: (entryId: string) => void
  onUpdateQuantity?: (entryId: string, quantity: number) => void
  onClose: () => void
  title: string
  description: string
  withQuantity?: boolean
  embedded?: boolean
}) {
  // Index available parts by hardware type
  const availableByType = useMemo(() => {
    const byType = new Map<HardwareType | 'OTHER', Part[]>()
    for (const p of availableParts) {
      const key: HardwareType | 'OTHER' = p.hardwareType ?? 'OTHER'
      const list = byType.get(key) ?? []
      list.push(p)
      byType.set(key, list)
    }
    return byType
  }, [availableParts])

  // Index added items by hardware type
  const addedByType = useMemo(() => {
    const byType = new Map<HardwareType | 'OTHER', AddedItem[]>()
    for (const item of addedItems) {
      const key: HardwareType | 'OTHER' = item.part.hardwareType ?? 'OTHER'
      const list = byType.get(key) ?? []
      list.push(item)
      byType.set(key, list)
    }
    return byType
  }, [addedItems])

  // Flat taxonomy — each hardware type as its own top-level section.
  const flatTypes = useMemo(() => {
    const all: { key: HardwareType | 'OTHER'; label: string }[] = []
    for (const g of HARDWARE_TAXONOMY) {
      for (const t of g.types) {
        all.push({ key: t.key, label: t.label })
      }
    }
    const hasOther =
      (availableByType.get('OTHER')?.length ?? 0) > 0 ||
      (addedByType.get('OTHER')?.length ?? 0) > 0
    if (hasOther) all.push({ key: 'OTHER', label: 'Uncategorised' })
    return all
  }, [availableByType, addedByType])

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {!embedded && (
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* All hardware types — added items + per-type search inside each */}
      <div className="max-h-[32rem] overflow-y-auto">
        {flatTypes.map((t) => (
          <HardwareTypeSection
            key={t.key}
            label={t.label}
            availableParts={availableByType.get(t.key) ?? []}
            addedItems={addedByType.get(t.key) ?? []}
            onAdd={onAdd}
            onRemove={onRemove}
            onUpdateQuantity={onUpdateQuantity}
            withQuantity={withQuantity}
          />
        ))}
      </div>

      {/* Footer (hidden when embedded in a larger form that has its own actions) */}
      {!embedded && (
        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {addedItems.length > 0 ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="font-medium">
                  {addedItems.length} {addedItems.length === 1 ? 'part' : 'parts'} added
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No parts added yet</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A single hardware-type section. Shows added parts at top (with remove / edit-qty),
 * then a search input that reveals available parts to add.
 */
function HardwareTypeSection({
  label,
  availableParts,
  addedItems,
  onAdd,
  onRemove,
  onUpdateQuantity,
  withQuantity,
}: {
  label: string
  availableParts: Part[]
  addedItems: AddedItem[]
  onAdd: (part: Part, quantity: number) => void
  onRemove: (entryId: string) => void
  onUpdateQuantity?: (entryId: string, quantity: number) => void
  withQuantity: boolean
}) {
  const [search, setSearch] = useState('')
  const [rowQuantities, setRowQuantities] = useState<Record<string, string>>({})
  const sectionRef = useRef<HTMLElement>(null)

  const getQty = (partId: string): string => rowQuantities[partId] ?? '1'
  const setQty = (partId: string, value: string) => {
    setRowQuantities((prev) => ({ ...prev, [partId]: value }))
  }

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return availableParts
    return availableParts.filter((p) => {
      const hay = `${p.name} ${p.sku} ${p.brand} ${p.aliases.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [availableParts, q])

  // Clear this section's search when the user clicks outside it.
  useEffect(() => {
    if (!search) return
    const handleClickOutside = (event: MouseEvent) => {
      const node = sectionRef.current
      if (node && !node.contains(event.target as Node)) {
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [search])

  const availableCount = availableParts.length
  const addedCount = addedItems.length

  return (
    <section ref={sectionRef} className="border-b last:border-0">
      {/* Section header */}
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <h5 className="text-sm font-semibold">{label}</h5>
        <span className="text-xs text-muted-foreground">
          {addedCount > 0 && (
            <span className="mr-2 font-medium text-emerald-700">
              {addedCount} added
            </span>
          )}
          {availableCount} available
        </span>
      </div>

      {/* Added items for this type */}
      {addedCount > 0 && (
        <table className="w-full border-t bg-emerald-50/40 text-sm">
          <tbody>
            {addedItems.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.part.name}</p>
                      {item.part.model && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.part.model}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="w-32 px-3 py-2 text-xs text-muted-foreground">
                  {item.part.brand}
                </td>
                <td className="w-40 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {item.part.sku}
                </td>
                {withQuantity && (
                  <td className="w-20 px-3 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity?.(item.id, parseInt(e.target.value) || 1)
                      }
                      className="h-8 w-16 text-center"
                    />
                  </td>
                )}
                <td className="w-24 px-3 py-2 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove"
                  >
                    <X className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Search input — reveals available parts when user types */}
      {availableCount > 0 ? (
        <>
          <div className="bg-background px-4 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${label}... (type to see parts)`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          {q ? (
            filtered.length > 0 ? (
              <table className="w-full border-t text-sm">
                <tbody>
                  {filtered.map((p) => {
                    const qtyStr = getQty(p.id)
                    const qtyNum = Math.max(1, parseInt(qtyStr) || 1)
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <p className="truncate font-medium">
                            {p.name}
                            {(p.productType ?? 'parent') === 'variant' && (
                              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                                Variant
                              </span>
                            )}
                          </p>
                          {p.model && (
                            <p className="truncate text-xs text-muted-foreground">{p.model}</p>
                          )}
                        </td>
                        <td className="w-32 px-3 py-2 text-xs text-muted-foreground">
                          {p.brand}
                        </td>
                        <td className="w-40 px-3 py-2 font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </td>
                        {withQuantity && (
                          <td className="w-20 px-3 py-2">
                            <Input
                              type="number"
                              min="1"
                              value={qtyStr}
                              onChange={(e) => setQty(p.id, e.target.value)}
                              className="h-8 w-16 text-center"
                            />
                          </td>
                        )}
                        <td className="w-24 px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onAdd(p, qtyNum)
                              if (withQuantity) setQty(p.id, '1')
                            }}
                          >
                            <Plus className="size-3.5" data-icon="inline-start" />
                            Add
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                No matches for "{search}" in {label}.
              </p>
            )
          ) : null}
        </>
      ) : addedCount === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          No parts in this category yet.
        </p>
      ) : null}
    </section>
  )
}

function TransferStockDialog({
  open,
  onOpenChange,
  part,
  currentLocation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  part: Part
  currentLocation?: string
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState<string>(() => {
    const prefix = currentLocation?.split('-')[0]?.toUpperCase()
    const match = prefix
      ? mockWarehouses.find((w) => w.code.startsWith(prefix))
      : undefined
    return match?.id ?? mockWarehouses[0]?.id ?? ''
  })
  const [toWarehouseId, setToWarehouseId] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [notes, setNotes] = useState<string>('')

  const handleSubmit = () => {
    if (!toWarehouseId) {
      toast.error('Please select a destination warehouse')
      return
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error('Destination must differ from source')
      return
    }
    const qty = parseInt(quantity) || 0
    if (qty < 1) {
      toast.error('Quantity must be at least 1')
      return
    }
    const from = mockWarehouses.find((w) => w.id === fromWarehouseId)
    const to = mockWarehouses.find((w) => w.id === toWarehouseId)
    toast.success(
      `Transfer queued: ${qty} × ${part.name} from ${from?.name ?? 'source'} → ${to?.name ?? 'destination'}`,
    )
    onOpenChange(false)
    setToWarehouseId('')
    setQuantity('1')
    setNotes('')
  }

  const fromWarehouse = mockWarehouses.find((w) => w.id === fromWarehouseId)
  const toWarehouse = mockWarehouses.find((w) => w.id === toWarehouseId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Move units between warehouses
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {/* Part summary */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
              <Package className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{part.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {part.sku}
                {part.condition ? <> · {part.condition}</> : null}
              </div>
            </div>
          </div>

          {/* From — full width */}
          <div className="grid gap-1.5">
            <Label htmlFor="tr-from">From</Label>
            <Select
              value={fromWarehouseId}
              onValueChange={(v: string | null) => setFromWarehouseId(v ?? '')}
            >
              <SelectTrigger id="tr-from" className="w-full">
                <SelectValue placeholder="Source warehouse" />
              </SelectTrigger>
              <SelectContent>
                {mockWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="font-medium">{w.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">· {w.code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromWarehouse ? (
              <p className="text-xs text-muted-foreground">{fromWarehouse.code}</p>
            ) : null}
          </div>

          {/* To — full width */}
          <div className="grid gap-1.5">
            <Label htmlFor="tr-to">To</Label>
            <Select
              value={toWarehouseId}
              onValueChange={(v: string | null) => setToWarehouseId(v ?? '')}
            >
              <SelectTrigger id="tr-to" className="w-full">
                <SelectValue placeholder="Destination warehouse" />
              </SelectTrigger>
              <SelectContent>
                {mockWarehouses
                  .filter((w) => w.id !== fromWarehouseId)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="font-medium">{w.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">· {w.code}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {toWarehouse ? (
              <p className="text-xs text-muted-foreground">{toWarehouse.code}</p>
            ) : null}
          </div>

          {/* Qty — full width */}
          <div className="grid gap-1.5">
            <Label htmlFor="tr-qty">Qty</Label>
            <Input
              id="tr-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Notes — full width */}
          <div className="grid gap-1.5">
            <Label htmlFor="tr-notes">Notes</Label>
            <Textarea
              id="tr-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason or internal reference"
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [part, setPart] = useState<Part | undefined>(() =>
    mockParts.find((p) => p.id === id)
  )
  const [transferOpen, setTransferOpen] = useState(false)

  // Find matching stock item for inventory data
  const stockItem = useMemo(() => {
    if (!part) return undefined
    return mockStockItems.find(
      (si) => si.name === part.name || si.sku.includes(part.sku.split('-').pop() ?? '')
    )
  }, [part])

  if (!part) {
    return <EmptyState title="Part not found" description="The requested part does not exist." />
  }

  const handleChecklistAssign = (type: 'inward' | 'outward' | 'inspection', templateId: string) => {
    const tmpl = mockChecklistTemplates.find((t) => t.id === templateId)
    setPart((prev) => {
      if (!prev) return prev
      if (type === 'inward') return { ...prev, inwardChecklistId: templateId }
      if (type === 'outward') return { ...prev, outwardChecklistId: templateId }
      return { ...prev, inspectionChecklistId: templateId }
    })
    toast.success(`${tmpl?.name ?? 'Checklist'} assigned`)
  }


  // ── Stock rollup for quick stats (computed from matched stockItem variants) ──
  const stockStats = useMemo(() => {
    const totals = { total: 0, inStock: 0, reserved: 0, dispatched: 0, inRepair: 0 }
    if (!stockItem) return totals
    const source = part.condition
      ? stockItem.variants.filter((v) => v.type === part.condition)
      : stockItem.variants
    for (const v of source) {
      totals.total += v.quantity
      for (const s of v.skus) {
        if (s.status === 'In Stock') totals.inStock += 1
        else if (s.status === 'Reserved') totals.reserved += 1
        else if (s.status === 'Dispatched') totals.dispatched += 1
        else if (s.status === 'In Repair') totals.inRepair += 1
      }
    }
    return totals
  }, [stockItem, part.condition])

  const overviewTab = {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="space-y-6">
        {/* Media gallery — images & videos combined */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Media</h3>
          <div className="flex flex-wrap gap-3">
            {part.images.map((img, i) => (
              <div
                key={`img-${i}`}
                className="flex size-24 items-center justify-center rounded-lg border bg-muted"
                title={img}
              >
                <ImageOff className="size-7 text-muted-foreground" />
                <span className="sr-only">{img}</span>
              </div>
            ))}
            {part.videos?.map((v, i) => (
              <div
                key={`vid-${i}`}
                className="flex size-24 items-center justify-center rounded-lg border bg-muted"
                title={v}
              >
                <Video className="size-7 text-muted-foreground" />
                <span className="sr-only">{v}</span>
              </div>
            ))}
            {part.images.length === 0 && (!part.videos || part.videos.length === 0) && (
              <div className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                <ImageOff className="size-5" />
                <span className="text-xs">No media</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {part.description && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{part.description}</p>
          </div>
        )}

        {/* Specifications + Additional Info — compact side-by-side grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {part.specifications && Object.keys(part.specifications).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Specifications</h3>
              <div className="rounded-md border">
                <dl className="divide-y text-xs">
                  {Object.entries(part.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                      <dt className="font-medium text-muted-foreground">{key}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">Additional Info</h3>
            <div className="rounded-md border">
              <dl className="divide-y text-xs">
                {part.aliases.length > 0 && (
                  <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                    <dt className="font-medium text-muted-foreground">Alias</dt>
                    <dd className="flex flex-wrap justify-end gap-1">
                      {part.aliases.map((alias) => (
                        <span
                          key={alias}
                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                        >
                          {alias}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {part.hsnCode && (
                  <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                    <dt className="font-medium text-muted-foreground">HSN Code</dt>
                    <dd>{part.hsnCode}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                  <dt className="font-medium text-muted-foreground">Unit of Measure</dt>
                  <dd>{part.unitOfMeasure}</dd>
                </div>
                {part.brand && (
                  <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                    <dt className="font-medium text-muted-foreground">Brand</dt>
                    <dd>{part.brand}</dd>
                  </div>
                )}
                {part.model && (
                  <div className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                    <dt className="font-medium text-muted-foreground">Model</dt>
                    <dd>{part.model}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    ),
  }

  const quickStatsBar = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="size-3.5" />
          Total Units
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums">{stockStats.total}</p>
      </div>
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          In Stock
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
          {stockStats.inStock}
        </p>
      </div>
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-amber-600" />
          Reserved
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-amber-700">
          {stockStats.reserved}
        </p>
      </div>
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="size-3.5 text-sky-600" />
          Dispatched
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-sky-700">
          {stockStats.dispatched}
        </p>
      </div>
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wrench className="size-3.5 text-rose-600" />
          In Repair
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-rose-700">
          {stockStats.inRepair}
        </p>
      </div>
    </div>
  )

  // Parts filter their own condition: a 'New' variant only shows New stock; a 'Refurbished' only Refurb.
  // Parent parts (or parts without condition) show all condition groups.
  // Pad SKU rows up to the declared quantity so the table reflects total units.
  const inventoryVariants = useMemo(() => {
    if (!stockItem) return []
    const source = part.condition
      ? stockItem.variants.filter((v) => v.type === part.condition)
      : stockItem.variants
    return source.map((v) => {
      if (v.skus.length >= v.quantity) return v
      const missing = v.quantity - v.skus.length
      const padded = [...v.skus]
      for (let i = 0; i < missing; i++) {
        const idx = v.skus.length + i + 1
        const prefix = `${stockItem.sku}-${v.type.toUpperCase().replace(/\s+/g, '')}-${String(idx).padStart(3, '0')}`
        padded.push({
          sku: prefix,
          serialNumber: '—',
          barcode: '—',
          status: 'In Stock',
          grade: 'A',
          location: stockItem.location,
          receivedDate: v.lastUpdated,
          lastMovement: v.lastUpdated,
        })
      }
      return { ...v, skus: padded }
    })
  }, [stockItem, part.condition])

  const inventoryTab = {
    id: 'inventory',
    label: 'Inventory',
    content: (
      <div className="space-y-6">
        {stockItem && inventoryVariants.length > 0 ? (
          inventoryVariants.map((variant) => (
            <div key={variant.type}>
              <h3 className="mb-2 text-sm font-medium">
                {variant.type}
                <StatusBadge
                  variant={variant.type === 'New' ? 'success' : variant.type === 'Refurbished' ? 'info' : 'warning'}
                  className="ml-2"
                >
                  {variant.quantity} units
                </StatusBadge>
                <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
                  {currencyFmt.format(variant.unitPrice)} / unit
                </span>
              </h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-left font-medium">Serial No</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variant.skus.map((sku) => (
                      <tr key={sku.sku} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{sku.sku}</td>
                        <td className="px-3 py-2">{sku.serialNumber}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {currencyFmt.format(variant.unitPrice)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            variant={
                              sku.status === 'In Stock' ? 'success' :
                              sku.status === 'Reserved' ? 'warning' :
                              sku.status === 'In Repair' ? 'error' : 'info'
                            }
                          >
                            {sku.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">1</td>
                        <td className="px-3 py-2 text-xs">{sku.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {part.condition
              ? `No ${part.condition} inventory linked to this part yet.`
              : 'No inventory data linked to this part yet.'}
          </p>
        )}

        {stockItem && inventoryVariants.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">
              Total Stock: {inventoryVariants.reduce((s, v) => s + v.quantity, 0)} units
              {part.condition ? ` (${part.condition})` : ''}
            </p>
          </div>
        )}
      </div>
    ),
  }

  // ── Variants tab (visible when this part is a parent with child variants) ──
  const partVariants = useMemo(
    () => mockParts.filter((p) => p.parentPartId === part.id),
    [part.id],
  )
  const variantsTab = {
    id: 'variants',
    label: 'Variants',
    count: partVariants.length,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Variants of {part.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({partVariants.length})
            </span>
          </h3>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to={`/ims/parts/new?type=variant&parentId=${part.id}`} />}
          >
            <Plus className="mr-1 size-3.5" />
            Add Variant
          </Button>
        </div>

        {partVariants.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {partVariants.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/ims/parts/${v.id}`}
                    className="block truncate font-medium text-primary hover:underline"
                  >
                    {v.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.sku}
                    {v.model && ` · ${v.model}`}
                  </p>
                </div>
                {v.condition && (
                  <StatusBadge
                    variant={
                      v.condition === 'New'
                        ? 'success'
                        : v.condition === 'Refurbished'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {v.condition}
                  </StatusBadge>
                )}
                {v.sellPrice != null && (
                  <span className="text-sm font-medium tabular-nums">
                    {currencyFmt.format(v.sellPrice)}
                  </span>
                )}
                <StatusBadge variant={v.isActive ? 'success' : 'neutral'}>
                  {v.isActive ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No variants yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a variant to track different conditions (New, Refurbished) or configurations
            </p>
          </div>
        )}
      </div>
    ),
  }

  const checklistsTab = {
    id: 'checklists',
    label: 'Checklist',
    content: (
      <div className="space-y-4">
        <ChecklistAssignmentRow
          label="Inward Checklist"
          checklistId={part.inwardChecklistId}
          templateType="INWARD"
          onAssign={(id) => handleChecklistAssign('inward', id)}
        />
        <ChecklistAssignmentRow
          label="Outward Checklist"
          checklistId={part.outwardChecklistId}
          templateType="OUTWARD"
          onAssign={(id) => handleChecklistAssign('outward', id)}
        />
        <ChecklistAssignmentRow
          label="Inspection Checklist"
          checklistId={part.inspectionChecklistId}
          templateType="INSPECTION"
          onAssign={(id) => handleChecklistAssign('inspection', id)}
        />
      </div>
    ),
  }

  const historyEvents = (() => {
    const events: { title: string; date: string; subtitle?: string; dot: string }[] = [
      { title: 'Part created', date: part.createdAt, dot: 'bg-primary' },
    ]
    if (part.updatedAt) {
      events.push({ title: 'Part updated', date: part.updatedAt, dot: 'bg-primary' })
    }
    if (part.inwardChecklistId) {
      events.push({
        title: 'Inward checklist assigned',
        date: part.updatedAt ?? part.createdAt,
        subtitle:
          mockChecklistTemplates.find((t) => t.id === part.inwardChecklistId)?.name ?? 'Unknown',
        dot: 'bg-emerald-500',
      })
    }
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })()

  // ── Movements tab — stock movements for this part's SKUs/barcodes ──
  const movementsForPart = useMemo(() => {
    if (!stockItem) return []
    const barcodes = new Set<string>()
    for (const v of stockItem.variants) {
      for (const s of v.skus) {
        if (s.barcode && s.barcode !== '—') barcodes.add(s.barcode)
      }
    }
    return mockStockMovements
      .filter((m) => barcodes.has(m.deviceBarcode))
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  }, [stockItem])

  const movementsTab = {
    id: 'movements',
    label: 'Movements',
    count: movementsForPart.length,
    content: (
      <div className="space-y-4">
        {movementsForPart.length > 0 ? (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">When</th>
                  <th className="px-3 py-2 text-left font-medium">Unit</th>
                  <th className="px-3 py-2 text-left font-medium">From</th>
                  <th className="px-3 py-2 text-left font-medium">To</th>
                  <th className="px-3 py-2 text-left font-medium">By</th>
                  <th className="px-3 py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movementsForPart.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(m.changedAt)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.deviceBarcode}</td>
                    <td className="px-3 py-2 text-xs">{m.fromStatus}</td>
                    <td className="px-3 py-2 text-xs">{m.toStatus}</td>
                    <td className="px-3 py-2 text-xs">{m.changedBy}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{m.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No movements yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unit movements will appear here once inventory is received, inspected, or dispatched.
            </p>
          </div>
        )}
      </div>
    ),
  }

  // ── Linked Orders tab — sales orders that reference this part (or any of its variants) ──
  const linkedOrders = useMemo(() => {
    const childIds = new Set(
      mockParts.filter((p) => p.parentPartId === part.id).map((p) => p.id),
    )
    const matches: { order: SalesOrder; qty: number; amount: number }[] = []
    for (const so of salesOrders) {
      let qty = 0
      let amount = 0
      for (const li of so.lineItems) {
        if (li.partId === part.id || childIds.has(li.partId)) {
          qty += li.qty
          amount += li.amount
        }
      }
      if (qty > 0) matches.push({ order: so, qty, amount })
    }
    return matches.sort(
      (a, b) => new Date(b.order.date).getTime() - new Date(a.order.date).getTime(),
    )
  }, [part.id])

  const soStatusVariant = (status: SalesOrder['status']): StatusBadgeVariant => {
    switch (status) {
      case 'Delivered':
      case 'Shipped':
        return 'success'
      case 'Cancelled':
        return 'error'
      case 'Draft':
        return 'neutral'
      case 'Ready for Dispatch':
        return 'info'
      default:
        return 'warning'
    }
  }

  const linkedOrdersTab = {
    id: 'linked-orders',
    label: 'Linked Orders',
    count: linkedOrders.length,
    content: (
      <div className="space-y-4">
        {linkedOrders.length > 0 ? (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">SO#</th>
                  <th className="px-3 py-2 text-left font-medium">Account</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {linkedOrders.map(({ order, qty, amount }) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        to={`/crm/sales-orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{order.accountName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(order.date)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {currencyFmt.format(amount)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={soStatusVariant(order.status)}>
                        {order.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No linked sales orders</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sales orders that include this {part.productType === 'variant' ? 'variant' : 'part'}{' '}
              will appear here.
            </p>
          </div>
        )}
      </div>
    ),
  }

  const activityTab = {
    id: 'activity',
    label: 'Activity',
    content: (
      <div className="space-y-4">
        <div className="rounded-md border p-4">
          <div className="space-y-4">
            {historyEvents.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`size-2.5 rounded-full ${e.dot}`} />
                  {i < historyEvents.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className={i < historyEvents.length - 1 ? 'pb-4' : undefined}>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.subtitle ?? formatDate(e.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  }

  // ── Compatible tab ──
  const relatedParts = useMemo(
    () => mockRelatedParts.filter((rp) => rp.partId === part.id && rp.isActive),
    [part.id]
  )

  const [localRelatedParts, setLocalRelatedParts] = useState<RelatedPart[]>(relatedParts)

  // Parts available to add (not already related and not self)
  const availableParts = useMemo(
    () =>
      mockParts.filter(
        (p) =>
          p.id !== part.id &&
          p.isActive &&
          !localRelatedParts.some((rp) => rp.relatedPartId === p.id)
      ),
    [part.id, localRelatedParts]
  )

  // Already-related parts shaped for the picker's per-section "added" list
  const relatedAddedItems = useMemo<AddedItem[]>(
    () =>
      localRelatedParts
        .map((rp) => {
          const p = mockParts.find((mp) => mp.id === rp.relatedPartId)
          if (!p) return null
          return { id: rp.id, part: p, quantity: 1 }
        })
        .filter((x): x is AddedItem => x !== null),
    [localRelatedParts],
  )

  const handleAddRelatedPart = (target: Part, _qty: number) => {
    const newRP: RelatedPart = {
      id: `RP-NEW-${Date.now()}`,
      partId: part.id,
      relatedPartId: target.id,
      relationType: 'COMPATIBLE',
      priority: localRelatedParts.length + 1,
      isActive: true,
    }
    setLocalRelatedParts((prev) => [...prev, newRP])
    toast.success(`${target.name} marked compatible`)
  }

  const handleRemoveRelatedPart = (rpId: string) => {
    setLocalRelatedParts((prev) => prev.filter((rp) => rp.id !== rpId))
    toast.success('Compatible part removed')
  }

  const relatedPartsTab = {
    id: 'compatible',
    label: 'Compatible',
    count: localRelatedParts.length,
    content: (
      <div className="space-y-6">
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-medium">
              Compatible Parts
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({localRelatedParts.length})
              </span>
            </h3>
          </div>

          <InlinePartPicker
            availableParts={availableParts}
            addedItems={relatedAddedItems}
            onAdd={handleAddRelatedPart}
            onRemove={handleRemoveRelatedPart}
            onClose={() => {}}
            title="Compatible parts"
            description="Each hardware type is listed below. Already-added parts appear at the top of their section. Use the search inside a section to find and add more."
            embedded
          />
        </div>
      </div>
    ),
  }

  // ── BOMs tab ──
  const partBOMs = useMemo(
    () => mockBOMs.filter((b) => b.parentPartId === part.id),
    [part.id]
  )
  const usedInBOMs = useMemo(
    () => mockBOMs.filter((b) => b.items.some((item) => item.partId === part.id)),
    [part.id]
  )

  // Local BOMs state so newly created ones show immediately
  const [localBOMs, setLocalBOMs] = useState<BillOfMaterials[]>(partBOMs)
  const [expandedBOMId, setExpandedBOMId] = useState<string | null>(null)

  // Draft creation state (before user confirms Save)
  const [draftType, setDraftType] = useState<BOMType | null>(null)
  const [draftItems, setDraftItems] = useState<BOMItem[]>([])

  const bomLabel = (type: BOMType) =>
    type === 'ASSEMBLY' ? `${part.name} Assembled` : `${part.name} Disassembled`

  const startBOM = (type: BOMType) => {
    setDraftType(type)
    setDraftItems([])
  }

  const cancelDraftBOM = () => {
    setDraftType(null)
    setDraftItems([])
  }

  const saveDraftBOM = () => {
    if (!draftType) return
    const nextNum = localBOMs.length + partBOMs.length + 1
    const newBOM: BillOfMaterials = {
      id: `BOM-NEW-${Date.now()}`,
      name: bomLabel(draftType),
      bomNumber: `BOM-2026-${String(100 + nextNum).padStart(3, '0')}`,
      type: draftType,
      status: 'Draft' as BOMStatus,
      version: 1,
      parentPartId: part.id,
      parentPartName: part.name,
      parentPartSku: part.sku,
      items: draftItems,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
    }
    setLocalBOMs((prev) => [...prev, newBOM])
    setExpandedBOMId(newBOM.id)
    setDraftType(null)
    setDraftItems([])
    toast.success(`${bomLabel(newBOM.type)} created as Draft`)
  }

  const addDraftItem = (selectedPart: Part, quantity: number) => {
    const item: BOMItem = {
      id: `BOMI-NEW-${Date.now()}`,
      variantId: `VAR-${selectedPart.id}`,
      condition: selectedPart.condition ?? 'New',
      variantSku: selectedPart.sku,
      partId: selectedPart.id,
      partName: selectedPart.name,
      partSku: selectedPart.sku,
      quantity: Math.max(1, quantity),
      unitOfMeasure: selectedPart.unitOfMeasure,
      isOptional: false,
      allowSubstitution: false,
    }
    setDraftItems((prev) => [...prev, item])
    toast.success(`${selectedPart.name} added (×${Math.max(1, quantity)})`)
  }

  const removeDraftItem = (itemId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const updateDraftItemQty = (itemId: string, qty: number) => {
    setDraftItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(1, qty) } : i)),
    )
  }

  const draftAddedItems = useMemo<AddedItem[]>(
    () =>
      draftItems
        .map((item) => {
          const p = mockParts.find((mp) => mp.id === item.partId)
          if (!p) return null
          return { id: item.id, part: p, quantity: item.quantity }
        })
        .filter((x): x is AddedItem => x !== null),
    [draftItems],
  )

  const draftAvailableParts = useMemo(
    () =>
      mockParts.filter(
        (p) =>
          p.isActive &&
          p.id !== part.id &&
          !draftItems.some((it) => it.partId === p.id),
      ),
    [part.id, draftItems],
  )

  const addItemToBOM = (bomId: string, selectedPart: Part, quantity: number) => {
    const item: BOMItem = {
      id: `BOMI-NEW-${Date.now()}`,
      variantId: `VAR-${selectedPart.id}`,
      condition: selectedPart.condition ?? 'New',
      variantSku: selectedPart.sku,
      partId: selectedPart.id,
      partName: selectedPart.name,
      partSku: selectedPart.sku,
      quantity: Math.max(1, quantity),
      unitOfMeasure: selectedPart.unitOfMeasure,
      isOptional: false,
      allowSubstitution: false,
    }
    setLocalBOMs((prev) =>
      prev.map((b) => (b.id === bomId ? { ...b, items: [...b.items, item] } : b)),
    )
    toast.success(`${selectedPart.name} added (×${Math.max(1, quantity)})`)
  }

  const removeItemFromBOM = (bomId: string, itemId: string) => {
    setLocalBOMs((prev) =>
      prev.map((b) =>
        b.id === bomId ? { ...b, items: b.items.filter((i) => i.id !== itemId) } : b,
      ),
    )
  }

  const updateItemQtyInBOM = (bomId: string, itemId: string, qty: number) => {
    setLocalBOMs((prev) =>
      prev.map((b) =>
        b.id === bomId
          ? {
              ...b,
              items: b.items.map((i) =>
                i.id === itemId ? { ...i, quantity: Math.max(1, qty) } : i,
              ),
            }
          : b,
      ),
    )
  }

  const hasAssembly = localBOMs.some((b) => b.type === 'ASSEMBLY')
  const hasDisassembly = localBOMs.some((b) => b.type === 'DISASSEMBLY')

  const bomsTab = {
    id: 'boms',
    label: 'BOM',
    count: localBOMs.length + usedInBOMs.length,
    content: (
      <div className="space-y-6">
        {/* Header with Create buttons */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Bill of Materials for {part.name}
          </h3>
          {!draftType && (
            <div className="flex gap-2">
              {!hasAssembly && (
                <Button size="sm" variant="outline" onClick={() => startBOM('ASSEMBLY')}>
                  <Plus className="mr-1 size-3.5" />
                  Assembly BOM
                </Button>
              )}
              {!hasDisassembly && (
                <Button size="sm" variant="outline" onClick={() => startBOM('DISASSEMBLY')}>
                  <Plus className="mr-1 size-3.5" />
                  Disassembly BOM
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Draft new BOM ── */}
        {draftType && (
          <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{bomLabel(draftType)}</h4>
              <div className="flex items-center gap-2">
                <StatusBadge variant={draftType === 'ASSEMBLY' ? 'info' : 'warning'}>
                  {draftType === 'ASSEMBLY' ? 'Assembled' : 'Disassembled'}
                </StatusBadge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelDraftBOM}
                  aria-label="Cancel"
                  className="size-7 p-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <InlinePartPicker
              availableParts={draftAvailableParts}
              addedItems={draftAddedItems}
              onAdd={addDraftItem}
              onRemove={removeDraftItem}
              onUpdateQuantity={updateDraftItemQty}
              onClose={() => {}}
              title={`Parts in ${bomLabel(draftType)}`}
              description="Each hardware type is listed below. Already-added parts appear at the top of their section. Use the search inside a section to find and add more."
              withQuantity
              embedded
            />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={cancelDraftBOM}>
                Cancel
              </Button>
              <Button onClick={saveDraftBOM} disabled={draftItems.length === 0}>
                Save BOM
              </Button>
            </div>
          </div>
        )}

        {/* ── Assembly / Disassembly BOMs — expandable rows ── */}
        {localBOMs.length > 0 && (
          <div className="divide-y rounded-lg border">
            {localBOMs.map((bom) => {
              const isExpanded = expandedBOMId === bom.id
              const addedItems: AddedItem[] = bom.items
                .map((item) => {
                  const p = mockParts.find((mp) => mp.id === item.partId)
                  if (!p) return null
                  return { id: item.id, part: p, quantity: item.quantity }
                })
                .filter((x): x is AddedItem => x !== null)

              const availableParts = mockParts.filter(
                (p) =>
                  p.isActive &&
                  p.id !== part.id &&
                  !bom.items.some((it) => it.partId === p.id),
              )

              return (
                <div key={bom.id}>
                  <div className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => setExpandedBOMId(isExpanded ? null : bom.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                      />
                      <div>
                        <p className="font-medium">{bomLabel(bom.type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {bom.items.length} {bom.items.length === 1 ? 'part' : 'parts'}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={bom.type === 'ASSEMBLY' ? 'info' : 'warning'}>
                        {bom.type === 'ASSEMBLY' ? 'Assembled' : 'Disassembled'}
                      </StatusBadge>
                      {isExpanded && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExpandedBOMId(null)}
                          aria-label="Close"
                          className="size-7"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/10 p-4">
                      <InlinePartPicker
                        availableParts={availableParts}
                        addedItems={addedItems}
                        onAdd={(sp, q) => addItemToBOM(bom.id, sp, q)}
                        onRemove={(itemId) => removeItemFromBOM(bom.id, itemId)}
                        onUpdateQuantity={(itemId, q) => updateItemQtyInBOM(bom.id, itemId, q)}
                        onClose={() => setExpandedBOMId(null)}
                        title={`Parts in ${bomLabel(bom.type)}`}
                        description="Each hardware type is listed below. Already-added parts appear at the top of their section. Use the search inside a section to find and add more."
                        withQuantity
                        embedded
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* BOMs where this part is used as a component */}
        {usedInBOMs.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium">
              Used as Component In
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({usedInBOMs.length} BOMs)
              </span>
            </h3>
            <div className="divide-y rounded-lg border">
              {usedInBOMs.map((bom) => {
                const item = bom.items.find((i) => i.partId === part.id)
                return (
                  <Link
                    key={bom.id}
                    to={`/wms/bom/${bom.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{bom.parentPartName}</p>
                      <p className="text-xs text-muted-foreground">
                        {bom.bomNumber} · Qty: {item?.quantity ?? '?'} {item?.unitOfMeasure ?? ''}
                        {item?.position && ` · ${item.position}`}
                      </p>
                    </div>
                    <StatusBadge variant={bom.type === 'ASSEMBLY' ? 'info' : 'warning'}>
                      {bom.type === 'ASSEMBLY' ? 'Assembled' : 'Disassembled'}
                    </StatusBadge>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state only if nothing at all */}
        {localBOMs.length === 0 && usedInBOMs.length === 0 && !draftType && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No BOMs linked</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create an Assembly or Disassembly BOM for this part using the buttons above
            </p>
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={part.name}
        subtitle={`${part.sku} | ${part.brand}`}
        status={{ label: part.isActive ? 'Active' : 'Inactive', variant: part.isActive ? 'success' : 'neutral' }}
        backHref="/ims/parts"
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={`/procurement/po/new?partId=${part.id}`} />}
            >
              <ShoppingCart className="mr-1.5 size-4" />
              Create PO
            </Button>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="mr-1.5 size-4" />
              Transfer Stock
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to={`/ims/parts/${part.id}/edit`} />}>
              <Pencil className="mr-1.5 size-4" />
              Edit
            </Button>
          </>
        }
      />

      <TransferStockDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        part={part}
        currentLocation={stockItem?.location}
      />

      {quickStatsBar}

      {(() => {
        // BOM is meaningful only for Server-category products; for variants we check the parent's category too.
        const variantParent = part.parentPartId
          ? mockParts.find((p) => p.id === part.parentPartId)
          : undefined
        const isServerCategory =
          part.categoryName === 'Servers' || variantParent?.categoryName === 'Servers'

        return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Tabs — variants tab only for parent parts, BOMs only for Server category */}
        <DetailTabs
          tabs={[
            overviewTab,
            inventoryTab,
            ...((part.productType ?? 'parent') === 'parent' ? [variantsTab] : []),
            ...(isServerCategory ? [bomsTab] : []),
            relatedPartsTab,
            movementsTab,
            linkedOrdersTab,
            checklistsTab,
            activityTab,
          ]}
        />

        {/* Right: Sidebar cards */}
        <div className="space-y-4">
          {/* Product Manager card */}
          {part.productManager && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Product Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {getInitials(part.productManager)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{part.productManager}</p>
                    {part.productManagerEmail && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        {part.productManagerEmail}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parent card — only for variant-type parts */}
          {(part.productType ?? 'parent') === 'variant' && (() => {
            const parent = part.parentPartId
              ? mockParts.find((p) => p.id === part.parentPartId)
              : undefined
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Parent Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {parent ? (
                    <div className="space-y-1">
                      <Link
                        to={`/ims/parts/${parent.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {parent.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {parent.brand} · {parent.sku}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Parent not found</p>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {/* Part Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Part Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-xs font-medium">{part.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{part.categoryName}</span>
              </div>
              {part.subcategoryName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subcategory</span>
                  <span className="font-medium">{part.subcategoryName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{part.brand}</span>
              </div>
              {part.model && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">{part.model}</span>
                </div>
              )}
              {part.hsnCode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HSN Code</span>
                  <span className="font-medium">{part.hsnCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Type</span>
                <StatusBadge variant={(part.productType ?? 'parent') === 'variant' ? 'info' : 'neutral'}>
                  {(part.productType ?? 'parent') === 'variant' ? 'Variant' : 'Parent'}
                </StatusBadge>
              </div>
              {part.condition && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition</span>
                  <StatusBadge variant={part.condition === 'New' ? 'success' : part.condition === 'Refurbished' ? 'info' : 'warning'}>
                    {part.condition}
                  </StatusBadge>
                </div>
              )}
              {part.assemblyType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assembly</span>
                  <StatusBadge variant={part.assemblyType === 'Assembled' ? 'success' : 'warning'}>
                    {part.assemblyType}
                  </StatusBadge>
                </div>
              )}
              {part.sellPrice != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium tabular-nums">{currencyFmt.format(part.sellPrice)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit of Measure</span>
                <span className="font-medium">{part.unitOfMeasure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(part.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        )
      })()}
    </div>
  )
}

