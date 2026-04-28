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
import { type Device, type QCRecord } from '../types'

const QC_ENGINEERS = ['Deepak Verma', 'Anita Sharma']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function QCPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
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
        barcode: d.barcode,
        partNo: d.model,
        serialNo: d.serialNumber,
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
          partNo: device?.model ?? '-',
          serialNo: device?.serialNumber ?? '-',
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
          { key: 'partNo', label: 'Part No', sortable: true },
          { key: 'serialNo', label: 'Serial No', sortable: true },
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
          { key: 'partNo', label: 'Part No', sortable: true },
          { key: 'serialNo', label: 'Serial No', sortable: true },
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
    setSelectedDevice(device)
    setQcDialogOpen(true)
  }

  // Auto-open the QC dialog when arriving with ?open=<deviceId>. Used by the
  // "Start QC" button on the device detail page so both entry points show the
  // same popup.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const device = mockDevices.find((d) => d.id === openId)
    if (device && (device.status === 'AWAITING_QC' || device.status === 'UNDER_QC')) {
      handleStartInwardQC(device)
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
      if (key === 'partNo') {
        const deviceId = (row._deviceId ?? row.id) as string
        const device = mockDevices.find((d) => d.id === deviceId)
        const isAssembly = device?.deviceKind === 'ASSEMBLY'
        return {
          display: (
            <span className="flex items-center gap-1.5 font-medium">
              {isAssembly && (
                <Server className="size-3.5 text-primary" aria-label="Assembly" />
              )}
              {String(value)}
            </span>
          ),
        }
      }
      if (key === 'serialNo') {
        return {
          display: <span className="text-sm">{String(value)}</span>,
        }
      }
      if (key === 'actions') {
        return {
          display: (
            <div
              className="flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
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
            </div>
          ),
        }
      }
      if (key === 'assignedTo') {
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

      <QCDialog
        open={qcDialogOpen}
        onOpenChange={setQcDialogOpen}
        device={selectedDevice}
      />
    </div>
  )
}

export default QCPage
