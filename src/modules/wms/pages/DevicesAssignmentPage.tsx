import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Wrench, CheckCircle2, Cpu, Monitor } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { PageHeader } from '@/components/page'
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

const L1_L2_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']
const L3_ENGINEERS = ['Meera Joshi', 'Arjun Patel', 'Vikram Singh']
const DISPLAY_ENGINEERS = ['Karthik Rao', 'Neha Bansal']
const QC_ENGINEERS = ['Deepak Verma', 'Anita Sharma']

const REPAIR_STATUS_VARIANT: Record<RepairJob['status'], StatusBadgeVariant> = {
  Assigned: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Failed: 'error',
}

type RepairTab = 'L2' | 'L3' | 'DISPLAY'

type DeviceOverrides = { l1l2?: string; l3?: string; display?: string; qc?: string }

function DevicesAssignmentPage() {
  const navigate = useNavigate()

  // Session-only overrides — mock data is read-only
  const [repairAssignments, setRepairAssignments] = useState<Record<string, string>>({})
  const [qcAssignments, setQcAssignments] = useState<Record<string, string>>({})
  // Direct device-level assignments made from the All Devices tab, where a
  // repair job may not yet exist for a given role.
  const [deviceOverrides, setDeviceOverrides] = useState<Record<string, DeviceOverrides>>({})

  const repairJobsByType = useMemo(
    () => ({
      L2: mockRepairJobs.filter((j) => j.repairType === 'L2'),
      L3: mockRepairJobs.filter((j) => j.repairType === 'L3'),
      DISPLAY: mockRepairJobs.filter((j) => j.repairType === 'DISPLAY'),
    }),
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

  const handleAssignDeviceRole = (
    deviceId: string,
    role: keyof DeviceOverrides,
    engineer: string,
    barcode: string,
  ) => {
    // Prefer updating an existing repair job; fall back to device-level overrides.
    if (role === 'l1l2') {
      const job = mockRepairJobs.find((j) => j.deviceId === deviceId && j.repairType === 'L2')
      if (job) {
        handleAssignRepair(job.id, engineer, barcode)
        return
      }
    } else if (role === 'l3') {
      const job = mockRepairJobs.find((j) => j.deviceId === deviceId && j.repairType === 'L3')
      if (job) {
        handleAssignRepair(job.id, engineer, barcode)
        return
      }
    } else if (role === 'display') {
      const job = mockRepairJobs.find(
        (j) => j.deviceId === deviceId && j.repairType === 'DISPLAY',
      )
      if (job) {
        handleAssignRepair(job.id, engineer, barcode)
        return
      }
    } else if (role === 'qc') {
      handleAssignQC(deviceId, engineer, barcode)
      return
    }
    setDeviceOverrides((prev) => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], [role]: engineer },
    }))
    const label =
      role === 'l1l2' ? 'L1 / L2' : role === 'l3' ? 'L3' : role === 'display' ? 'Display' : 'QC'
    toast.success(`${barcode}: ${label} engineer set to ${engineer}`)
  }

  const engineersForTab = (tab: RepairTab): string[] =>
    tab === 'L2' ? L1_L2_ENGINEERS : tab === 'L3' ? L3_ENGINEERS : DISPLAY_ENGINEERS

  const buildRepairRows = useCallback(
    (tab: RepairTab) =>
      repairJobsByType[tab].map((job) => {
        const device = mockDevices.find((d) => d.id === job.deviceId)
        const assigned = repairAssignments[job.id] ?? job.assignedTo
        return {
          id: job.id,
          _deviceId: job.deviceId,
          _repairTab: tab,
          barcode: job.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          category: device?.category ?? '-',
          brand: device?.brand ?? '-',
          batch: device?.batchNumber ?? '-',
          jobStatus: job.status,
          repairEngineer: !assigned || assigned === 'Unassigned' ? '' : assigned,
          qcEngineer: qcAssignments[job.deviceId] ?? device?.assignedTo ?? '',
        }
      }),
    [repairJobsByType, repairAssignments, qcAssignments],
  )

  const allDeviceRows = useMemo(
    () =>
      mockDevices.map((d) => {
        const l2 = mockRepairJobs.find((j) => j.deviceId === d.id && j.repairType === 'L2')
        const l3 = mockRepairJobs.find((j) => j.deviceId === d.id && j.repairType === 'L3')
        const display = mockRepairJobs.find(
          (j) => j.deviceId === d.id && j.repairType === 'DISPLAY',
        )
        const overrides = deviceOverrides[d.id] ?? {}
        const l1l2 = overrides.l1l2 ?? (l2 ? repairAssignments[l2.id] ?? l2.assignedTo : '')
        const l3v = overrides.l3 ?? (l3 ? repairAssignments[l3.id] ?? l3.assignedTo : '')
        const disp = overrides.display ?? (display ? repairAssignments[display.id] ?? display.assignedTo : '')
        const qc =
          overrides.qc ??
          qcAssignments[d.id] ??
          (d.status === 'AWAITING_QC' || d.status === 'UNDER_QC' ? d.assignedTo ?? '' : '')
        return {
          id: d.id,
          _deviceId: d.id,
          _allTab: true as const,
          barcode: d.barcode,
          partSerial: `${d.model}\n${d.serialNumber}`,
          category: d.category,
          brand: d.brand,
          batch: d.batchNumber,
          status: d.status,
          l1l2Engineer: !l1l2 || l1l2 === 'Unassigned' ? '' : l1l2,
          l3Engineer: !l3v || l3v === 'Unassigned' ? '' : l3v,
          displayEngineer: !disp || disp === 'Unassigned' ? '' : disp,
          qcEngineer: !qc || qc === 'Unassigned' ? '' : qc,
        }
      }),
    [repairAssignments, qcAssignments, deviceOverrides],
  )

  const l2Rows = useMemo(() => buildRepairRows('L2'), [buildRepairRows])
  const l3Rows = useMemo(() => buildRepairRows('L3'), [buildRepairRows])
  const displayRows = useMemo(() => buildRepairRows('DISPLAY'), [buildRepairRows])

  const l2UnassignedCount = useMemo(() => l2Rows.filter((r) => !r.repairEngineer).length, [l2Rows])
  const l3UnassignedCount = useMemo(() => l3Rows.filter((r) => !r.repairEngineer).length, [l3Rows])
  const displayUnassignedCount = useMemo(
    () => displayRows.filter((r) => !r.repairEngineer).length,
    [displayRows],
  )

  const repairColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'batch', label: 'Batch' },
    { key: 'jobStatus', label: 'Job Status' },
    { key: 'repairEngineer', label: 'Repair Engineer' },
    { key: 'qcEngineer', label: 'QC Engineer' },
  ]

  const allColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
    { key: 'l1l2Engineer', label: 'L1 / L2 Engineer' },
    { key: 'l3Engineer', label: 'L3 Engineer' },
    { key: 'displayEngineer', label: 'Display Engineer' },
    { key: 'qcEngineer', label: 'QC Engineer' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'all',
        label: `All Devices (${allDeviceRows.length})`,
        columns: allColumns,
        data: allDeviceRows,
      },
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
        id: 'display',
        label: `Display (${displayUnassignedCount})`,
        columns: repairColumns,
        data: displayRows,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [l2Rows, l3Rows, displayRows, allDeviceRows, l2UnassignedCount, l3UnassignedCount, displayUnassignedCount],
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
          display: <StatusBadge variant={REPAIR_STATUS_VARIANT[status]}>{status}</StatusBadge>,
        }
      }
      if (key === 'repairEngineer') {
        const tab = row._repairTab as RepairTab | undefined
        const jobId = row.id as string
        const barcode = row.barcode as string
        const current = (value as string) ?? ''
        const engineers = tab ? engineersForTab(tab) : L1_L2_ENGINEERS
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={current}
                onValueChange={(val) => {
                  if (val) handleAssignRepair(jobId, val, barcode)
                }}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Assign engineer…" />
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
      if (key === 'qcEngineer' && row._repairTab) {
        const deviceId = row._deviceId as string
        const barcode = row.barcode as string
        const current = (value as string) ?? ''
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={current}
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
      if (
        (key === 'l1l2Engineer' ||
          key === 'l3Engineer' ||
          key === 'displayEngineer' ||
          key === 'qcEngineer') &&
        row._allTab
      ) {
        const deviceId = row._deviceId as string
        const barcode = row.barcode as string
        const current = (value as string) ?? ''
        const role: keyof DeviceOverrides =
          key === 'l1l2Engineer'
            ? 'l1l2'
            : key === 'l3Engineer'
              ? 'l3'
              : key === 'displayEngineer'
                ? 'display'
                : 'qc'
        const engineers =
          role === 'l1l2'
            ? L1_L2_ENGINEERS
            : role === 'l3'
              ? L3_ENGINEERS
              : role === 'display'
                ? DISPLAY_ENGINEERS
                : QC_ENGINEERS
        const placeholder =
          role === 'l1l2'
            ? 'Assign L1 / L2…'
            : role === 'l3'
              ? 'Assign L3…'
              : role === 'display'
                ? 'Assign Display…'
                : 'Assign QC…'
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={current}
                onValueChange={(val) => {
                  if (val) handleAssignDeviceRole(deviceId, role, val, barcode)
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder={placeholder} />
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
      if (
        key === 'l1l2Engineer' ||
        key === 'l3Engineer' ||
        key === 'displayEngineer' ||
        key === 'qcEngineer'
      ) {
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
      <PageHeader
        title="Devices"
        subtitle="Store manager assigns each device to an L1/L2, L3, or Display repair engineer, plus a QC engineer."
        breadcrumbs={[{ label: 'WMS' }, { label: 'Devices' }]}
      />

      <StatsRow
        stats={[
          { label: 'L2 Pending', value: l2UnassignedCount, icon: Wrench },
          { label: 'L3 Pending', value: l3UnassignedCount, icon: Cpu },
          { label: 'Display Pending', value: displayUnassignedCount, icon: Monitor },
          { label: 'Total Devices', value: allDeviceRows.length, icon: CheckCircle2 },
        ]}
      />

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-devices-assignment"
        onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}`)}
        emptyState={{
          title: 'No devices to assign',
          description: 'Devices appear here after inward receipt — assign repair and QC engineers to move them through the pipeline.',
        }}
      />
    </div>
  )
}

export default DevicesAssignmentPage
