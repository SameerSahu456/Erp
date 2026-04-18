import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { WorkflowStepper, type StepConfig } from '@/components/common/WorkflowStepper'
import { mockRentalReturns } from '../data/returns'
import { RENTAL_RETURN_WORKFLOW } from '../types'
import type { RentalReturn, RentalReturnDevice } from '../types'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

type ReturnStatus = RentalReturn['status']

const STATUS_VARIANT: Record<ReturnStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Initiated: 'info',
  'Devices Received': 'warning',
  Inspection: 'warning',
  'Damage Assessment': 'warning',
  'Stock Updated': 'success',
  Closed: 'neutral',
}

// Map return status to workflow step index
function getActiveStepIndex(status: ReturnStatus): number {
  switch (status) {
    case 'Initiated': return 0
    case 'Devices Received': return 1
    case 'Inspection': return 2
    case 'Damage Assessment': return 3
    case 'Stock Updated': return 4
    case 'Closed': return 5
    default: return 0
  }
}

function buildWorkflowSteps(status: ReturnStatus): StepConfig[] {
  const activeIdx = getActiveStepIndex(status)
  return RENTAL_RETURN_WORKFLOW.map((stage, idx) => ({
    id: stage.id,
    label: stage.label,
    status:
      idx < activeIdx
        ? 'completed'
        : idx === activeIdx
          ? status === 'Closed'
            ? 'completed'
            : 'active'
          : 'pending',
  }))
}

function returnToRow(r: RentalReturn) {
  return {
    id: r.id,
    returnNumber: r.returnNumber,
    contractNumber: r.contractNumber,
    customerName: r.customerName,
    deviceCount: r.devices.length,
    status: r.status,
    createdAt: r.createdAt,
  }
}

const columns = [
  { key: 'returnNumber', label: 'Return #', sortable: true },
  { key: 'contractNumber', label: 'Contract #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'deviceCount', label: 'Devices', sortable: true, align: 'center' as const },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Initiated', sortable: true },
  { key: 'actions', label: 'Actions' },
]

