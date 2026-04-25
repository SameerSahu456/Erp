import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Server } from 'lucide-react'

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
import { PageHeader } from '@/components/page'

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
        category: d.category,
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
          category: device?.category ?? '-',
          result: r.result,
          grade: r.grade ?? '-',
          rework: device?.qcFailCount ?? 0,
          inspectedBy: r.inspectedBy,
          date: formatDate(r.inspectedAt),
        }
      }),
    [inwardQCRecords],
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
          { key: 'category', label: 'Category', sortable: true },
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
          { key: 'category', label: 'Category', sortable: true },
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
        const deviceId = (row._deviceId ?? row.id) as string
        const device = mockDevices.find((d) => d.id === deviceId)
        const isAssembly = device?.deviceKind === 'ASSEMBLY'
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 font-medium">
                {isAssembly && (
                  <Server className="size-3.5 text-primary" aria-label="Assembly" />
                )}
                {part}
              </span>
              <span className="text-xs text-muted-foreground">
                S/N: {serial}
              </span>
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
      <PageHeader
        title="Quality Control"
        subtitle="Inward QC gates rack assignment. Failed devices are sent back to repair."
        breadcrumbs={[{ label: 'WMS' }, { label: 'QC' }]}
      />

      {/* Inward QC — gates rack assignment */}
      <section className="space-y-3">
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
          emptyState={{
            title: 'No devices awaiting inward QC',
            description: 'Repaired devices will appear here once ready for a quality check.',
          }}
        />
      </section>

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
