import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import { mockDevices } from '../data/devices'
import { mockQCRecords } from '../data/qc-records'
import type { Device, QCRecord } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const FAILURE_REASONS = [
  'Functional Issue',
  'Cosmetic Defect',
  'Missing Parts',
  'Performance Below Standard',
]

function OutwardQCPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [qcResult, setQcResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [failureReasons, setFailureReasons] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const pendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'AWAITING_OUTWARD_QC'),
    [],
  )

  const outwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'OUTWARD'),
    [],
  )

  const pendingRows = useMemo(
    () =>
      pendingDevices.map((d) => ({
        id: d.id,
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        grade: d.grade ?? '-',
        outwardQcFailCount: d.outwardQcFailCount,
        assignedTo: d.assignedTo ?? '-',
      })),
    [pendingDevices],
  )

  const completedRows = useMemo(
    () =>
      outwardQCRecords.map((r) => ({
        id: r.id,
        barcode: r.deviceBarcode,
        result: r.result,
        inspectedBy: r.inspectedBy,
        date: formatDate(r.inspectedAt),
        notes: r.notes ?? '-',
      })),
    [outwardQCRecords],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending QC (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'grade', label: 'Grade' },
          { key: 'outwardQcFailCount', label: 'Fail Count', sortable: true, align: 'center' as const },
          { key: 'assignedTo', label: 'Assigned To' },
        ],
        data: pendingRows,
      },
      {
        id: 'completed',
        label: `Completed (${completedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
          { key: 'notes', label: 'Notes' },
        ],
        data: completedRows,
      },
    ],
    [pendingRows, completedRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode' && row.model !== undefined) {
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
      if (key === 'outwardQcFailCount') {
        const count = value as number
        if (count > 0) {
          return {
            className: 'bg-destructive/10 text-destructive font-medium',
            display: String(count),
          }
        }
      }
      if (key === 'result') {
        const result = value as QCRecord['result']
        const variant = result === 'PASSED' ? 'success' : 'error'
        return {
          display: <StatusBadge variant={variant}>{result === 'PASSED' ? 'Pass' : 'Fail'}</StatusBadge>,
          className: result === 'FAILED' ? 'bg-destructive/10' : undefined,
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device)
    setQcResult(null)
    setFailureReasons([])
    setNotes('')
  }

  const toggleFailureReason = (reason: string) => {
    setFailureReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    )
  }

  const handleSubmit = () => {
    if (!qcResult) {
      toast.error('Please select a QC result.')
      return
    }
    if (qcResult === 'FAILED' && failureReasons.length === 0) {
      toast.error('Please select at least one failure reason.')
      return
    }
    toast.success(
      qcResult === 'PASSED'
        ? `Outward QC passed for ${selectedDevice?.barcode} - Ready for Dispatch`
        : `Outward QC failed for ${selectedDevice?.barcode} - sent back to repair`,
    )
    setSelectedDevice(null)
    setQcResult(null)
    setFailureReasons([])
    setNotes('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Outward QC</h1>
        <p className="text-sm text-muted-foreground">
          Pre-dispatch quality check before devices are shipped out.
        </p>
      </div>

      {/* QC Queue Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />

      {/* QC Form */}
      {selectedDevice && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Outward QC: {selectedDevice.barcode}</CardTitle>
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
              {selectedDevice.grade && (
                <span>
                  <span className="font-medium text-foreground">Grade:</span>{' '}
                  {selectedDevice.grade}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Result Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Result</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={qcResult === 'PASSED' ? 'default' : 'outline'}
                  className={
                    qcResult === 'PASSED'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : ''
                  }
                  onClick={() => {
                    setQcResult('PASSED')
                    setFailureReasons([])
                  }}
                >
                  Pass
                </Button>
                <Button
                  size="sm"
                  variant={qcResult === 'FAILED' ? 'default' : 'outline'}
                  className={
                    qcResult === 'FAILED'
                      ? 'bg-destructive text-white hover:bg-destructive/90'
                      : ''
                  }
                  onClick={() => setQcResult('FAILED')}
                >
                  Fail
                </Button>
              </div>
            </div>

            {/* Fail: Failure reasons + notes */}
            {qcResult === 'FAILED' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Failure Reasons</Label>
                  <div className="space-y-2">
                    {FAILURE_REASONS.map((reason) => (
                      <Label key={reason} className="cursor-pointer">
                        <Checkbox
                          checked={failureReasons.includes(reason)}
                          onCheckedChange={() => toggleFailureReason(reason)}
                        />
                        {reason}
                      </Label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outward-qc-notes">Notes</Label>
                  <Textarea
                    id="outward-qc-notes"
                    placeholder="Describe the failure details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    Device will be sent back to repair. Current outward QC fail count:{' '}
                    <span className="font-bold">{selectedDevice.outwardQcFailCount}</span>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Pass confirmation */}
            {qcResult === 'PASSED' && (
              <div className="space-y-2">
                <Label htmlFor="outward-qc-pass-notes">Notes (optional)</Label>
                <Textarea
                  id="outward-qc-pass-notes"
                  placeholder="Any notes for dispatch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!qcResult}>
                Submit Outward QC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OutwardQCPage
