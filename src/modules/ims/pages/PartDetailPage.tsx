import { useCallback, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Pencil,
  ImageOff,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plug,
  Replace,
  Plus,
  X,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
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
import { cn } from '@/lib/utils'
import { mockParts } from '../data/parts'
import { mockStockItems } from '../data/stock-items'
import { mockPricing, mockPriceHistory } from '../data/pricing'
import { mockChecklistTemplates } from '@/modules/wms/data/checklist-templates'
import { mockRelatedParts } from '@/modules/wms/data/related-parts'
import { mockBOMs } from '@/modules/wms/data/boms'
import { Input } from '@/components/ui/input'
import type { Part, PartRelationType, RelatedPart, BillOfMaterials, BOMItem, BOMType, BOMStatus } from '@/modules/wms/types'

const RELATION_LABELS: Record<PartRelationType, string> = {
  REPLACEMENT: 'Replacement',
  ALTERNATIVE: 'Alternative',
  UPGRADE: 'Upgrade',
  DOWNGRADE: 'Downgrade',
  COMPATIBLE: 'Compatible',
}

const RELATION_VARIANT: Record<PartRelationType, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  REPLACEMENT: 'warning',
  ALTERNATIVE: 'info',
  UPGRADE: 'success',
  DOWNGRADE: 'neutral',
  COMPATIBLE: 'info',
}

