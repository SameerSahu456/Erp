import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { QCDialog } from '../components/QCDialog'

import { mockDevices } from '../data/devices'
import { mockQCRecords } from '../data/qc-records'
import { mockOutwardRecords } from '../data/outward'
import {
  type Device,
  type QCRecord,
  type OutwardDevice,
  type OutwardRecord,
} from '../types'

const QC_ENGINEERS = ['Deepak Verma', 'Anita Sharma']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type QCType = 'INWARD' | 'OUTWARD'

function QCPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [qcType, setQcType] = useState<QCType>('INWARD')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [selectedOutwardCtx, setSelectedOutwardCtx] = useState<{ outward: OutwardRecord; device: OutwardDevice } | null>(null)
  const [qcAssignments, setQcAssignments] = useState<Record<string, string>>({})

  const handleAssignQCEngineer = (deviceId: string, engineer: string) => {
    setQcAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  // ── Inward QC ──────────────────────────────────────────────────────────
  const inwardPendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'AWAITING_QC'),
    [],
  )
  const inwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'INWARD'),
    [],
  )

  const inwardPendingRows = useMemo(
    () =>
      inwardPendingDevices.map((d) => ({
        id: d.id,
        _deviceId: d.id,
        _qcType: 'INWARD' as const,
        barcode: d.barcode,
        partSerial: `${d.model}\n${d.serialNumber}`,
        biosNo: d.biosNo ?? '-',
        brand: d.brand,
        rework: d.qcFailCount,
        assignedTo: qcAssignments[d.id] ?? d.assignedTo ?? '',
        actions: '',
      })),
    [inwardPendingDevices, qcAssignments],
  )

  const inwardCompletedRows = useMemo(
    () =>
      inwardQCRecords.map((r) => {
        const device = mockDevices.find((d) => d.id === r.deviceId)
        return {
          id: r.id,
          _deviceId: r.deviceId,
          barcode: r.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          result: r.result,
          grade: r.grade ?? '-',
          rework: device?.qcFailCount ?? 0,
          inspectedBy: r.inspectedBy,
          date: formatDate(r.inspectedAt),
        }
      }),
    [inwardQCRecords],
  )

  // ── Outward QC ─────────────────────────────────────────────────────────
  const outwardPendingOutwards = useMemo(
    () => mockOutwardRecords.filter((r) => r.status === 'Pending QC' || r.status === 'Packed'),
    [],
  )
  const outwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'OUTWARD'),
    [],
  )

  const outwardPendingRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    outwardPendingOutwards.forEach((outward) => {
      outward.devices
        .filter((d) => d.qcResult === 'Pending')
        .forEach((device) => {
          const base = mockDevices.find((x) => x.id === device.deviceId)
          rows.push({
            id: `${outward.id}-${device.deviceId}`,
            _deviceId: device.deviceId,
            _qcType: 'OUTWARD' as const,
            _outwardId: outward.id,
            outwardNumber: outward.outwardNumber,
            customerName: outward.customerName,
            barcode: device.barcode,
            partSerial: `${device.model}\n${device.serialNumber}`,
            biosNo: base?.biosNo ?? '-',
            grade: device.grade ?? '-',
            rework: base?.outwardQcFailCount ?? 0,
          })
        })
    })
    return rows
  }, [outwardPendingOutwards])

  const outwardCompletedRows = useMemo(
    () =>
      outwardQCRecords.map((r) => {
        const device = mockDevices.find((d) => d.id === r.deviceId)
        return {
          id: r.id,
          _deviceId: r.deviceId,
          barcode: r.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          result: r.result,
          rework: device?.outwardQcFailCount ?? 0,
          inspectedBy: r.inspectedBy,
          date: formatDate(r.inspectedAt),
          notes: r.notes ?? '-',
        }
      }),
    [outwardQCRecords],
  )

  const inwardTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'inward-pending',
        label: `Pending (${inwardPendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'rework', label: 'Rework', align: 'center' as const, sortable: true },
          { key: 'assignedTo', label: 'Assigned To' },
          { key: 'actions', label: 'Actions' },
        ],
        data: inwardPendingRows,
      },
      {
        id: 'inward-completed',
        label: `Completed (${inwardCompletedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'grade', label: 'Grade' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: inwardCompletedRows,
      },
    ],
    [inwardPendingRows, inwardCompletedRows],
  )

  const outwardTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'outward-pending',
        label: `Pending (${outwardPendingRows.length})`,
        columns: [
          { key: 'outwardNumber', label: 'Outward #', sortable: true },
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'customerName', label: 'Customer', sortable: true },
          { key: 'grade', label: 'Grade' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'actions', label: 'Actions' },
        ],
        data: outwardPendingRows,
      },
      {
        id: 'outward-completed',
        label: `Completed (${outwardCompletedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: outwardCompletedRows,
      },
    ],
    [outwardPendingRows, outwardCompletedRows],
  )

  const handleStartInwardQC = (device: Device) => {
    setQcType('INWARD')
    setSelectedDevice(device)
    setSelectedOutwardCtx(null)
    setQcDialogOpen(true)
  }

  const handleStartOutwardQC = (outwardId: string, deviceId: string) => {
    const outward = mockOutwardRecords.find((o) => o.id === outwardId)
    const device = outward?.devices.find((d) => d.deviceId === deviceId)
    if (!outward || !device) return
    const base = mockDevices.find((x) => x.id === deviceId) ?? null
    setQcType('OUTWARD')
    setSelectedDevice(base)
    setSelectedOutwardCtx({ outward, device })
    setQcDialogOpen(true)
  }

  // Auto-open the QC dialog when arriving with ?open=<deviceId>. Used by the
  // "Start QC" button on the device detail page so both entry points show the
  // same popup.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const device = mockDevices.find((d) => d.id === openId)
    if (device) {
      if (device.status === 'AWAITING_QC' || device.status === 'UNDER_QC') {
        handleStartInwardQC(device)
      } else {
        // Outward QC path: find the outward record the device is part of.
        const outward = mockOutwardRecords.find((o) =>
          o.devices.some((d) => d.deviceId === openId),
        )
        if (outward) {
          handleStartOutwardQC(outward.id, openId)
        } else {
          // Fall back to inward form if no outward record is linked yet.
          handleStartInwardQC(device)
        }
      }
    }
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: <span className="font-medium">{String(value)}</span>,
        }
      }
      if (key === 'partSerial') {
        const [part, serial] = String(value).split('\n')
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{part}</span>
              <span className="text-xs text-muted-foreground">S/N: {serial}</span>
            </div>
          ),
        }
      }
      if (key === 'outwardNumber') {
        return {
          display: <span className="font-medium text-muted-foreground">{String(value)}</span>,
        }
      }
      if (key === 'actions') {
        const type = row._qcType as QCType | undefined
        return {
          display: (
            <div
              className="flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {type === 'INWARD' && (
                <button
                  type="button"
                  className="wms-link-btn text-sm"
                  onClick={() => {
                    const device = mockDevices.find((d) => d.id === row._deviceId)
                    if (device) handleStartInwardQC(device)
                  }}
                >
                  Start Inward QC
                </button>
              )}
              {type === 'OUTWARD' && (
                <button
                  type="button"
                  className="wms-link-btn text-sm"
                  onClick={() => handleStartOutwardQC(row._outwardId as string, row._deviceId as string)}
                >
                  Start Outward QC
                </button>
              )}
            </div>
          ),
        }
      }
      if (key === 'assignedTo' && row._qcType === 'INWARD') {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={currentValue || ''}
                onValueChange={(val) => { if (val) handleAssignQCEngineer(deviceId, val) }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Assign..." />
                </SelectTrigger>
                <SelectContent>
                  {QC_ENGINEERS.map((eng) => (
                    <SelectItem key={eng} value={eng}>
                      {eng}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ),
        }
      }
      if (key === 'rework') {
        const count = value as number
        if (count > 0) {
          return {
            className: 'bg-destructive/10 text-destructive font-medium',
            display: String(count),
          }
        }
        return { display: <span className="text-muted-foreground">0</span> }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Quality Control</h1>
        <p className="text-sm text-muted-foreground">
          Inward QC gates rack assignment. Outward QC gates dispatch — failed devices are sent back to repair.
        </p>
      </div>

      {/* Inward QC — gates rack assignment */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Inward QC</h2>
          <p className="text-sm text-muted-foreground">
            Quality check on repaired devices before rack assignment.
          </p>
        </div>
        <BusinessMetricsTable
          tabs={inwardTabs}
          cellFormatter={cellFormatter}
          persistKey="wms-qc-inward"
          onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=qc`)}
        />
      </div>

      {/* Outward QC — gates dispatch */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Outward QC</h2>
          <p className="text-sm text-muted-foreground">
            Pre-dispatch check. Only devices that pass Outward QC are eligible for outward; failed devices are sent back to repair.
          </p>
        </div>
        <BusinessMetricsTable
          tabs={outwardTabs}
          cellFormatter={cellFormatter}
          persistKey="wms-qc-outward"
          onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=qc`)}
        />
      </div>

      {/* Shared QC dialog — same popup used from the device detail page. */}
      <QCDialog
        open={qcDialogOpen}
        onOpenChange={setQcDialogOpen}
        qcType={qcType}
        device={selectedDevice}
        outwardCtx={selectedOutwardCtx}
      />
    </div>
  )
}

export default QCPage
