import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import {
  ArrowLeft,
  Package,
  Layers,
  Clock,
  IndianRupee,
  Repeat,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'
import { mockBOMs } from '../data/boms'
import { mockParts } from '@/modules/ims/data/parts'
import type { BOMStatus } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount?: number) {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const STATUS_VARIANT: Record<BOMStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  Draft: 'neutral',
  Active: 'success',
  Revision: 'warning',
  Obsolete: 'error',
}

function BOMDetailPage() {
  const { id } = useParams<{ id: string }>()
  const goBack = useNavigateBack('/wms/bom')

  const bom = useMemo(() => mockBOMs.find((b) => b.id === id), [id])

  if (!bom) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">BOM not found</p>
        <Button variant="ghost" className="mt-4" onClick={goBack}>
          Back to BOMs
        </Button>
      </div>
    )
  }

  const parentPart = mockParts.find((p) => p.id === bom.parentPartId)
  const requiredItems = bom.items.filter((i) => !i.isOptional)
  const optionalItems = bom.items.filter((i) => i.isOptional)
  const substitutableItems = bom.items.filter((i) => i.allowSubstitution)
  const totalComponents = bom.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={bom.name}
        subtitle={`${bom.bomNumber} · Version ${bom.version}`}
        status={{ label: bom.status, variant: STATUS_VARIANT[bom.status] }}
        badges={
          <StatusBadge variant={bom.type === 'ASSEMBLY' ? 'info' : 'warning'}>
            {bom.type === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'}
          </StatusBadge>
        }
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'BOM', href: '/wms/bom' },
          { label: bom.name },
        ]}
        backHref="/wms/bom"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="size-4" />
            Line Items
          </div>
          <p className="mt-1 text-2xl font-semibold">{bom.items.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="size-4" />
            Total Components
          </div>
          <p className="mt-1 text-2xl font-semibold">{totalComponents}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Est. Time
          </div>
          <p className="mt-1 text-2xl font-semibold">
            {bom.estimatedAssemblyTime ? `${bom.estimatedAssemblyTime} min` : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IndianRupee className="size-4" />
            Est. Cost
          </div>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(bom.estimatedCost)}</p>
        </div>
      </div>

      {/* Parent Product */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">
            {bom.type === 'ASSEMBLY' ? 'Output Product' : 'Source Product'}
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Settings className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{bom.parentPartName}</p>
              <p className="text-sm text-muted-foreground">
                Part no: {bom.parentPartSku}
                {parentPart && ` · ${parentPart.brand} · ${parentPart.categoryName}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Component List */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">
            {bom.type === 'ASSEMBLY' ? 'Components Required' : 'Components Recovered'}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({requiredItems.length} required, {optionalItems.length} optional, {substitutableItems.length} substitutable)
            </span>
          </h2>
        </div>
        <div className="divide-y">
          {bom.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{item.partName}</p>
                  {item.isOptional && (
                    <StatusBadge variant="neutral">Optional</StatusBadge>
                  )}
                  {item.allowSubstitution && (
                    <StatusBadge variant="info">
                      <Repeat className="size-3 mr-1" />
                      Substitutable
                    </StatusBadge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Part no: {item.partSku}
                  {item.position && ` · Position: ${item.position}`}
                </p>
                {item.notes && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{item.notes}</p>
                )}
                {item.substitutePartIds && item.substitutePartIds.length > 0 && (
                  <p className="mt-1 text-xs text-[#1379f0]">
                    {item.substitutePartIds.length} substitute(s) available
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold">{item.quantity}</p>
                <p className="text-xs text-muted-foreground">{item.unitOfMeasure}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created By</dt>
              <dd>{bom.createdBy}</dd>
            </div>
            {bom.approvedBy && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved By</dt>
                <dd className="flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-[#50cd89]" />
                  {bom.approvedBy}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(bom.createdAt)}</dd>
            </div>
            {bom.updatedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd>{formatDate(bom.updatedAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        {bom.notes && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">{bom.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export { BOMDetailPage }
export default BOMDetailPage
