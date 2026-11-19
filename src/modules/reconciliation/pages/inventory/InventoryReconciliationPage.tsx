import { useState } from 'react'
import { Package, AlertTriangle, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/display/StatsRow'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { PageHeader } from '@/components/page-shells'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { INVENTORY_RECONCILIATION_STRINGS as S } from "./inventory-reconciliation.strings"

interface InventoryItem {
  id: string
  item: string
  category: string
  systemQty: number
  physicalQty: number
}

const initialItems: InventoryItem[] = [
  { id: 'INV-R-001', item: 'Dell PowerEdge R750', category: 'Servers', systemQty: 35, physicalQty: 35 },
  { id: 'INV-R-002', item: 'HP EliteBook 860 G10', category: 'Laptops', systemQty: 200, physicalQty: 198 },
  { id: 'INV-R-003', item: 'Cisco Catalyst 9300-48P', category: 'Networking', systemQty: 10, physicalQty: 10 },
  { id: 'INV-R-004', item: 'Lenovo ThinkStation P360', category: 'Workstations', systemQty: 15, physicalQty: 15 },
  { id: 'INV-R-005', item: 'Palo Alto PA-5250', category: 'Security', systemQty: 4, physicalQty: 4 },
  { id: 'INV-R-006', item: 'D-Link DBA-2820P', category: 'Networking', systemQty: 30, physicalQty: 28 },
  { id: 'INV-R-007', item: 'APC Smart-UPS 3000VA', category: 'Power', systemQty: 25, physicalQty: 25 },
  { id: 'INV-R-008', item: 'APC Smart-UPS 5000VA', category: 'Power', systemQty: 10, physicalQty: 10 },
  { id: 'INV-R-009', item: 'APC NetShelter SX 42U', category: 'Infrastructure', systemQty: 5, physicalQty: 4 },
  { id: 'INV-R-010', item: 'Synology RS3621xs+', category: 'Storage', systemQty: 2, physicalQty: 2 },
  { id: 'INV-R-011', item: 'FortiGate 200F', category: 'Security', systemQty: 10, physicalQty: 10 },
  { id: 'INV-R-012', item: 'HP USB-C Dock G5', category: 'Peripherals', systemQty: 200, physicalQty: 197 },
]

function InventoryReconciliationPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)

  function updatePhysicalQty(id: string, value: number) {
    setItems(items.map((item) => (item.id === id ? { ...item, physicalQty: value } : item)))
  }

  const totalItems = items.length
  const matchedItems = items.filter((i) => i.systemQty === i.physicalQty).length
  const varianceItems = items.filter((i) => i.systemQty !== i.physicalQty)
  const totalVariance = items.reduce((sum, i) => sum + Math.abs(i.systemQty - i.physicalQty), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[{ label: S.page.breadcrumbs.reconciliation }, { label: S.page.breadcrumbs.inventory }]}
        actions={
          <Button disabled={varianceItems.length === 0}>{S.page.actions.submitAdjustment}</Button>
        }
      />

      <StatsRow
        stats={[
          { label: S.stats.totalItems, value: totalItems, icon: Package },
          { label: S.stats.matched, value: matchedItems, icon: Package },
          { label: S.stats.variances, value: varianceItems.length, icon: AlertTriangle },
          { label: S.stats.totalVarianceUnits, value: totalVariance, icon: AlertTriangle },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{S.table.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{S.table.columns.item}</TableHead>
                  <TableHead>{S.table.columns.category}</TableHead>
                  <TableHead className="text-right">{S.table.columns.systemQty}</TableHead>
                  <TableHead className="text-right">{S.table.columns.physicalQty}</TableHead>
                  <TableHead className="text-right">{S.table.columns.variance}</TableHead>
                  <TableHead>{S.table.columns.action}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={Inbox}
                        title={S.table.empty.title}
                        description={S.table.empty.description}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const variance = item.physicalQty - item.systemQty
                  const hasVariance = variance !== 0
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.systemQty}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-right ml-auto"
                          value={item.physicalQty}
                          onChange={(e) => updatePhysicalQty(item.id, Number(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          hasVariance && 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </TableCell>
                      <TableCell>
                        {hasVariance ? (
                          <StatusBadge variant="error">{S.table.statusBadge.investigate}</StatusBadge>
                        ) : (
                          <StatusBadge variant="success">{S.table.statusBadge.ok}</StatusBadge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InventoryReconciliationPage
