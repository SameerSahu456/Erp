import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import type { PaintJob, PaintPanelType } from '../types'
import { mockPaintJobs } from '../data/paint-jobs'
import { mockDevices } from '../data/devices'

function handlePrintBarcode(barcode: string) {
  const printWindow = window.open('', '_blank', 'width=400,height=300')
  if (!printWindow) {
    toast.error('Please allow popups to print barcodes.')
    return
  }
  printWindow.document.write(`
    <html>
      <head><title>Print Barcode</title></head>
      <body style="font-family: monospace; text-align: center; padding: 40px;">
        <div style="border: 2px solid #000; padding: 20px; display: inline-block;">
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${barcode}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

// Group-level status derived from each device's panels:
// - PENDING: all panels awaiting → show "Send to vendor"
// - SENT: at the vendor, not yet marked complete → show "Complete"
// - DONE: paint cycle finished
type GroupStatus = 'PENDING' | 'SENT' | 'DONE'

const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  PENDING: 'Awaiting Vendor',
  SENT: 'With Vendor',
  DONE: 'Done',
}

const GROUP_STATUS_VARIANT: Record<GroupStatus, StatusBadgeVariant> = {
  PENDING: 'warning',
  SENT: 'info',
  DONE: 'success',
}

const PANEL_LABELS: Record<PaintPanelType, string> = {
  TOP_COVER: 'Top Cover',
  BOTTOM_COVER: 'Bottom Cover',
}

// Paint-vendor directory for this flow.
const PAINT_VENDORS: { id: string; name: string; contact: string }[] = [
  { id: 'pv-01', name: 'Mumbai Paint Shop', contact: '+91 98765 43210' },
  { id: 'pv-02', name: 'Bangalore AutoPaint', contact: '+91 98700 12345' },
  { id: 'pv-03', name: 'Chennai Coat & Paint', contact: '+91 98123 45678' },
  { id: 'pv-04', name: 'Delhi Refinish Studio', contact: '+91 98998 00011' },
]

interface PaintGroup {
  deviceId: string
  deviceBarcode: string
  panels: PaintPanelType[]
  jobIds: string[]
  status: GroupStatus
  vendor?: string
  startedAt?: string
  completedAt?: string
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function deriveGroupStatus(jobs: PaintJob[]): GroupStatus {
  if (jobs.every((j) => j.status === 'COLLECTED')) return 'DONE'
  if (jobs.every((j) => j.status === 'AWAITING_PAINT')) return 'PENDING'
  return 'SENT'
}

function PaintPage() {
  const navigate = useNavigate()
  const [paintJobs, setPaintJobs] = useState<PaintJob[]>(mockPaintJobs)

  // Send-to-vendor dialog state
  const [sendDeviceId, setSendDeviceId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState('')
  const [sendNotes, setSendNotes] = useState('')

  const groups = useMemo<PaintGroup[]>(() => {
    const byDevice = new Map<string, PaintJob[]>()
    paintJobs.forEach((j) => {
      const list = byDevice.get(j.deviceId) ?? []
      list.push(j)
      byDevice.set(j.deviceId, list)
    })
    return Array.from(byDevice.entries()).map(([deviceId, jobs]) => ({
      deviceId,
      deviceBarcode: jobs[0]?.deviceBarcode ?? '',
      panels: jobs.map((j) => j.panelType),
      jobIds: jobs.map((j) => j.id),
      status: deriveGroupStatus(jobs),
      vendor: jobs.find((j) => j.assignedTo)?.assignedTo,
      startedAt: jobs.map((j) => j.startedAt).filter(Boolean).sort()[0],
      completedAt: jobs
        .map((j) => j.completedAt)
        .filter(Boolean)
        .sort()
        .slice(-1)[0],
    }))
  }, [paintJobs])

  const statusCounts = useMemo(() => {
    const counts: Record<GroupStatus, number> = { PENDING: 0, SENT: 0, DONE: 0 }
    groups.forEach((g) => counts[g.status]++)
    return counts
  }, [groups])

  const selectedVendor = useMemo(
    () => PAINT_VENDORS.find((v) => v.id === vendorId) ?? null,
    [vendorId],
  )

  const sendGroup = useMemo(
    () => groups.find((g) => g.deviceId === sendDeviceId) ?? null,
    [groups, sendDeviceId],
  )

  const openSendDialog = (deviceId: string) => {
    setSendDeviceId(deviceId)
    setVendorId('')
    setSendNotes('')
  }

  const closeSendDialog = () => {
    setSendDeviceId(null)
    setVendorId('')
    setSendNotes('')
  }

  const submitSendToVendor = () => {
    if (!sendGroup) return
    if (!vendorId) {
      toast.error('Please select a vendor.')
      return
    }
    const vendor = PAINT_VENDORS.find((v) => v.id === vendorId)!
    const now = new Date().toISOString()
    setPaintJobs((prev) =>
      prev.map((j) =>
        sendGroup.jobIds.includes(j.id)
          ? {
              ...j,
              status: 'IN_PAINT' as const,
              assignedTo: vendor.name,
              startedAt: j.startedAt ?? now,
            }
          : j,
      ),
    )
    toast.success(
      `${sendGroup.deviceBarcode} sent to ${vendor.name} (${sendGroup.panels.length} panel${sendGroup.panels.length > 1 ? 's' : ''})`,
    )
    closeSendDialog()
  }

  const completeGroup = (deviceId: string) => {
    const group = groups.find((g) => g.deviceId === deviceId)
    if (!group) return
    const now = new Date().toISOString()
    setPaintJobs((prev) =>
      prev.map((j) =>
        group.jobIds.includes(j.id)
          ? { ...j, status: 'COLLECTED' as const, completedAt: j.completedAt ?? now }
          : j,
      ),
    )
    // Mirror into the device so repair/device view shows paint as Done.
    const device = mockDevices.find((d) => d.id === group.deviceId)
    if (device) device.paintCompleted = true
    toast.success(`Paint complete for ${group.deviceBarcode}`)
  }

  const buildRows = useCallback(
    (filtered: PaintGroup[]) =>
      filtered.map((g) => {
        const device = mockDevices.find((d) => d.id === g.deviceId)
        return {
          id: g.deviceId,
          _deviceId: g.deviceId,
          barcode: g.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          panels: g.panels.map((p) => PANEL_LABELS[p]).join(', '),
          status: g.status,
          vendor: g.vendor ?? '-',
          started: formatDate(g.startedAt),
          completed: formatDate(g.completedAt),
          _status: g.status,
        }
      }),
    [],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'panels', label: 'Panels' },
    { key: 'status', label: 'Status' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'started', label: 'Sent', sortable: true },
    { key: 'completed', label: 'Completed', sortable: true },
    { key: 'actions', label: 'Actions' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Awaiting Vendor (${statusCounts.PENDING})`,
        columns,
        data: buildRows(groups.filter((g) => g.status === 'PENDING')),
      },
      {
        id: 'sent',
        label: `With Vendor (${statusCounts.SENT})`,
        columns,
        data: buildRows(groups.filter((g) => g.status === 'SENT')),
      },
      {
        id: 'done',
        label: `Done (${statusCounts.DONE})`,
        columns,
        data: buildRows(groups.filter((g) => g.status === 'DONE')),
      },
      {
        id: 'all',
        label: `All (${groups.length})`,
        columns,
        data: buildRows(groups),
      },
    ],
    [groups, statusCounts, buildRows],
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
        const status = value as GroupStatus
        return {
          display: (
            <StatusBadge variant={GROUP_STATUS_VARIANT[status]}>
              {GROUP_STATUS_LABELS[status]}
            </StatusBadge>
          ),
        }
      }
      if (key === 'actions') {
        const status = row._status as GroupStatus
        const deviceId = row.id as string
        const barcode = row.barcode as string
        return {
          display: (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => openSendDialog(deviceId)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Send to vendor
                </button>
              )}
              {status === 'SENT' && (
                <button
                  type="button"
                  onClick={() => completeGroup(deviceId)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Complete
                </button>
              )}
              {status === 'DONE' && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              <Button
                size="xs"
                variant="ghost"
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handlePrintBarcode(barcode)}
                title="Print barcode"
              >
                <Printer className="size-3.5" />
              </Button>
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
      <div>
        <h1 className="cpt-page-title">Paint Shop</h1>
        <p className="text-sm text-muted-foreground">
          Send device panels to paint vendors and mark the job complete when panels return.
        </p>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(statusCounts) as GroupStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <StatusBadge variant={GROUP_STATUS_VARIANT[status]}>
              {GROUP_STATUS_LABELS[status]}
            </StatusBadge>
            <span className="text-sm font-medium">{statusCounts[status]}</span>
          </div>
        ))}
      </div>

      {/* Paint Jobs Table */}
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-paint"
        onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=paint`)}
      />

      {/* Send to Vendor Dialog */}
      <Dialog open={sendDeviceId !== null} onOpenChange={(open) => { if (!open) closeSendDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to Vendor</DialogTitle>
          </DialogHeader>
          {sendGroup && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Barcode</p>
                    <p className="font-medium">{sendGroup.deviceBarcode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Device</p>
                    <p className="font-medium">
                      {(() => {
                        const d = mockDevices.find((dev) => dev.id === sendGroup.deviceId)
                        return d ? `${d.brand} ${d.model}` : '-'
                      })()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Panels to send</p>
                  <p className="font-medium">
                    {sendGroup.panels.map((p) => PANEL_LABELS[p]).join(', ')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Vendor</Label>
                <Select value={vendorId} onValueChange={(val) => setVendorId(val ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select paint vendor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAINT_VENDORS.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendor Contact</Label>
                <Input
                  value={selectedVendor?.contact ?? ''}
                  readOnly
                  placeholder="Auto-filled from vendor…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="send-notes">Notes</Label>
                <Textarea
                  id="send-notes"
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  placeholder="Paint colour, finish, special instructions…"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeSendDialog}>Cancel</Button>
            <Button onClick={submitSendToVendor}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PaintPage