const RELATION_ICON: Record<PartRelationType, React.ReactNode> = {
  REPLACEMENT: <Replace className="size-3.5" />,
  ALTERNATIVE: <RefreshCw className="size-3.5" />,
  UPGRADE: <ArrowUpRight className="size-3.5" />,
  DOWNGRADE: <ArrowDownRight className="size-3.5" />,
  COMPATIBLE: <Plug className="size-3.5" />,
}

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

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [part, setPart] = useState<Part | undefined>(() =>
    mockParts.find((p) => p.id === id)
  )

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

  // Compute stock summary
  const stockSummary = useMemo(() => {
    if (!stockItem) return { new: 0, refurbished: 0, newPool: 0, total: 0 }
    const newQty = stockItem.variants.find((v) => v.type === 'New')?.quantity ?? 0
    const refQty = stockItem.variants.find((v) => v.type === 'Refurbished')?.quantity ?? 0
    const poolQty = stockItem.variants.find((v) => v.type === 'New Pool')?.quantity ?? 0
    return { new: newQty, refurbished: refQty, newPool: poolQty, total: newQty + refQty + poolQty }
  }, [stockItem])

  const overviewTab = {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="space-y-6">
        {/* Image gallery placeholder */}
        <div className="flex gap-3">
          {part.images.length > 0 ? (
            part.images.map((img, i) => (
              <div
                key={i}
                className="flex size-32 items-center justify-center rounded-lg border bg-muted"
              >
                <ImageOff className="size-8 text-muted-foreground" />
                <span className="sr-only">{img}</span>
              </div>
            ))
          ) : (
            <div className="flex size-32 items-center justify-center rounded-lg border bg-muted">
              <ImageOff className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Description */}
        {part.description && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{part.description}</p>
          </div>
        )}

        {/* Specifications */}
        {part.specifications && Object.keys(part.specifications).length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Specifications</h3>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(part.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-muted-foreground">{key}</td>
                      <td className="px-3 py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aliases */}
        {part.aliases.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Aliases</h3>
            <div className="flex flex-wrap gap-2">
              {part.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional info */}
        <div className="grid grid-cols-2 gap-4">
          {part.hsnCode && (
            <div>
              <p className="text-xs text-muted-foreground">HSN Code</p>
              <p className="text-sm font-medium">{part.hsnCode}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Unit of Measure</p>
            <p className="text-sm font-medium">{part.unitOfMeasure}</p>
          </div>
        </div>
      </div>
    ),
  }

  const inventoryTab = {
    id: 'inventory',
    label: 'Inventory',
    content: (
      <div className="space-y-6">
        {stockItem ? (
          stockItem.variants.map((variant) => (
            <div key={variant.type}>
              <h3 className="mb-2 text-sm font-medium">
                {variant.type}
                <StatusBadge
                  variant={variant.type === 'New' ? 'success' : variant.type === 'Refurbished' ? 'info' : 'warning'}
                  className="ml-2"
                >
                  {variant.quantity} units
                </StatusBadge>
              </h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-left font-medium">Serial</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Grade</th>
                      <th className="px-3 py-2 text-left font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variant.skus.map((sku) => (
                      <tr key={sku.sku} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{sku.sku}</td>
                        <td className="px-3 py-2">{sku.serialNumber}</td>
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
                        <td className="px-3 py-2">{sku.grade ?? '-'}</td>
                        <td className="px-3 py-2 text-xs">{sku.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={cn(
                'mt-2 text-xs',
                variant.quantity < part.reorderLevel ? 'font-medium text-destructive' : 'text-muted-foreground'
              )}>
                {variant.quantity < part.reorderLevel
                  ? `Below reorder level (${part.reorderLevel})`
                  : `Above reorder level (${part.reorderLevel})`}
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No inventory data linked to this part yet.
          </p>
        )}

        {stockItem && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">
              Total Stock: {stockItem.variants.reduce((s, v) => s + v.quantity, 0)} units
            </p>
          </div>
        )}
      </div>
    ),
  }

  const checklistsTab = {
    id: 'checklists',
    label: 'Checklists',
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

  const historyTab = {
    id: 'history',
    label: 'History',
    content: (
      <div className="space-y-4">
        <div className="rounded-md border p-4">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="size-2.5 rounded-full bg-primary" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium">Part created</p>
                <p className="text-xs text-muted-foreground">{formatDate(part.createdAt)}</p>
              </div>
            </div>
            {part.updatedAt && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="size-2.5 rounded-full bg-primary" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">Part updated</p>
                  <p className="text-xs text-muted-foreground">{formatDate(part.updatedAt)}</p>
                </div>
              </div>
            )}
            {part.inwardChecklistId && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="size-2.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Inward checklist assigned</p>
                  <p className="text-xs text-muted-foreground">
                    {mockChecklistTemplates.find((t) => t.id === part.inwardChecklistId)?.name ?? 'Unknown'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  }

  // ── Related Parts tab ──
  const relatedParts = useMemo(
    () => mockRelatedParts.filter((rp) => rp.partId === part.id && rp.isActive),
    [part.id]
  )
  const incomingRelations = useMemo(
    () => mockRelatedParts.filter((rp) => rp.relatedPartId === part.id && rp.isActive),
    [part.id]
  )

  const [addingRelated, setAddingRelated] = useState(false)
  const [newRelationType, setNewRelationType] = useState<PartRelationType>('ALTERNATIVE')
  const [newRelatedPartId, setNewRelatedPartId] = useState<string>('')
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

  const handleAddRelatedPart = () => {
    if (!newRelatedPartId) return
    const target = mockParts.find((p) => p.id === newRelatedPartId)
    if (!target) return

    const newRP: RelatedPart = {
      id: `RP-NEW-${Date.now()}`,
      partId: part.id,
      relatedPartId: newRelatedPartId,
      relationType: newRelationType,
      priority: localRelatedParts.length + 1,
      isActive: true,
    }
    setLocalRelatedParts((prev) => [...prev, newRP])
    setAddingRelated(false)
    setNewRelatedPartId('')
    toast.success(`${target.name} added as ${RELATION_LABELS[newRelationType].toLowerCase()}`)
  }

  const handleRemoveRelatedPart = (rpId: string) => {
    setLocalRelatedParts((prev) => prev.filter((rp) => rp.id !== rpId))
    toast.success('Related part removed')
  }

  const relatedPartsTab = {
    id: 'related',
    label: 'Related Parts',
    count: localRelatedParts.length,
    content: (
      <div className="space-y-6">
        {/* Outgoing: This part → related parts */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Replaceable / Related Parts
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({localRelatedParts.length})
              </span>
            </h3>
            <Button size="sm" variant="outline" onClick={() => setAddingRelated(!addingRelated)}>
              {addingRelated ? (
                <>
                  <X className="mr-1 size-3.5" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="mr-1 size-3.5" />
                  Add Related Part
                </>
              )}
            </Button>
          </div>

          {/* Add form */}
          {addingRelated && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Part
                </label>
                <Select onValueChange={(v: string | null) => setNewRelatedPartId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a part..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.brand})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Relation Type
                </label>
                <Select
                  value={newRelationType}
                  onValueChange={(v: string | null) =>
                    setNewRelationType((v as PartRelationType) ?? 'ALTERNATIVE')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RELATION_LABELS) as PartRelationType[]).map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {RELATION_LABELS[rel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleAddRelatedPart} disabled={!newRelatedPartId}>
                Add
              </Button>
            </div>
          )}

          {/* Related parts list */}
          {localRelatedParts.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {localRelatedParts.map((rp) => {
                const target = mockParts.find((p) => p.id === rp.relatedPartId)
                if (!target) return null
                return (
                  <div key={rp.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {RELATION_ICON[rp.relationType]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/ims/parts/${target.id}`}
                          className="font-medium text-primary hover:underline truncate"
                        >
                          {target.name}
                        </Link>
                        <StatusBadge variant={RELATION_VARIANT[rp.relationType]}>
                          {RELATION_LABELS[rp.relationType]}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {target.brand} · {target.sku}
                        {rp.notes && ` · ${rp.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {rp.priority}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveRelatedPart(rp.id)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <RefreshCw className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No related parts defined</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add alternatives, replacements, or upgrades for this part
              </p>
            </div>
          )}
        </div>

        {/* Incoming: Other parts that reference this part */}
        {incomingRelations.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium">
              Referenced By
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({incomingRelations.length} parts reference this as a related part)
              </span>
            </h3>
            <div className="divide-y rounded-lg border bg-muted/20">
              {incomingRelations.map((rp) => {
                const source = mockParts.find((p) => p.id === rp.partId)
                if (!source) return null
                return (
                  <div key={rp.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/ims/parts/${source.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {source.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {source.brand} · Uses this part as{' '}
                        <StatusBadge variant={RELATION_VARIANT[rp.relationType]}>
                          {RELATION_LABELS[rp.relationType]}
                        </StatusBadge>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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

  // BOM creation form state
  const [creatingBOM, setCreatingBOM] = useState(false)
  const [newBOMName, setNewBOMName] = useState('')
  const [newBOMType, setNewBOMType] = useState<BOMType>('ASSEMBLY')
  const [newBOMItems, setNewBOMItems] = useState<BOMItem[]>([])
  const [newBOMEstTime, setNewBOMEstTime] = useState('')
  const [newBOMEstCost, setNewBOMEstCost] = useState('')
  const [newBOMNotes, setNewBOMNotes] = useState('')

  // For adding items to the BOM being created
  const [addingBOMItem, setAddingBOMItem] = useState(false)
  const [bomItemPartId, setBomItemPartId] = useState('')
  const [bomItemQty, setBomItemQty] = useState('1')
  const [bomItemPosition, setBomItemPosition] = useState('')
  const [bomItemOptional, setBomItemOptional] = useState(false)
  const [bomItemSubstitutable, setBomItemSubstitutable] = useState(false)

  const handleAddBOMItem = () => {
    const selectedPart = mockParts.find((p) => p.id === bomItemPartId)
    if (!selectedPart) return

    const item: BOMItem = {
      id: `BOMI-NEW-${Date.now()}`,
      partId: selectedPart.id,
      partName: selectedPart.name,
      partSku: selectedPart.sku,
      quantity: parseInt(bomItemQty) || 1,
      unitOfMeasure: selectedPart.unitOfMeasure,
      isOptional: bomItemOptional,
      allowSubstitution: bomItemSubstitutable,
      position: bomItemPosition || undefined,
    }

    setNewBOMItems((prev) => [...prev, item])
    setBomItemPartId('')
    setBomItemQty('1')
    setBomItemPosition('')
    setBomItemOptional(false)
    setBomItemSubstitutable(false)
    setAddingBOMItem(false)
  }

  const handleRemoveBOMItem = (itemId: string) => {
    setNewBOMItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const handleCreateBOM = () => {
    if (!newBOMName.trim() || newBOMItems.length === 0) {
      toast.error('BOM needs a name and at least one component')
      return
    }

    const nextNum = localBOMs.length + partBOMs.length + 1
    const newBOM: BillOfMaterials = {
      id: `BOM-NEW-${Date.now()}`,
      name: newBOMName,
      bomNumber: `BOM-2026-${String(100 + nextNum).padStart(3, '0')}`,
      type: newBOMType,
      status: 'Draft' as BOMStatus,
      version: 1,
      parentPartId: part.id,
      parentPartName: part.name,
      parentPartSku: part.sku,
      items: newBOMItems,
      estimatedAssemblyTime: newBOMEstTime ? parseInt(newBOMEstTime) : undefined,
      estimatedCost: newBOMEstCost ? parseInt(newBOMEstCost) : undefined,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      notes: newBOMNotes || undefined,
    }

    setLocalBOMs((prev) => [...prev, newBOM])
    setCreatingBOM(false)
    setNewBOMName('')
    setNewBOMType('ASSEMBLY')
    setNewBOMItems([])
    setNewBOMEstTime('')
    setNewBOMEstCost('')
    setNewBOMNotes('')
    toast.success(`BOM "${newBOM.name}" created as Draft`)
  }

  const handleCancelBOM = () => {
    setCreatingBOM(false)
    setNewBOMName('')
    setNewBOMType('ASSEMBLY')
    setNewBOMItems([])
    setNewBOMEstTime('')
    setNewBOMEstCost('')
    setNewBOMNotes('')
    setAddingBOMItem(false)
  }

  const bomsTab = {
    id: 'boms',
    label: 'BOMs',
    count: localBOMs.length + usedInBOMs.length,
    content: (
      <div className="space-y-6">
        {/* Header with Create buttons */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Bill of Materials for {part.name}
          </h3>
          {!creatingBOM && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setNewBOMType('ASSEMBLY'); setCreatingBOM(true) }}
              >
                <Plus className="mr-1 size-3.5" />
                Assembly BOM
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setNewBOMType('DISASSEMBLY'); setCreatingBOM(true) }}
              >
                <Plus className="mr-1 size-3.5" />
                Disassembly BOM
              </Button>
            </div>
          )}
        </div>

        {/* ── Create BOM Form ── */}
        {creatingBOM && (
          <div className="rounded-lg border bg-muted/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Plus className="size-4" />
                New {newBOMType === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'} BOM
              </h4>
              <StatusBadge variant={newBOMType === 'ASSEMBLY' ? 'info' : 'warning'}>
                {newBOMType === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'}
              </StatusBadge>
            </div>

            {/* BOM info fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  BOM Name *
                </label>
                <Input
                  value={newBOMName}
                  onChange={(e) => setNewBOMName(e.target.value)}
                  placeholder={`e.g. ${part.name} Standard Build`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Type
                </label>
                <Select
                  value={newBOMType}
                  onValueChange={(v: string | null) => setNewBOMType((v as BOMType) ?? 'ASSEMBLY')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                    <SelectItem value="DISASSEMBLY">Disassembly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Est. Assembly Time (minutes)
                </label>
                <Input
                  type="number"
                  value={newBOMEstTime}
                  onChange={(e) => setNewBOMEstTime(e.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Est. Cost (INR)
                </label>
                <Input
                  type="number"
                  value={newBOMEstCost}
                  onChange={(e) => setNewBOMEstCost(e.target.value)}
                  placeholder="e.g. 285000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <Input
                value={newBOMNotes}
                onChange={(e) => setNewBOMNotes(e.target.value)}
                placeholder="Optional notes about this BOM..."
              />
            </div>

            {/* Parent product (read-only) */}
            <div className="rounded-md bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {newBOMType === 'ASSEMBLY' ? 'Output Product:' : 'Source Product:'}
              </span>{' '}
              <span className="font-medium">{part.name}</span>
              <span className="text-muted-foreground"> ({part.sku})</span>
            </div>

            {/* Component Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-sm font-medium">
                  Components ({newBOMItems.length})
                </h5>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingBOMItem(!addingBOMItem)}
                >
                  {addingBOMItem ? (
                    <><X className="mr-1 size-3.5" /> Cancel</>
                  ) : (
                    <><Plus className="mr-1 size-3.5" /> Add Component</>
                  )}
                </Button>
              </div>

              {/* Add component form */}
              {addingBOMItem && (
                <div className="mb-3 rounded-md border bg-background p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Part *</label>
                      <Select onValueChange={(v: string | null) => setBomItemPartId(v ?? '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select component part..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockParts
                            .filter((p) => p.isActive && p.id !== part.id)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.brand} · {p.sku})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Quantity *</label>
                      <Input
                        type="number"
                        min="1"
                        value={bomItemQty}
                        onChange={(e) => setBomItemQty(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Position</label>
                      <Input
                        value={bomItemPosition}
                        onChange={(e) => setBomItemPosition(e.target.value)}
                        placeholder="e.g. Slot 1, Bay 2"
                      />
                    </div>
                    <div className="flex items-end gap-4 sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={bomItemOptional}
                          onChange={(e) => setBomItemOptional(e.target.checked)}
                          className="rounded border-input"
                        />
                        Optional
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={bomItemSubstitutable}
                          onChange={(e) => setBomItemSubstitutable(e.target.checked)}
                          className="rounded border-input"
                        />
                        Allow Substitution
                      </label>
                      <Button size="sm" onClick={handleAddBOMItem} disabled={!bomItemPartId}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Component list */}
              {newBOMItems.length > 0 ? (
                <div className="divide-y rounded-md border">
                  {newBOMItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.partName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.partSku}
                          {item.position && ` · ${item.position}`}
                          {item.isOptional && ' · Optional'}
                          {item.allowSubstitution && ' · Substitutable'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">&times;{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveBOMItem(item.id)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No components added yet. Click "Add Component" to start building the BOM.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={handleCancelBOM}>
                Cancel
              </Button>
              <Button onClick={handleCreateBOM} disabled={!newBOMName.trim() || newBOMItems.length === 0}>
                Create BOM (Draft)
              </Button>
            </div>
          </div>
        )}

        {/* ── Existing BOMs for this part ── */}
        {localBOMs.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium">
              Assembly / Disassembly BOMs
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (this part as output)
              </span>
            </h3>
            <div className="divide-y rounded-lg border">
              {localBOMs.map((bom) => (
                <Link
                  key={bom.id}
                  to={`/wms/bom/${bom.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{bom.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bom.bomNumber} · v{bom.version} · {bom.items.length} components
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={bom.type === 'ASSEMBLY' ? 'info' : 'warning'}>
                      {bom.type === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'}
                    </StatusBadge>
                    <StatusBadge variant={bom.status === 'Active' ? 'success' : bom.status === 'Draft' ? 'neutral' : 'neutral'}>
                      {bom.status}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
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
                      {bom.type === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'}
                    </StatusBadge>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state only if nothing at all */}
        {localBOMs.length === 0 && usedInBOMs.length === 0 && !creatingBOM && (
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

  // ── Pricing tab ──
  const partPricing = useMemo(
    () => mockPricing.filter((p) => p.partId === part.id),
    [part.id]
  )

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editPriceValue, setEditPriceValue] = useState('')
  const editPriceRef = useRef<HTMLInputElement>(null)

  const startPriceEdit = useCallback((entryId: string, currentPrice: number) => {
    setEditingPriceId(entryId)
    setEditPriceValue(String(currentPrice))
    setTimeout(() => editPriceRef.current?.focus(), 0)
  }, [])

  const cancelPriceEdit = useCallback(() => {
    setEditingPriceId(null)
    setEditPriceValue('')
  }, [])

  const [localPricing, setLocalPricing] = useState(partPricing)
  const [localPriceHistory, setLocalPriceHistory] = useState(mockPriceHistory)

  const savePriceEdit = useCallback(
    (entryId: string) => {
      const newPrice = parseInt(editPriceValue, 10)
      if (isNaN(newPrice) || newPrice < 0) {
        cancelPriceEdit()
        return
      }
      setLocalPricing((prev) =>
        prev.map((p) => {
          if (p.id !== entryId || p.sellPrice === newPrice) return p
          const historyEntry = {
            id: `ph-${Date.now()}`,
            priceEntryId: entryId,
            oldPrice: p.sellPrice,
            newPrice,
            changedBy: 'Current User',
            changedAt: new Date().toISOString(),
            notes: 'Manual price update',
          }
          setLocalPriceHistory((h) => [historyEntry, ...h])
          toast.success('Price updated')
          return { ...p, sellPrice: newPrice, updatedBy: 'Current User', updatedAt: new Date().toISOString() }
        })
      )
      setEditingPriceId(null)
      setEditPriceValue('')
    },
    [editPriceValue, cancelPriceEdit]
  )

  // Group pricing by variant
  const newPrices = useMemo(() => localPricing.filter((p) => p.variant === 'new'), [localPricing])
  const refurbishedPrices = useMemo(() => localPricing.filter((p) => p.variant === 'refurbished'), [localPricing])

  // All price history for this part's entries
  const partPriceHistory = useMemo(
    () => {
      const entryIds = new Set(localPricing.map((p) => p.id))
      return localPriceHistory
        .filter((h) => entryIds.has(h.priceEntryId))
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    },
    [localPricing, localPriceHistory]
  )

  const pricingTab = {
    id: 'pricing',
    label: 'Pricing',
    count: localPricing.length,
    content: (
      <div className="space-y-4">
        {localPricing.length > 0 ? (
          <>
            {/* New variant card */}
            {newPrices.length > 0 && (
              <PricingVariantCard
                variantLabel="New"
                variantBadge="success"
                entries={newPrices}
                editingId={editingPriceId}
                editValue={editPriceValue}
                editRef={editPriceRef}
                onStartEdit={startPriceEdit}
                onEditChange={setEditPriceValue}
                onSave={savePriceEdit}
                onCancel={cancelPriceEdit}
              />
            )}

            {/* Refurbished variant card */}
            {refurbishedPrices.length > 0 && (
              <PricingVariantCard
                variantLabel="Refurbished"
                variantBadge="info"
                entries={refurbishedPrices}
                editingId={editingPriceId}
                editValue={editPriceValue}
                editRef={editPriceRef}
                onStartEdit={startPriceEdit}
                onEditChange={setEditPriceValue}
                onSave={savePriceEdit}
                onCancel={cancelPriceEdit}
              />
            )}

            {/* Price Change History */}
            {partPriceHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Price Change History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {partPriceHistory.map((h) => {
                      const entry = localPricing.find((p) => p.id === h.priceEntryId)
                      return (
                        <div key={h.id} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="mt-1 size-2.5 rounded-full bg-primary" />
                            <div className="w-px flex-1 bg-border" />
                          </div>
                          <div className="flex-1 pb-3">
                            <p className="text-sm">
                              <span className="font-medium tabular-nums">
                                {currencyFmt.format(h.oldPrice)}
                              </span>
                              <span className="text-muted-foreground"> &rarr; </span>
                              <span className="font-medium tabular-nums">
                                {currencyFmt.format(h.newPrice)}
                              </span>
                              {entry && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({entry.variant === 'new' ? 'New' : 'Refurbished'}
                                  {entry.tag ? ` / ${entry.tag}` : ' / Base'})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {h.changedBy} &middot; {formatDate(h.changedAt)}
                              {h.notes && ` &middot; ${h.notes}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <DollarSign className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No pricing defined</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pricing entries for this part will appear here
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
          <Button variant="outline" render={<Link to={`/ims/parts/${part.id}/edit`} />}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Tabs */}
        <DetailTabs tabs={[overviewTab, relatedPartsTab, bomsTab, inventoryTab, pricingTab, checklistsTab, historyTab]} />

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

          {/* Part Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Part Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
                <span className="text-muted-foreground">Reorder Level</span>
                <span className="font-medium">{part.reorderLevel}</span>
              </div>
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

          {/* Stock Summary card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New</span>
                <span className="font-medium">{stockSummary.new} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refurbished</span>
                <span className="font-medium">{stockSummary.refurbished} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Pool</span>
                <span className="font-medium">{stockSummary.newPool} units</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total</span>
                <span className="font-semibold">{stockSummary.total} units</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Pricing Variant Card component (like StockItemDetailPage's VariantCard) ──

interface PricingVariantCardProps {
  variantLabel: string
  variantBadge: 'success' | 'info' | 'warning'
  entries: import('../data/pricing').PriceEntry[]
  editingId: string | null
  editValue: string
  editRef: React.RefObject<HTMLInputElement | null>
  onStartEdit: (entryId: string, currentPrice: number) => void
  onEditChange: (v: string) => void
  onSave: (entryId: string) => void
  onCancel: () => void
}

function PricingVariantCard({
  variantLabel,
  variantBadge,
  entries,
  editingId,
  editValue,
  editRef,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
}: PricingVariantCardProps) {
  const baseEntry = entries.find((e) => e.tag === null)
  const tagEntries = entries.filter((e) => e.tag !== null)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge variant={variantBadge}>{variantLabel}</StatusBadge>
          {baseEntry && (
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-muted-foreground">Base Price:</span>
              {editingId === baseEntry.id ? (
                <input
                  ref={editRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => onEditChange(e.target.value)}
                  onBlur={() => onSave(baseEntry.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave(baseEntry.id)
                    if (e.key === 'Escape') onCancel()
                  }}
                  className="h-7 w-28 rounded border border-input bg-background px-2 text-sm font-medium"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onStartEdit(baseEntry.id, baseEntry.sellPrice)}
                  className="group inline-flex items-center gap-1"
                >
                  <span className="text-lg font-bold">{currencyFmt.format(baseEntry.sellPrice)}</span>
                  <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tagEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Tag</th>
                  <th className="pb-2 pr-4 font-medium text-right">Sell Price</th>
                  <th className="pb-2 pr-4 font-medium">Updated By</th>
                  <th className="pb-2 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {tagEntries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <StatusBadge variant="neutral">{entry.tag}</StatusBadge>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {editingId === entry.id ? (
                        <input
                          ref={editRef}
                          type="number"
                          value={editValue}
                          onChange={(e) => onEditChange(e.target.value)}
                          onBlur={() => onSave(entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave(entry.id)
                            if (e.key === 'Escape') onCancel()
                          }}
                          className="ml-auto h-7 w-28 rounded border border-input bg-background px-2 text-right text-sm font-medium"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartEdit(entry.id, entry.sellPrice)}
                          className="group inline-flex items-center gap-1"
                        >
                          <span className="font-medium tabular-nums">
                            {currencyFmt.format(entry.sellPrice)}
                          </span>
                          <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-4">{entry.updatedBy}</td>
                    <td className="py-2 text-muted-foreground">{formatDate(entry.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tag-specific prices.</p>
        )}
      </CardContent>
    </Card>
  )
}
