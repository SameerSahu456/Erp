import {
  DollarSign,
  Users,
  HardDrive,
  ShoppingCart,
  PackageCheck,
  Search,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  XCircle,
  UserPlus,
  FileText,
  Truck,
} from "lucide-react"

import { StatsRow } from "@/components/common/StatsRow"
import { WorkflowStepper } from "@/components/common/WorkflowStepper"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import { Timeline } from "@/components/common/Timeline"
import { AvatarGroup } from "@/components/common/AvatarGroup"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { DataCardProps } from "@/components/common/DataCard"
import type { StepConfig } from "@/components/common/WorkflowStepper"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import type { TimelineEntry } from "@/components/common/Timeline"

// ---------- Stats Row Data ----------
const kpiStats: DataCardProps[] = [
  {
    label: "Total Revenue",
    value: "$2.4M",
    icon: DollarSign,
    trend: { value: 12, isPositive: true },
  },
  {
    label: "Active Leads",
    value: "847",
    icon: Users,
    trend: { value: 8, isPositive: true },
  },
  {
    label: "Devices in WMS",
    value: "234",
    icon: HardDrive,
    trend: { value: 3, isPositive: false },
  },
  {
    label: "Open POs",
    value: "56",
    icon: ShoppingCart,
    trend: { value: 5, isPositive: true },
  },
]

// ---------- Workflow Stepper Data ----------
const workflowSteps: StepConfig[] = [
  { id: "inward", label: "Inward", icon: PackageCheck, status: "completed", description: "Received at warehouse" },
  { id: "inspection", label: "Inspection", icon: Search, status: "completed", description: "Initial assessment done" },
  { id: "repair", label: "Repair", icon: Wrench, status: "active", description: "In progress" },
  { id: "qc", label: "QC", icon: ClipboardCheck, status: "pending", description: "Awaiting quality check" },
  { id: "inventory", label: "Inventory", icon: HardDrive, status: "pending", description: "Ready for stock" },
]

// ---------- Business Metrics Table Data ----------
const metricsTabs: TabConfig[] = [
  {
    id: "high-level",
    label: "High Level",
    columns: [
      { key: "metric", label: "Metric", sortable: true },
      { key: "value", label: "Value", sortable: true, align: "right" },
      { key: "change", label: "Change", sortable: true, align: "right" },
      { key: "status", label: "Status" },
    ],
    data: [
      { metric: "Monthly Recurring Revenue", value: "$198,500", change: "+12.4%", status: "On Track" },
      { metric: "Customer Acquisition Cost", value: "$1,240", change: "-8.2%", status: "Improved" },
      { metric: "Churn Rate", value: "2.1%", change: "-0.5%", status: "On Track" },
      { metric: "Average Deal Size", value: "$34,800", change: "+4.7%", status: "On Track" },
      { metric: "Support Ticket Volume", value: "1,342", change: "+18.3%", status: "Needs Attention" },
    ],
  },
  {
    id: "quarterly",
    label: "Quarterly",
    columns: [
      { key: "quarter", label: "Quarter", sortable: true },
      { key: "revenue", label: "Revenue", sortable: true, align: "right" },
      { key: "expenses", label: "Expenses", sortable: true, align: "right" },
      { key: "profit", label: "Profit", sortable: true, align: "right" },
    ],
    data: [
      { quarter: "Q1 2026", revenue: "$580,000", expenses: "$412,000", profit: "$168,000" },
      { quarter: "Q2 2026", revenue: "$620,000", expenses: "$398,000", profit: "$222,000" },
      { quarter: "Q3 2026", revenue: "$540,000", expenses: "$425,000", profit: "$115,000" },
      { quarter: "Q4 2026", revenue: "$660,000", expenses: "$440,000", profit: "$220,000" },
    ],
  },
  {
    id: "sales-pipeline",
    label: "Sales Pipeline",
    columns: [
      { key: "stage", label: "Stage", sortable: true },
      { key: "count", label: "Count", sortable: true, align: "right" },
      { key: "value", label: "Value", sortable: true, align: "right" },
      { key: "conversion", label: "Conversion", sortable: true, align: "right" },
    ],
    data: [
      { stage: "Prospecting", count: 312, value: "$4,200,000", conversion: "100%" },
      { stage: "Qualification", count: 187, value: "$2,800,000", conversion: "60%" },
      { stage: "Proposal", count: 94, value: "$1,650,000", conversion: "30%" },
      { stage: "Negotiation", count: 41, value: "$890,000", conversion: "13%" },
      { stage: "Closed Won", count: 28, value: "$620,000", conversion: "9%" },
    ],
  },
]