export default function RentalReturnsPage() {
  const [returns, setReturns] = useState(mockRentalReturns)
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null)

  // Device-level editable state for selected return
  const [deviceEdits, setDeviceEdits] = useState<
    Record<string, {
      conditionAtReturn: RentalReturnDevice['conditionAtReturn']
      inspectionResult?: 'Pass' | 'Fail'
      action: RentalReturnDevice['action']
      damageNotes: string
    }>
  >({})

  const selectedReturn = returns.find((r) => r.id === selectedReturnId)

  // Initialize device edits when selecting a return
  function selectReturn(returnId: string) {
    setSelectedReturnId(returnId)
    const ret = returns.find((r) => r.id === returnId)
    if (ret) {
      const edits: typeof deviceEdits = {}
      for (const d of ret.devices) {
        edits[d.deviceId] = {
          conditionAtReturn: d.conditionAtReturn,
          inspectionResult: d.inspectionResult,
          action: d.action,
          damageNotes: d.damageNotes ?? '',
        }
      }
      setDeviceEdits(edits)
    }
  }

  function updateDeviceEdit(
    deviceId: string,
    field: keyof (typeof deviceEdits)[string],
    value: string,
  ) {
    setDeviceEdits((prev) => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId]!,
        [field]: value,
      },
    }))
  }

  // Transition status
  function transitionStatus(returnId: string, newStatus: ReturnStatus) {
    setReturns((prev) =>
      prev.map((r) => (r.id === returnId ? { ...r, status: newStatus } : r)),
    )
    toast.success(`Return status updated to "${newStatus}"`)
  }

  const allRows = useMemo(() => returns.map(returnToRow), [returns])

  const tabs: TabConfig[] = useMemo(() => [
    {
      id: 'active',
      label: `Active (${allRows.filter((r) => r.status !== 'Closed').length})`,
      columns,
      data: allRows.filter((r) => r.status !== 'Closed'),
    },
    {
      id: 'completed',
      label: `Completed (${allRows.filter((r) => r.status === 'Closed').length})`,
      columns,
      data: allRows.filter((r) => r.status === 'Closed'),
    },
    {
      id: 'all',
      label: `All (${allRows.length})`,
      columns,
      data: allRows,
    },
  ], [allRows])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'returnNumber') {
      const id = row['id'] as string
      return {
        display: (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => selectReturn(id)}
          >
            {value as string}
          </button>
        ),
      }
    }

    if (key === 'contractNumber') {
      return {
        display: (
          <span className="text-muted-foreground">{value as string}</span>
        ),
      }
    }

    if (key === 'status') {
      const s = value as ReturnStatus
      return {
        display: <StatusBadge variant={STATUS_VARIANT[s]}>{s}</StatusBadge>,
      }
    }

    if (key === 'actions') {
      const id = row['id'] as string
      return {
        display: (
          <Button variant="ghost" size="sm" onClick={() => selectReturn(id)}>
            View
          </Button>
        ),
      }
    }

    return null
  }

  // Deposit calculation for selected return
  const depositCalc = useMemo(() => {
    if (!selectedReturn) return { original: 0, deductions: 0, refund: 0 }
    const original = selectedReturn.depositRefund != null && selectedReturn.depositDeduction != null
      ? selectedReturn.depositRefund + selectedReturn.depositDeduction
      : selectedReturn.depositRefund ?? 0
    const deductions = selectedReturn.depositDeduction ?? 0
    return { original, deductions, refund: original - deductions }
  }, [selectedReturn])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Rental Returns
        </h1>
        <Button onClick={() => toast.info('Initiate Return dialog would open')}>
          <Plus className="mr-2 size-4" />
          Initiate Return
        </Button>
      </div>

      {/* Workflow stepper for selected return */}
      {selectedReturn && (
        <Card>
          <CardContent className="pt-4">
            <WorkflowStepper steps={buildWorkflowSteps(selectedReturn.status)} />
          </CardContent>
        </Card>
      )}

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />

      {/* Detail panel for selected return */}
      {selectedReturn && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedReturn.returnNumber} — {selectedReturn.customerName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Device list */}
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Condition (Dispatch)</TableHead>
                      <TableHead>Condition (Return)</TableHead>
                      <TableHead>Inspection</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Damage Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.devices.map((d) => {
                      const edit = deviceEdits[d.deviceId]
                      return (
                        <TableRow key={d.deviceId}>
                          <TableCell className="font-medium">{d.barcode}</TableCell>
                          <TableCell>{d.model}</TableCell>
                          <TableCell>{d.conditionAtDispatch}</TableCell>
                          <TableCell>
                            <Select
                              value={edit?.conditionAtReturn ?? d.conditionAtReturn}
                              onValueChange={(v) =>
                                updateDeviceEdit(d.deviceId, 'conditionAtReturn', v as string)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Damaged">Damaged</SelectItem>
                                <SelectItem value="Missing Parts">Missing Parts</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={edit?.inspectionResult ?? d.inspectionResult ?? ''}
                              onValueChange={(v) =>
                                updateDeviceEdit(d.deviceId, 'inspectionResult', v as string)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pass">Pass</SelectItem>
                                <SelectItem value="Fail">Fail</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={edit?.action ?? d.action}
                              onValueChange={(v) =>
                                updateDeviceEdit(d.deviceId, 'action', v as string)
                              }
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Restock">Restock</SelectItem>
                                <SelectItem value="Repair">Repair</SelectItem>
                                <SelectItem value="Scrap">Scrap</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={edit?.damageNotes ?? d.damageNotes ?? ''}
                              onChange={(e) =>
                                updateDeviceEdit(d.deviceId, 'damageNotes', e.target.value)
                              }
                              placeholder="Notes..."
                              className="w-48"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Deposit Calculation */}
              <div className="flex gap-6 rounded-lg border bg-muted/50 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Original Deposit:</span>{' '}
                  <span className="font-semibold">{formatCurrency(depositCalc.original)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Deductions:</span>{' '}
                  <span className={`font-semibold ${depositCalc.deductions > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(depositCalc.deductions)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Refund Amount:</span>{' '}
                  <span className="font-semibold text-status-success-text">
                    {formatCurrency(depositCalc.refund)}
                  </span>
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="flex items-center justify-end gap-3">
                {selectedReturn.status === 'Initiated' && (
                  <Button
                    onClick={() =>
                      transitionStatus(selectedReturn.id, 'Devices Received')
                    }
                  >
                    Mark Devices Received
                  </Button>
                )}
                {selectedReturn.status === 'Devices Received' && (
                  <Button
                    onClick={() =>
                      transitionStatus(selectedReturn.id, 'Inspection')
                    }
                  >
                    Start Inspection
                  </Button>
                )}
                {selectedReturn.status === 'Inspection' && (
                  <Button
                    onClick={() =>
                      transitionStatus(selectedReturn.id, 'Damage Assessment')
                    }
                  >
                    Complete Assessment
                  </Button>
                )}
                {selectedReturn.status === 'Damage Assessment' && (
                  <Button
                    onClick={() =>
                      transitionStatus(selectedReturn.id, 'Stock Updated')
                    }
                  >
                    Update Stock
                  </Button>
                )}
                {selectedReturn.status === 'Stock Updated' && (
                  <Button
                    onClick={() =>
                      transitionStatus(selectedReturn.id, 'Closed')
                    }
                  >
                    Close Return
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
