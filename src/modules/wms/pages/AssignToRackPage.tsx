import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import { mockDevices } from '../data/devices'
import type { Device } from '../types'
import { AssignRackDialog, type RackAssignment } from '../components/AssignRackDialog'

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AssignToRackPage() {
  const navigate = useNavigate()
  // QC-passed devices that need rack assignment (READY_FOR_STOCK status)
  const qcPassedDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'READY_FOR_STOCK' || (d.status === 'IN_STOCK' && !d.rackLocation)),
    [],
  )

  const assignedDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'IN_STOCK' && d.rackLocation),
    [],
  )

  const [rackAssignments, setRackAssignments] = useState<Record<string, RackAssignment>>({})
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDeviceForAssign, setSelectedDeviceForAssign] = useState<Device | null>(null)

  const openAssignDialog = (device: Device) => {
    setSelectedDeviceForAssign(device)
    setAssignDialogOpen(true)
  }

  const pendingRows = useMemo(
    () =>
      qcPassedDevices.map((d) => {
        const assignment = rackAssignments[d.id]
        return {
          id: d.id,
          barcode: d.barcode,
          partNo: d.model,
          serialNo: d.serialNumber,
          biosNo: d.biosNo ?? '-',
          category: d.category,
          brand: d.brand,
          grade: d.grade ?? '-',
          qcDate: formatDate(d.qcPassedAt),
          rackAssigned: assignment
            ? `${assignment.warehouse} / ${assignment.row}-${assignment.rack}-${assignment.bin}`
            : '-',
          _hasAssignment: !!assignment,
        }
      }),
    [qcPassedDevices, rackAssignments],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `QC Passed - Unassigned (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partNo', label: 'Part No', sortable: true },
          { key: 'serialNo', label: 'Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'grade', label: 'Grade', align: 'center' as const },
          { key: 'qcDate', label: 'QC Passed', sortable: true },
          { key: 'rackAssigned', label: 'Rack Assignment' },
          { key: 'actions', label: 'Actions' },
        ],
        data: pendingRows,
      },
    ],
    [pendingRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: <span className="font-medium">{String(value)}</span>,
        }
      }
      if (key === 'partNo') {
        const device = mockDevices.find((d) => d.id === row.id)
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
      if (key === 'rackAssigned') {
        const hasAssignment = row._hasAssignment as boolean
        if (hasAssignment) {
          return {
            display: <StatusBadge variant="success">{String(value)}</StatusBadge>,
          }
        }
        return {
          display: <span className="text-muted-foreground">Not assigned</span>,
        }
      }
      if (key === 'actions') {
        const hasAssignment = row._hasAssignment as boolean
        const deviceId = row.id as string
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
                  const device = mockDevices.find((d) => d.id === deviceId)
                  if (device) openAssignDialog(device)
                }}
              >
                {hasAssignment ? 'Reassign' : 'Assign Rack'}
              </button>
            </div>
          ),
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
        title="Assign to Rack"
        subtitle="Assign QC-passed devices to warehouse rack locations."
        breadcrumbs={[{ label: 'WMS' }, { label: 'Assign to Rack' }]}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Awaiting Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#f6c000]">{qcPassedDevices.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Assigned This Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {Object.keys(rackAssignments).length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Already in Rack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignedDevices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Table */}
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-assign-rack"
        onRowClick={(row) => navigate(`/wms/devices/${row.id}?from=rack`)}
      />

      <AssignRackDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        device={selectedDeviceForAssign}
        onAssigned={(assignment) => {
          if (!selectedDeviceForAssign) return
          setRackAssignments((prev) => ({
            ...prev,
            [selectedDeviceForAssign.id]: assignment,
          }))
        }}
      />
    </div>
  )
}

export default AssignToRackPage