const cellFormatter: CellFormatter = (value, key) => {
  if (key === "change" && typeof value === "string") {
    const isNegative = value.startsWith("-")
    if (isNegative) {
      return { className: "bg-destructive/10 text-destructive font-medium" }
    }
    return { className: "text-status-success-text font-medium" }
  }
  if (key === "status" && value === "Needs Attention") {
    return { className: "text-destructive font-medium" }
  }
  return null
}

// ---------- Timeline Data ----------
const timelineEntries: TimelineEntry[] = [
  {
    id: "1",
    icon: Truck,
    title: "Shipment #WMS-4521 received",
    description: "42 units of Dell OptiPlex 7090 arrived at Mumbai warehouse",
    user: "Rajesh Kumar",
    timestamp: "2 hours ago",
    variant: "success",
  },
  {
    id: "2",
    icon: AlertTriangle,
    title: "QC failed for batch #INS-887",
    description: "3 units failed power-on test, routed back to repair queue",
    user: "Priya Sharma",
    timestamp: "4 hours ago",
    variant: "warning",
  },
  {
    id: "3",
    icon: XCircle,
    title: "PO #PO-2234 cancelled by vendor",
    description: "HP ProBook 450 G9 order cancelled due to stock unavailability",
    user: "Amit Patel",
    timestamp: "6 hours ago",
    variant: "error",
  },
  {
    id: "4",
    icon: UserPlus,
    title: "New lead assigned to sales team",
    description: "Tata Consultancy Services - 500 unit laptop refresh project",
    user: "Sneha Gupta",
    timestamp: "Yesterday",
    variant: "default",
  },
  {
    id: "5",
    icon: FileText,
    title: "Invoice #INV-7891 generated",
    description: "Quarterly billing for Infosys managed services contract",
    user: "Vikram Singh",
    timestamp: "Yesterday",
    variant: "success",
  },
]

// ---------- Avatar Group Data ----------
const teamMembers = [
  { name: "Rajesh Kumar" },
  { name: "Priya Sharma" },
  { name: "Amit Patel" },
  { name: "Sneha Gupta" },
  { name: "Vikram Singh" },
  { name: "Anita Desai" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-sans">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Component showcase — visual verification of core UI primitives.
        </p>
      </div>

      {/* Section 1: KPI Stats */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Key Performance Indicators
        </h3>
        <StatsRow stats={kpiStats} />
      </section>

      {/* Section 2: Workflow Stepper */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          WMS Device Lifecycle
        </h3>
        <div className="rounded-lg border bg-card p-6">
          <WorkflowStepper steps={workflowSteps} />
        </div>
      </section>

      {/* Section 3: Business Metrics Table */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Business Metrics
        </h3>
        <BusinessMetricsTable
          tabs={metricsTabs}
          cellFormatter={cellFormatter}
          pageSize={10}
        />
      </section>

      {/* Section 4: Two-column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Timeline */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Recent Activity
          </h3>
          <div className="rounded-lg border bg-card p-6">
            <Timeline entries={timelineEntries} />
          </div>
        </section>

        {/* Right: AvatarGroup + StatusBadge */}
        <section className="space-y-6">
          {/* Avatar Group */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Team Members
            </h3>
            <div className="rounded-lg border bg-card p-6">
              <AvatarGroup users={teamMembers} max={4} />
            </div>
          </div>

          {/* Status Badge Examples */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Status Badges
            </h3>
            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-wrap gap-3">
                <StatusBadge variant="success">Active</StatusBadge>
                <StatusBadge variant="warning">Pending Review</StatusBadge>
                <StatusBadge variant="error">Failed</StatusBadge>
                <StatusBadge variant="info">In Transit</StatusBadge>
                <StatusBadge variant="neutral">Draft</StatusBadge>
                <StatusBadge variant="red-cell">Overdue</StatusBadge>
              </div>
            </div>
          </div>

          {/* Additional info cards for height */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Quick Stats
            </h3>
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Devices repaired this week</span>
                <span className="text-sm font-semibold">127</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg repair turnaround</span>
                <span className="text-sm font-semibold">3.2 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Warehouse utilization</span>
                <span className="text-sm font-semibold">78%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending inspections</span>
                <span className="text-sm font-semibold">19</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Spacer for FloatingQueryButton testing */}
      <div className="h-64" />
    </div>
  )
}
