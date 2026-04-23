import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Wrench, CheckCircle2, Cpu } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import { mockDevices } from '../data/devices'
import { mockRepairJobs } from '../data/repairs'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type DeviceStatus,
  type RepairJob,
} from '../types'

const L2_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']
const L3_ENGINEERS = ['Meera Joshi', 'Arjun Patel', 'Vikram Singh']
const QC_ENGINEERS = ['Deepak Verma', 'Anita Sharma']

const REPAIR_STATUS_VARIANT: Record<RepairJob['status'], StatusBadgeVariant> = {
  Assigned: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Failed: 'error',
}

function DevicesAssignmentPage() {
  const navigate = useNavigate()

  // Overrides for this session — UI-only since mock data is read-only
  const [repairAssignments, setRepairAssignments] = useState<Record<string, string>>({})
  const [qcAssignments, setQcAssignments] = useState<Record<string, string>>({})

  const l2Jobs = useMemo(
    () => mockRepairJobs.filter((j) => j.repairType === 'L2'),
    [],
  )
  const l3Jobs = useMemo(
    () => mockRepairJobs.filter((j) => j.repairType === 'L3'),
    [],
  )
  const qcDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'AWAITING_QC' || d.status === 'UNDER_QC'),
    [],
  )

  const handleAssignRepair = (jobId: string, engineer: string, barcode: string) => {
    setRepairAssignments((prev) => ({ ...prev, [jobId]: engineer }))
    toast.success(`${barcode} assigned to ${engineer}`)
  }

  const handleAssignQC = (deviceId: string, engineer: string, barcode: string) => {
    setQcAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    toast.success(`${barcode} assigned to ${engineer} for QC`)
  }

  const buildRepairRows = useCallback(
    (jobs: RepairJob[]) =>
      jobs.map((job) => {
        const device = mockDevices.find((d) => d.id === job.deviceId)
        const assigned = repairAssignments[job.id] ?? job.assignedTo
        return {
          id: job.id,
          _deviceId: job.deviceId,
          barcode: job.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          brand: device?.brand ?? '-',
          batch: device?.batchNumber ?? '-',
          jobStatus: job.status,
          assignedTo: !assigned || assigned === 'Unassigned' ? '' : assigned,
          rework: job.isRework ? 'Yes' : 'No',
          _repairType: job.repairType,
        }
      }),
    [repairAssignments],
  )

  const qcRows = useMemo(
    () =>
      qcDevices.map((d) => ({
        id: d.id,
        _deviceId: d.id,
        barcode: d.barcode,
        partSerial: `${d.model}\n${d.serialNumber}`,
        brand: d.brand,
        batch: d.batchNumber,
        status: d.status,
        qcFailCount: d.qcFailCount,
        assignedTo: qcAssignments[d.id] ?? d.assignedTo ?? '',
      })),
    [qcDevices, qcAssignments],
  )

  const allDeviceRows = useMemo(
    () =>
      mockDevices.map((d) => {
        const l2 = mockRepairJobs.find((j) => j.deviceId === d.id && j.repairType === 'L2')
        const l3 = mockRepairJobs.find((j) => j.deviceId === d.id && j.repairType === 'L3')
        return {
          id: d.id,
          _deviceId: d.id,
          barcode: d.barcode,
          partSerial: `${d.model}\n${d.serialNumber}`,
          brand: d.brand,
          batch: d.batchNumber,
          status: d.status,
          l2Engineer: l2 ? (repairAssignments[l2.id] ?? l2.assignedTo) : '—',
          l3Engineer: l3 ? (repairAssignments[l3.id] ?? l3.assignedTo) : '—',
          qcEngineer: qcAssignments[d.id] ?? (d.status === 'AWAITING_QC' || d.status === 'UNDER_QC' ? d.assignedTo ?? '—' : '—'),
        }
      }),
    [repairAssignments, qcAssignments],
  )

  const l2Rows = useMemo(() => buildRepairRows(l2Jobs), [buildRepairRows, l2Jobs])
  const l3Rows = useMemo(() => buildRepairRows(l3Jobs), [buildRepairRows, l3Jobs])

  const l2UnassignedCount = useMemo(
    () => l2Rows.filter((r) => !r.assignedTo).length,
    [l2Rows],
  )
  const l3UnassignedCount = useMemo(
    () => l3Rows.filter((r) => !r.assignedTo).length,
    [l3Rows],
  )
  const qcUnassignedCount = useMemo(
    () => qcRows.filter((r) => !r.assignedTo).length,
    [qcRows],
  )

  const repairColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'batch', label: 'Batch' },
    { key: 'jobStatus', label: 'Job Status' },
    { key: 'rework', label: 'Rework' },
    { key: 'assignedTo', label: 'Assigned Engineer' },
  ]

  const qcColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
    { key: 'qcFailCount', label: 'Fail Count', align: 'center' as const },
    { key: 'assignedTo', label: 'Assigned QC Engineer' },
  ]

  const allColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
    { key: 'l2Engineer', label: 'L2 Engineer' },
    { key: 'l3Engineer', label: 'L3 Engineer' },
    { key: 'qcEngineer', label: 'QC Engineer' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'l2',
        label: `L2 Repair (${l2UnassignedCount})`,
        columns: repairColumns,
        data: l2Rows,
      },
      {
        id: 'l3',
        label: `L3 Repair (${l3UnassignedCount})`,
        columns: repairColumns,
        data: l3Rows,
      },
      {
        id: 'qc',
        label: `QC (${qcUnassignedCount})`,
        columns: qcColumns,
        data: qcRows,
      },
      {
        id: 'all',
        label: `All Devices (${allDeviceRows.length})`,
        columns: allColumns,
        data: allDeviceRows,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [l2Rows, l3Rows, qcRows, allDeviceRows, l2UnassignedCount, l3UnassignedCount, qcUnassignedCount],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return { display: <span className="font-medium">{String(value)}</span> }
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
      if (key === 'status') {
        const status = value as DeviceStatus
        return {
          display: (
            <StatusBadge variant={DEVICE_STATUS_VARIANT[status]}>
              {DEVICE_STATUS_LABELS[status]}
            </StatusBadge>
          ),
        }
      }
      if (key === 'jobStatus') {
        const status = value as RepairJob['status']
        return {
          display: (
            <StatusBadge variant={REPAIR_STATUS_VARIANT[status]}>{status}</StatusBadge>
          ),
        }
      }
      if (key === 'rework' && value === 'Yes') {
        return {
          display: <StatusBadge variant="error">Yes</StatusBadge>,
        }
      }
      if (key === 'assignedTo') {
        const repairType = row._repairType as RepairJob['repairType'] | undefined
        const barcode = row.barcode as string
        const currentValue = (value as string) ?? ''

        // Repair assignment (L2/L3 tabs)
        if (repairType === 'L2' || repairType === 'L3') {
          const jobId = row.id as string
          const engineers = repairType === 'L2' ? L2_ENGINEERS : L3_ENGINEERS
          return {
            display: (
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={currentValue}
                  onValueChange={(val) => {
                    if (val) handleAssignRepair(jobId, val, barcode)
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder={`Assign ${repairType} engineer…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {engineers.map((eng) => (
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

        // QC assignment tab
        const deviceId = row._deviceId as string
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={currentValue}
                onValueChange={(val) => {
                  if (val) handleAssignQC(deviceId, val, barcode)
                }}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Assign QC engineer…" />
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
      if (key === 'qcFailCount') {
        const count = Number(value)
        if (count > 0) {
          return {
            className: 'bg-destructive/10 text-destructive font-medium',
            display: String(count),
          }
        }
      }
      if (key === 'l2Engineer' || key === 'l3Engineer' || key === 'qcEngineer') {
        const v = String(value ?? '—')
        if (!v || v === '—' || v === 'Unassigned') {
          return {
            display: <span className="text-xs text-muted-foreground">—</span>,
          }
        }
        return { display: <span className="text-sm">{v}</span> }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Assign devices to L2 / L3 repair engineers and QC engineers.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Wrench className="size-3.5" /> Awaiting L2 Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#f6c000]">{l2UnassignedCount}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Cpu className="size-3.5" /> Awaiting L3 Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{l3UnassignedCount}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> Awaiting QC Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{qcUnassignedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-devices-assignment"
        onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}`)}
      />
    </div>
  )
}

export default DevicesAssignmentPage
