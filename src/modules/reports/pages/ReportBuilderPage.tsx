import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileDown,
  BarChart3,
  Table2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/page'

import {
  REPORT_CATEGORIES,
  getReportData,
  getReportFilterType,
} from '@/modules/reports/data/report-data'

type DatePreset = 'today' | 'last7' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'custom'

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  switch (preset) {
    case 'today':
      return { from: fmt(now), to: fmt(now) }
    case 'last7': {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      return { from: fmt(from), to: fmt(now) }
    }
    case 'thisMonth':
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(now) }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3)
      return { from: `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`, to: fmt(now) }
    }
    case 'thisYear':
      return { from: `${now.getFullYear()}-01-01`, to: fmt(now) }
    default:
      return { from: '', to: '' }
  }
}

export default function ReportBuilderPage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(REPORT_CATEGORIES.map((c) => c.id))
  )
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth')
  const [dateFrom, setDateFrom] = useState(getPresetDates('thisMonth').from)
  const [dateTo, setDateTo] = useState(getPresetDates('thisMonth').to)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [generated, setGenerated] = useState(false)

  // Additional filter state
  const [customerFilter, setCustomerFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedReportLabel = useMemo(() => {
    for (const cat of REPORT_CATEGORIES) {
      for (const r of cat.reports) {
        if (r.id === selectedReport) return r.label
      }
    }
    return ''
  }, [selectedReport])

  const filterType = selectedReport ? getReportFilterType(selectedReport) : null

  const handlePresetChange = (value: unknown) => {
    const preset = value as DatePreset
    setDatePreset(preset)
    if (preset !== 'custom') {
      const dates = getPresetDates(preset)
      setDateFrom(dates.from)
      setDateTo(dates.to)
    }
  }

  const handleGenerate = () => {
    if (!selectedReport) {
      toast.error('Please select a report first')
      return
    }
    setGenerated(true)
    toast.success(`${selectedReportLabel} generated`)
  }

  const handleExport = (format: string) => {
    toast.info(`Exporting ${selectedReportLabel} as ${format}...`)
  }

  const reportData = useMemo(() => {
    if (!selectedReport || !generated) return null
    return getReportData(selectedReport)
  }, [selectedReport, generated])

  const cellFormatter = (value: unknown, key: string, _row: Record<string, unknown>) => {
    if (key === 'status') {
      const v = String(value)
      const variant = v === 'Paid' || v === 'Complete' || v === 'Preferred' || v === 'Ready'
        ? 'success'
        : v === 'Pending' || v === 'In Progress' || v === 'Approved' || v === 'Low'
          ? 'warning'
          : v === 'Overdue' || v === 'Critical' || v === 'Probation'
            ? 'error'
            : 'neutral'
      return {
        display: <StatusBadge variant={variant}>{v}</StatusBadge>,
      }
    }
    if (key === 'passRate' || key === 'conversionRate' || key === 'onTimeDelivery' || key === 'utilization' || key === 'withinSLA' || key === 'retention' || key === 'margin' || key === 'percentage') {
      return {
        className: 'font-medium',
      }
    }
    if (typeof value === 'number' && (key.includes('amount') || key.includes('Value') || key.includes('revenue') || key.includes('Revenue') || key === 'debit' || key === 'credit' || key.includes('value') || key.includes('cost') || key === 'avgOrderValue' || key === 'totalRevenue')) {
      const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(value as number))
      return {
        display: (value as number) < 0 ? `(${formatted})` : formatted,
        className: (value as number) < 0 ? 'text-destructive font-medium' : 'font-medium',
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Build and run reports across sales, inventory, finance, and operations."
        breadcrumbs={[{ label: 'Reports' }]}
      />

      <div className="flex gap-6">
        {/* Left sidebar - report navigation tree */}
        <div className="w-64 shrink-0">
          <div className="sticky top-4 space-y-1">
            {REPORT_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {expandedCategories.has(cat.id) ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {cat.label}
                </button>

                {expandedCategories.has(cat.id) && (
                  <div className="ml-4 space-y-0.5 border-l pl-2">
                    {cat.reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report.id)
                          setGenerated(false)
                        }}
                        className={cn(
                          'w-full rounded-md px-2 py-1 text-left text-sm transition-colors',
                          selectedReport === report.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {report.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right main area */}
        <div className="min-w-0 flex-1 space-y-6">
          {!selectedReport ? (
            <EmptyState
              icon={BarChart3}
              title="Select a report"
              description="Choose a report from the sidebar to configure and generate it."
            />
          ) : (
            <>
              {/* Section 1: Filter bar */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedReportLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date range */}
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <Label>Date Range</Label>
                      <Select value={datePreset} onValueChange={handlePresetChange}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="last7">Last 7 Days</SelectItem>
                          <SelectItem value="thisMonth">This Month</SelectItem>
                          <SelectItem value="thisQuarter">This Quarter</SelectItem>
                          <SelectItem value="thisYear">This Year</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>From</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value)
                          setDatePreset('custom')
                        }}
                        className="w-40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>To</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value)
                          setDatePreset('custom')
                        }}
                        className="w-40"
                      />
                    </div>

                    {/* Additional filters based on report type */}
                    {filterType === 'sales' && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Customer</Label>
                          <Select value={customerFilter} onValueChange={(v) => setCustomerFilter(v as string)}>
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="All Customers" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Customers</SelectItem>
                              <SelectItem value="tcs">TCS Limited</SelectItem>
                              <SelectItem value="infosys">Infosys Ltd</SelectItem>
                              <SelectItem value="wipro">Wipro Technologies</SelectItem>
                              <SelectItem value="hcl">HCL Technologies</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Product Category</Label>
                          <Select defaultValue="all">
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              <SelectItem value="laptops">Laptops</SelectItem>
                              <SelectItem value="desktops">Desktops</SelectItem>
                              <SelectItem value="servers">Servers</SelectItem>
                              <SelectItem value="networking">Networking</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {filterType === 'purchase' && (
                      <div className="space-y-1.5">
                        <Label>Vendor</Label>
                        <Select value={vendorFilter} onValueChange={(v) => setVendorFilter(v as string)}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="All Vendors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Vendors</SelectItem>
                            <SelectItem value="dell">Dell Technologies</SelectItem>
                            <SelectItem value="hp">HP Inc</SelectItem>
                            <SelectItem value="lenovo">Lenovo India</SelectItem>
                            <SelectItem value="cisco">Cisco Systems</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {filterType === 'inventory' && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Warehouse</Label>
                          <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v as string)}>
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="All Warehouses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Warehouses</SelectItem>
                              <SelectItem value="main">Main Warehouse</SelectItem>
                              <SelectItem value="service">Service Center</SelectItem>
                              <SelectItem value="regional">Regional Hub</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Select defaultValue="all">
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              <SelectItem value="laptops">Laptops</SelectItem>
                              <SelectItem value="desktops">Desktops</SelectItem>
                              <SelectItem value="servers">Servers</SelectItem>
                              <SelectItem value="networking">Networking</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {filterType === 'wms' && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Status</Label>
                          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="complete">Complete</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Engineer</Label>
                          <Select defaultValue="all">
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="All Engineers" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Engineers</SelectItem>
                              <SelectItem value="anita">Anita Desai</SelectItem>
                              <SelectItem value="vikram">Vikram Singh</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  <Button onClick={handleGenerate}>Generate Report</Button>
                </CardContent>
              </Card>

              {/* Section 2 & 3: Report output */}
              {generated && reportData && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-lg border p-0.5">
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                      >
                        <Table2 className="mr-1.5 size-4" />
                        Table
                      </Button>
                      <Button
                        variant={viewMode === 'chart' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('chart')}
                      >
                        <BarChart3 className="mr-1.5 size-4" />
                        Chart
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
                        <FileText className="mr-1.5 size-4" />
                        CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport('Excel')}>
                        <FileSpreadsheet className="mr-1.5 size-4" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
                        <FileDown className="mr-1.5 size-4" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {viewMode === 'table' ? (
                    <BusinessMetricsTable
                      tabs={[
                        {
                          id: 'report',
                          label: selectedReportLabel,
                          columns: reportData.columns,
                          data: reportData.data,
                        },
                      ]}
                      cellFormatter={cellFormatter}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>{selectedReportLabel} - Chart View</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col items-center gap-4 py-8">
                          <p className="text-sm text-muted-foreground">
                            Chart visualization coming soon
                          </p>
                          {/* Simple visual bar placeholder */}
                          <div className="flex w-full max-w-md items-end justify-center gap-2">
                            {reportData.data.slice(0, 8).map((_, i) => {
                              const height = 30 + Math.random() * 100
                              return (
                                <div
                                  key={i}
                                  className="w-8 rounded-t bg-primary/60 transition-all hover:bg-primary"
                                  style={{ height: `${height}px` }}
                                />
                              )
                            })}
                          </div>
                          <div className="flex w-full max-w-md justify-center gap-2">
                            {reportData.data.slice(0, 8).map((row, i) => (
                              <div
                                key={i}
                                className="w-8 truncate text-center text-[10px] text-muted-foreground"
                                title={String(Object.values(row)[0])}
                              >
                                {String(Object.values(row)[0]).slice(0, 4)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
