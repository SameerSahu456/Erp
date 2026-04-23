import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable, type TabConfig, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockSupportTickets, mockAdvanceReplacements } from '../data/tickets'
import type { TicketStatus, TicketPriority } from '../types'

const STATUS_VARIANT: Record<TicketStatus, StatusBadgeVariant> = {
  Open: 'warning', 'In Progress': 'info', 'Awaiting Parts': 'warning',
  Escalated: 'error', Resolved: 'success', Closed: 'neutral',
}

const PRIORITY_VARIANT: Record<TicketPriority, StatusBadgeVariant> = {
  Critical: 'error', High: 'warning', Medium: 'info', Low: 'neutral',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SupportTicketsPage() {
  const tickets = mockSupportTickets

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length,
    slaBreached: tickets.filter((t) => t.slaBreached).length,
    advReplacements: mockAdvanceReplacements.length,
  }), [tickets])

  const kpiStats: DataCardProps[] = [
    { label: 'Total Tickets', value: String(stats.total) },
    { label: 'Open / In Progress', value: String(stats.open) },
    { label: 'SLA Breached', value: String(stats.slaBreached) },
    { label: 'Advance Replacements', value: String(stats.advReplacements) },
  ]

  const rows = useMemo(() => tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    asset: `${t.assetModel} (${t.assetUID})`,
    customer: t.customerName,
    category: t.category,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo ?? 'Unassigned',
    sla: `${t.slaHours}h`,
    advReplacement: t.isAdvanceReplacement ? 'Yes' : '-',
    created: formatDate(t.createdAt),
    _status: t.status,
    _priority: t.priority,
  })), [tickets])

  const columns = [
    { key: 'ticketNumber', label: 'Ticket #', sortable: true },
    { key: 'asset', label: 'Asset' },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'sla', label: 'SLA', align: 'center' as const },
    { key: 'advReplacement', label: 'Adv. Repl.' },
    { key: 'created', label: 'Created', sortable: true },
  ]

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'open', label: `Open (${rows.filter((r) => r._status === 'Open' || r._status === 'In Progress').length})`, columns, data: rows.filter((r) => r._status === 'Open' || r._status === 'In Progress') },
    { id: 'resolved', label: `Resolved (${rows.filter((r) => r._status === 'Resolved' || r._status === 'Closed').length})`, columns, data: rows.filter((r) => r._status === 'Resolved' || r._status === 'Closed') },
  ], [rows])

  const cellFormatter: CellFormatter = useCallback((value, key, row) => {
    if (key === 'ticketNumber') return { display: <span style={{ fontWeight: 550 }}>{String(value)}</span> }
    if (key === 'priority') return { display: <StatusBadge variant={PRIORITY_VARIANT[value as TicketPriority]}>{String(value)}</StatusBadge> }
    if (key === 'status') return { display: <StatusBadge variant={STATUS_VARIANT[value as TicketStatus]}>{String(value)}</StatusBadge> }
    if (key === 'advReplacement' && value === 'Yes') return { display: <StatusBadge variant="info">Adv. Replaced</StatusBadge> }
    if (key === 'assignedTo' && value === 'Unassigned') return { display: <span className="cpt-muted">Unassigned</span> }
    return null
  }, [])

  return (
    <div className="space-y-6">
      <div className="cpt-page-header">
        <div>
          <h1 className="cpt-page-title">Support Tickets</h1>
          <div className="cpt-page-sub">Track hardware/software issues, SLA compliance, and advance replacements</div>
        </div>
        <button className="cpt-btn cpt-btn-primary" onClick={() => toast.success('New ticket form')}>+ New Ticket</button>
      </div>

      <StatsRow stats={kpiStats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="rentals-support" />
    </div>
  )
}

export default SupportTicketsPage
