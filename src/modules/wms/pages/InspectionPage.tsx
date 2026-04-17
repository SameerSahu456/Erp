import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Check, X, Minus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

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

const INSPECTION_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']

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
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const handleAssignEngineer = (deviceId: string, engineer: string) => {
    setAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  const hasFailures = useMemo(
    () => Object.values(checklist).some((item) => item.result === 'FAIL'),
    [checklist],
  )

  const checkedCount = useMemo(
    () => Object.keys(checklist).length,
    [checklist],
  )

  const passCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'PASS').length,
    [checklist],
  )

  const failCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'FAIL').length,
    [checklist],
  )

  const naCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'NOT_APPLICABLE').length,
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
        assignedTo: assignments[d.id] ?? '',
      })),
    [pendingDevices, assignments],
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
          { key: 'assignedTo', label: 'Assign' },
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
      if (key === 'assignedTo' && row.model !== undefined) {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
            <Select
              value={currentValue || ''}
              onValueChange={(val) => { if (val) handleAssignEngineer(deviceId, val) }}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Assign..." />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_ENGINEERS.map((eng) => (
                  <SelectItem key={eng} value={eng}>
                    {eng}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    setCollapsedGroups({})
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

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
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
            {/* Progress indicator */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {checkedCount}/{INSPECTION_CHECKLIST_ITEMS.length} items checked
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                    Pass: {passCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-destructive" />
                    Fail: {failCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-muted-foreground" />
                    N/A: {naCount}
                  </span>
                </div>
              </div>
              <Progress
                value={
                  INSPECTION_CHECKLIST_ITEMS.length > 0
                    ? Math.round(
                        (checkedCount / INSPECTION_CHECKLIST_ITEMS.length) * 100,
                      )
                    : 0
                }
              >
                <ProgressLabel className="sr-only">Progress</ProgressLabel>
                <ProgressValue className="sr-only" />
              </Progress>
            </div>

            {/* Checklist grouped by category - collapsible sections */}
            {GROUP_ORDER.map((group) => {
              const items = CHECKLIST_GROUPS[group]
              if (!items) return null
              const isCollapsed = collapsedGroups[group] ?? false
              const groupChecked = items.filter((i) => checklist[i.id]).length
              return (
                <Collapsible key={group} open={!isCollapsed}>
                  <CollapsibleTrigger
                    className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">{group}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {groupChecked}/{items.length} checked
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 pt-2">
                      {items.map((item) => {
                        const state = checklist[item.id]
                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border bg-card transition-colors"
                          >
                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{item.label}</p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'PASS'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700'
                                      : 'border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-500'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'PASS')
                                  }
                                >
                                  <Check className="size-3.5" />
                                  Pass
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'FAIL'
                                      ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20'
                                      : 'border-[#f1416c]/30 text-[#f1416c] hover:border-[#f1416c]/60 hover:bg-[#fff5f8] dark:border-[#f1416c]/40 dark:text-[#f1416c]'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'FAIL')
                                  }
                                >
                                  <X className="size-3.5" />
                                  Fail
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'NOT_APPLICABLE'
                                      ? 'border-muted-foreground/50 bg-muted text-muted-foreground'
                                      : 'text-muted-foreground hover:bg-muted'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'NOT_APPLICABLE')
                                  }
                                >
                                  <Minus className="size-3.5" />
                                  N/A
                                </Button>
                              </div>
                            </div>
                            {state?.result === 'FAIL' && (
                              <div className="border-t px-4 py-2.5">
                                <Input
                                  placeholder="Describe the issue..."
                                  value={state.notes}
                                  onChange={(e) =>
                                    handleChecklistNotes(item.id, e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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

            {/* Summary before submit */}
            {checkedCount > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{passCount}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">{failCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-muted-foreground">{naCount}</p>
                    <p className="text-xs text-muted-foreground">N/A</p>
                  </div>
                </div>
                {failCount > 0 && (
                  <div className="mt-3 rounded border border-[#f6c000]/30 bg-[#fff8dd] p-2 text-xs text-[#b88800] dark:border-[#f6c000]/40 dark:bg-[#b88800]/15 dark:text-[#f6c000]">
                    {failCount} item{failCount > 1 ? 's' : ''} failed - review inspection flags below
                  </div>
                )}
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

export default InspectionPage
