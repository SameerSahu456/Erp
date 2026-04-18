import { useState, useMemo } from 'react'
import { MapPin, User, Users } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

import { mockWarehouses } from '../data/warehouses'
import type { Warehouse, WarehouseRack } from '../types'

function WarehouseInfoCard({ warehouse }: { warehouse: Warehouse }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium">{warehouse.address}</p>
              <p className="text-xs text-muted-foreground">{warehouse.city}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-sm font-medium text-muted-foreground">Code</span>
            <div>
              <p className="text-sm font-mono font-semibold">{warehouse.code}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Manager</p>
              <p className="text-sm font-medium">{warehouse.manager}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Store Team</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {warehouse.storeTeam.map((member) => (
                  <span
                    key={member}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                  >
                    {member}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RackCard({
  rack,
  expanded,
  onToggle,
}: {
  rack: WarehouseRack
  expanded: boolean
  onToggle: () => void
}) {
  const capacityColor =
    rack.capacityUsed >= 90
      ? 'text-destructive'
      : rack.capacityUsed >= 60
        ? 'text-[#f6c000]'
        : 'text-emerald-600'

  return (
    <div className="min-w-[180px]">
      <button
        onClick={onToggle}
        className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{rack.name}</span>
          <span className={`text-xs font-medium ${capacityColor}`}>
            {rack.capacityUsed}%
          </span>
        </div>
        <Progress value={rack.capacityUsed}>
          <ProgressLabel className="text-xs">Capacity</ProgressLabel>
          <ProgressValue className="text-xs" />
        </Progress>
        <p className="mt-1 text-xs text-muted-foreground">
          {rack.bins.length} bins
        </p>
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 px-1">
          {rack.bins.map((bin) => {
            const bgColor =
              bin.status === 'Empty'
                ? 'bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800'
                : bin.status === 'Full'
                  ? 'bg-[#fff5f8] border-[#f1416c]/40 dark:bg-[#991930]/15 dark:border-[#f1416c]/40'
                  : 'bg-[#fff8dd] border-[#f6c000]/40 dark:bg-[#b88800]/15 dark:border-[#f6c000]/40'
            return (
              <div
                key={bin.id}
                className={`rounded border p-1.5 text-center ${bgColor}`}
                title={`${bin.name}: ${bin.itemCount}/${bin.maxItems} items (${bin.status})`}
              >
                <p className="text-[10px] font-medium">{bin.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {bin.itemCount}/{bin.maxItems}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WarehouseTab({ warehouse }: { warehouse: Warehouse }) {
  const [expandedRack, setExpandedRack] = useState<string | null>(null)

  const summary = useMemo(() => {
    let totalBins = 0
    let totalItems = 0
    let totalCapacity = 0
    for (const row of warehouse.rows) {
      for (const rack of row.racks) {
        for (const bin of rack.bins) {
          totalBins++
          totalItems += bin.itemCount
          totalCapacity += bin.maxItems
        }
      }
    }
    const usedPercent = totalCapacity > 0 ? Math.round((totalItems / totalCapacity) * 100) : 0
    const emptyBins = warehouse.rows.reduce(
      (acc, row) =>
        acc +
        row.racks.reduce(
          (rAcc, rack) => rAcc + rack.bins.filter((b) => b.status === 'Empty').length,
          0,
        ),
      0,
    )
    return { totalBins, totalItems, totalCapacity, usedPercent, emptyBins }
  }, [warehouse])

  return (
    <div className="space-y-4">
      <WarehouseInfoCard warehouse={warehouse} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{summary.totalBins}</p>
            <p className="text-xs text-muted-foreground">Total Bins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{summary.usedPercent}%</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{summary.emptyBins}</p>
            <p className="text-xs text-muted-foreground">Empty Bins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{summary.totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Rows and Racks */}
      {warehouse.rows.map((row) => (
        <div key={row.id} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{row.name}</h3>
          <div className="flex flex-wrap gap-3">
            {row.racks.map((rack) => (
              <RackCard
                key={rack.id}
                rack={rack}
                expanded={expandedRack === rack.id}
                onToggle={() =>
                  setExpandedRack((prev) => (prev === rack.id ? null : rack.id))
                }
              />
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-emerald-100 border border-emerald-300" />
          Empty
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-[#fff8dd] border border-[#f6c000]/40" />
          Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-[#fff5f8] border border-[#f1416c]/40" />
          Full
        </span>
      </div>
    </div>
  )
}

function WarehouseLocationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="cpt-page-title">
        Warehouse Locations
      </h1>

      <Tabs defaultValue={mockWarehouses[0]?.id ?? 'wh-001'}>
        <TabsList>
          {mockWarehouses.map((wh) => (
            <TabsTrigger key={wh.id} value={wh.id}>
              {wh.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {mockWarehouses.map((wh) => (
          <TabsContent key={wh.id} value={wh.id}>
            <WarehouseTab warehouse={wh} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default WarehouseLocationsPage
