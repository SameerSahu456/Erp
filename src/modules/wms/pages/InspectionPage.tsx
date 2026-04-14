import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import { mockDevices } from '../data/devices'
import { mockInspections } from '../data/inspections'
import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type InspectionResult,
  type RepairType,
  type PaintPanelType,
} from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Group checklist items by their group field
const CHECKLIST_GROUPS = INSPECTION_CHECKLIST_ITEMS.reduce<
  Record<string, typeof INSPECTION_CHECKLIST_ITEMS[number][]>
>((acc, item) => {
  const group = item.group
  if (!acc[group]) acc[group] = []
  acc[group].push(item)
  return acc
}, {})

const GROUP_ORDER = ['Panels', 'Display', 'Input', 'Audio', 'Power', 'Hardware', 'Ports']

type ChecklistState = Record<string, { result: InspectionResult; notes: string }>

function InspectionPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [requiresRepair, setRequiresRepair] = useState(false)
  const [requiresPaint, setRequiresPaint] = useState(false)
  const [requiresSpares, setRequiresSpares] = useState(false)
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])
  const [paintPanels, setPaintPanels] = useState<PaintPanelType[]>([])
  const [spareParts, setSpareParts] = useState('')
  const [overallNotes, setOverallNotes] = useState('')

  const hasFailures = useMemo(
    () => Object.values(checklist).some((item) => item.result === 'FAIL'),
    [checklist],
  )

  const pendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'PENDING_INSPECTION'),
    [],
  )

  const completedDevices = useMemo(() => {
    const statusOrder: Device['status'][] = [
      'INSPECTED',
      'WAITING_FOR_SPARES',
      'READY_FOR_REPAIR',
      'UNDER_REPAIR',
      'IN_L3_REPAIR',
      'IN_DISPLAY_REPAIR',
      'IN_BATTERY_BOOST',
      'IN_PAINT_SHOP',
      'AWAITING_QC',
      'UNDER_QC',
      'READY_FOR_STOCK',
      'IN_STOCK',
      'AWAITING_OUTWARD_QC',
      'UNDER_OUTWARD_QC',
      'READY_FOR_DISPATCH',
      'DISPATCHED',
      'SCRAPPED',
    ]
    return mockDevices.filter((d) => statusOrder.includes(d.status))
  }, [])

  const pendingRows = useMemo(
    () =>
      pendingDevices.map((d) => ({
        id: d.id,
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        batch: d.batchNumber,
        receivedDate: formatDate(d.receivedAt),
      })),
    [pendingDevices],
  )

  const completedRows = useMemo(
    () =>
      completedDevices.map((d) => {
        const insp = mockInspections.find((i) => i.deviceId === d.id)
        return {
          id: d.id,
          barcode: d.barcode,
          model: d.model,
          result: insp
            ? insp.checklist.every((c) => c.result !== 'FAIL')
              ? 'All Pass'
              : 'Has Failures'
            : '-',
          repair: d.requiresRepair ? 'Yes' : 'No',
          paint: d.requiresPaint ? 'Yes' : 'No',
          spares: d.requiresSpares ? 'Yes' : 'No',
          date: d.inspectedAt ? formatDate(d.inspectedAt) : '-',
        }
      }),
    [completedDevices],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'batch', label: 'Batch' },
          { key: 'receivedDate', label: 'Received Date', sortable: true },
        ],
        data: pendingRows,
      },
      {
        id: 'completed',
        label: `Completed (${completedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'repair', label: 'Repair' },
          { key: 'paint', label: 'Paint' },
          { key: 'spares', label: 'Spares' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: completedRows,
      },
    ],
    [pendingRows, completedRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: (
            <button
              className="text-primary underline-offset-4 hover:underline font-medium"
              onClick={() => {
                const device = mockDevices.find((d) => d.id === row.id)
                if (device) handleSelectDevice(device)
              }}
            >
              {String(value)}
            </button>
          ),
        }
      }
      if (key === 'result') {
        const variant = value === 'All Pass' ? 'success' : 'warning'
        return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> }
      }
      if ((key === 'repair' || key === 'paint' || key === 'spares') && value === 'Yes') {
        return { display: <StatusBadge variant="warning">Yes</StatusBadge> }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device)
    setChecklist({})
    setRequiresRepair(false)
    setRequiresPaint(false)
    setRequiresSpares(false)
    setRepairTypes([])
    setPaintPanels([])
    setSpareParts('')
    setOverallNotes('')
  }

  const handleChecklistChange = (itemId: string, result: InspectionResult) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { result, notes: prev[itemId]?.notes ?? '' },
    }))
  }

  const handleChecklistNotes = (itemId: string, notes: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result: prev[itemId]?.result ?? 'FAIL', notes },
    }))
  }

  const toggleRepairType = (type: RepairType) => {
    setRepairTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  const togglePaintPanel = (panel: PaintPanelType) => {
    setPaintPanels((prev) =>
      prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel],
    )
  }

  const handleSubmit = () => {
    const filledCount = Object.keys(checklist).length
    if (filledCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items before submitting.')
      return
    }
    toast.success(`Inspection completed for ${selectedDevice?.barcode}`)
    setSelectedDevice(null)
    setChecklist({})
    setRequiresRepair(false)
    setRequiresPaint(false)
    setRequiresSpares(false)
    setRepairTypes([])
    setPaintPanels([])
    setSpareParts('')
    setOverallNotes('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Inspection</h1>
        <p className="text-sm text-muted-foreground">
          Process device inspections and flag issues for repair, paint, or spares.
        </p>
      </div>

      {/* Section A: Device Queue */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />

      {/* Section B: Inspection Form */}
      {selectedDevice && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Inspecting: {selectedDevice.barcode}</CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Model:</span>{' '}
                {selectedDevice.model}
              </span>
              <span>
                <span className="font-medium text-foreground">Brand:</span>{' '}
                {selectedDevice.brand}
              </span>
              <span>
                <span className="font-medium text-foreground">Serial:</span>{' '}
                {selectedDevice.serialNumber}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Checklist grouped by category */}
            {GROUP_ORDER.map((group) => {
              const items = CHECKLIST_GROUPS[group]
              if (!items) return null
              return (
                <div key={group} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const state = checklist[item.id]
                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center gap-4">
                            <span className="min-w-[200px] text-sm">{item.label}</span>
                            <div className="flex gap-1">
                              {(['PASS', 'FAIL', 'NOT_APPLICABLE'] as InspectionResult[]).map(
                                (result) => {
                                  const label =
                                    result === 'PASS'
                                      ? 'Pass'
                                      : result === 'FAIL'
                                        ? 'Fail'
                                        : 'N/A'
                                  const isActive = state?.result === result
                                  return (
                                    <Button
                                      key={result}
                                      size="xs"
                                      variant={isActive ? 'default' : 'outline'}
                                      className={
                                        isActive && result === 'FAIL'
                                          ? 'bg-destructive text-white hover:bg-destructive/90'
                                          : isActive && result === 'PASS'
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : ''
                                      }
                                      onClick={() => handleChecklistChange(item.id, result)}
                                    >
                                      {label}
                                    </Button>
                                  )
                                },
                              )}
                            </div>
                          </div>
                          {state?.result === 'FAIL' && (
                            <Input
                              placeholder="Notes for this failure..."
                              value={state.notes}
                              onChange={(e) =>
                                handleChecklistNotes(item.id, e.target.value)
                              }
                              className="ml-[200px] max-w-md"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Conditional flags */}
            {hasFailures && (
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Inspection Flags
                </h3>

                {/* Requires Repair */}
                <div className="space-y-2">
                  <Label className="cursor-pointer">
                    <Checkbox
                      checked={requiresRepair}
                      onCheckedChange={(val) => {
                        setRequiresRepair(val as boolean)
                        if (!val) setRepairTypes([])
                      }}
                    />
                    Requires Repair
                  </Label>
                  {requiresRepair && (
                    <div className="ml-6 flex flex-wrap gap-3">
                      {(['L2', 'L3', 'DISPLAY', 'BATTERY'] as RepairType[]).map(
                        (type) => (
                          <Label key={type} className="cursor-pointer">
                            <Checkbox
                              checked={repairTypes.includes(type)}
                              onCheckedChange={() => toggleRepairType(type)}
                            />
                            {type === 'L2'
                              ? 'L2 Repair'
                              : type === 'L3'
                                ? 'L3 Repair'
                                : type === 'DISPLAY'
                                  ? 'Display Repair'
                                  : 'Battery Boost'}
                          </Label>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Requires Paint */}
                <div className="space-y-2">
                  <Label className="cursor-pointer">
                    <Checkbox
                      checked={requiresPaint}
                      onCheckedChange={(val) => {
                        setRequiresPaint(val as boolean)
                        if (!val) setPaintPanels([])
                      }}
                    />
                    Requires Paint
                  </Label>
                  {requiresPaint && (
                    <div className="ml-6 flex flex-wrap gap-3">
                      {(['TOP_COVER', 'BOTTOM_COVER'] as PaintPanelType[]).map(
                        (panel) => (
                          <Label key={panel} className="cursor-pointer">
                            <Checkbox
                              checked={paintPanels.includes(panel)}
                              onCheckedChange={() => togglePaintPanel(panel)}
                            />
                            {panel === 'TOP_COVER' ? 'Top Cover' : 'Bottom Cover'}
                          </Label>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Requires Spares */}
                <div className="space-y-2">
                  <Label className="cursor-pointer">
                    <Checkbox
                      checked={requiresSpares}
                      onCheckedChange={(val) => {
                        setRequiresSpares(val as boolean)
                        if (!val) setSpareParts('')
                      }}
                    />
                    Requires Spares
                  </Label>
                  {requiresSpares && (
                    <Input
                      placeholder="List spare parts needed..."
                      value={spareParts}
                      onChange={(e) => setSpareParts(e.target.value)}
                      className="ml-6 max-w-md"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Overall notes */}
            <div className="space-y-2">
              <Label htmlFor="overall-notes">Overall Notes</Label>
              <Textarea
                id="overall-notes"
                placeholder="Additional notes about this inspection..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Complete Inspection</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { InspectionPage }
