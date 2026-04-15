import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, ImageOff, Mail } from 'lucide-react'
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
import { mockChecklistTemplates } from '@/modules/wms/data/checklist-templates'
import type { Part } from '@/modules/wms/types'

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
        <DetailTabs tabs={[overviewTab, inventoryTab, checklistsTab, historyTab]} />

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
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-xs font-medium">{part.sku}</span>
              </div>
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
