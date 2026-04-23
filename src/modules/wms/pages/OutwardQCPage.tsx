import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

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

import { mockOutwardRecords } from '../data/outward'
import { mockQCRecords } from '../data/qc-records'
import type { OutwardRecord, OutwardDevice, QCRecord } from '../types'

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
  const [selectedDevice, setSelectedDevice] = useState<{ device: OutwardDevice; outward: OutwardRecord } | null>(null)
  const [qcResult, setQcResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [failureReasons, setFailureReasons] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // Outward records pending QC with their devices grouped
  const pendingQcOutwards = useMemo(
    () => mockOutwardRecords.filter((r) => r.status === 'Pending QC' || r.status === 'Packed'),
    []
  )

  const outwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'OUTWARD'),
    [],
  )

  // Build rows grouped by outward, showing individual devices
  const pendingRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    pendingQcOutwards.forEach((outward) => {
      outward.devices
        .filter((d) => d.qcResult === 'Pending')
        .forEach((device) => {
          rows.push({
            id: `${outward.id}-${device.deviceId}`,
            outwardId: outward.id,
            outwardNumber: outward.outwardNumber,
            customerName: outward.customerName,
            barcode: device.barcode,
            model: device.model,
            brand: device.brand,
            grade: device.grade ?? '-',
            deviceId: device.deviceId,
          })
        })
    })
    return rows
  }, [pendingQcOutwards])

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

  // Summary: outward records needing QC with device count
  const summaryRows = useMemo(
    () =>
      pendingQcOutwards.map((o) => ({
        id: o.id,
        outwardNumber: o.outwardNumber,
        customerName: o.customerName,
        totalDevices: o.devices.length,
        pendingQc: o.devices.filter((d) => d.qcResult === 'Pending').length,
        passed: o.devices.filter((d) => d.qcResult === 'Passed').length,
        failed: o.devices.filter((d) => d.qcResult === 'Failed').length,
        status: o.status,
      })),
    [pendingQcOutwards],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'summary',
        label: `Outward Summary (${summaryRows.length})`,
        columns: [
          { key: 'outwardNumber', label: 'Outward #', sortable: true },
          { key: 'customerName', label: 'Customer', sortable: true },
          { key: 'totalDevices', label: 'Total Devices', align: 'center' as const },
          { key: 'pendingQc', label: 'Pending QC', align: 'center' as const },
          { key: 'passed', label: 'Passed', align: 'center' as const },
          { key: 'failed', label: 'Failed', align: 'center' as const },
          { key: 'status', label: 'Status' },
        ],
        data: summaryRows,
      },
      {
        id: 'pending',
        label: `Pending Devices (${pendingRows.length})`,
        columns: [
          { key: 'outwardNumber', label: 'Outward #', sortable: true },
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'grade', label: 'Grade' },
          { key: 'customerName', label: 'Customer' },
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
    [summaryRows, pendingRows, completedRows],
  )

  const handleSelectDevice = (outwardId: string, deviceId: string) => {
    const outward = mockOutwardRecords.find((o) => o.id === outwardId)
    const device = outward?.devices.find((d) => d.deviceId === deviceId)
    if (outward && device) {
      setSelectedDevice({ device, outward })
      setQcResult(null)
      setFailureReasons([])
      setNotes('')
    }
  }

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'outwardNumber' && typeof value === 'string') {
        // Summary tab - link to outward detail
        if (row.totalDevices !== undefined) {
          return {
            display: (
              <Link
                to={`/wms/outward/${row.id as string}`}
                className="font-medium text-primary hover:underline"
              >
                {value}
              </Link>
            ),
          }
        }
        // Pending tab - just show text
        return {
          display: <span className="font-medium text-muted-foreground">{value}</span>,
        }
      }
      if (key === 'barcode' && row.deviceId !== undefined) {
        return {
          display: (
            <button
              className="text-primary underline-offset-4 hover:underline font-medium"
              onClick={() => handleSelectDevice(row.outwardId as string, row.deviceId as string)}
            >
              {String(value)}
            </button>
          ),
        }
      }
      if (key === 'failed') {
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
      if (key === 'status' && typeof value === 'string') {
        return {
          display: <StatusBadge variant="warning">{value}</StatusBadge>,
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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

    const deviceBarcode = selectedDevice?.device.barcode
    const outwardNumber = selectedDevice?.outward.outwardNumber

    toast.success(
      qcResult === 'PASSED'
        ? `Outward QC passed for ${deviceBarcode} (${outwardNumber}) - Ready for Dispatch`
        : `Outward QC failed for ${deviceBarcode} (${outwardNumber}) - sent back to repair`,
    )

    // Check if all devices in this outward are now QC'd
    if (selectedDevice) {
      const outward = selectedDevice.outward
      const remainingPending = outward.devices.filter(
        (d) => d.qcResult === 'Pending' && d.deviceId !== selectedDevice.device.deviceId
      ).length
      if (remainingPending === 0 && qcResult === 'PASSED') {
        toast.info(`All devices in ${outwardNumber} have passed QC. Outward status updated to QC Passed.`)
      }
    }

    setSelectedDevice(null)
    setQcResult(null)
    setFailureReasons([])
    setNotes('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Outward QC</h1>
        <p className="text-sm text-muted-foreground">
          Pre-dispatch quality check. Devices grouped by outward record.
        </p>
      </div>

      {/* QC Queue Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="wms-outward-qc" />

      {/* QC Form */}
      {selectedDevice && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Outward QC: {selectedDevice.device.barcode}</CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Outward:</span>{' '}
                {selectedDevice.outward.outwardNumber}
              </span>
              <span>
                <span className="font-medium text-foreground">Customer:</span>{' '}
                {selectedDevice.outward.customerName}
              </span>
              <span>
                <span className="font-medium text-foreground">Model:</span>{' '}
                {selectedDevice.device.model}
              </span>
              <span>
                <span className="font-medium text-foreground">Brand:</span>{' '}
                {selectedDevice.device.brand}
              </span>
              <span>
                <span className="font-medium text-foreground">Serial:</span>{' '}
                {selectedDevice.device.serialNumber}
              </span>
              {selectedDevice.device.grade && (
                <span>
                  <span className="font-medium text-foreground">Grade:</span>{' '}
                  {selectedDevice.device.grade}
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
                    Device will be sent back to repair. This may delay dispatch of{' '}
                    <span className="font-bold">{selectedDevice.outward.outwardNumber}</span>.
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
