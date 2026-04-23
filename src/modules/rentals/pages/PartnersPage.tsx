import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable, type TabConfig, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockRentalPartners } from '../data/tickets'
import type { RentalPartner } from '../types'

const fmtINR = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

const TIER_VARIANT: Record<string, StatusBadgeVariant> = {
  Platinum: 'info', Gold: 'warning', Silver: 'neutral',
}

function PartnersPage() {
  const partners = mockRentalPartners

  const stats = useMemo(() => ({
    total: partners.length,
    active: partners.filter((p) => p.status === 'Active').length,
    totalDeployed: partners.reduce((s, p) => s + p.deployedAssets, 0),
    totalOutstanding: partners.reduce((s, p) => s + p.outstandingAmount, 0),
  }), [partners])

  const kpiStats: DataCardProps[] = [
    { label: 'Total Partners', value: String(stats.total) },
    { label: 'Active', value: String(stats.active) },
    { label: 'Deployed Assets', value: String(stats.totalDeployed) },
    { label: 'Outstanding', value: fmtINR(stats.totalOutstanding) },
  ]

  const rows = useMemo(() => partners.map((p) => ({
    id: p.id, name: p.name, city: p.city, tier: p.tier,
    contracts: p.activeContracts, assets: p.deployedAssets,
    outstanding: p.outstandingAmount, creditLimit: p.creditLimit,
    kyc: p.kycComplete ? 'Complete' : 'Pending',
    status: p.status, contact: p.contactPerson, _status: p.status,
  })), [partners])

  const columns = [
    { key: 'name', label: 'Partner Name', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'tier', label: 'Tier' },
    { key: 'contracts', label: 'Contracts', align: 'center' as const, sortable: true },
    { key: 'assets', label: 'Assets', align: 'center' as const, sortable: true },
    { key: 'outstanding', label: 'Outstanding', align: 'right' as const, sortable: true },
    { key: 'creditLimit', label: 'Credit Limit', align: 'right' as const },
    { key: 'kyc', label: 'KYC' },
    { key: 'status', label: 'Status' },
    { key: 'contact', label: 'Contact' },
  ]

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'active', label: `Active (${rows.filter((r) => r._status === 'Active').length})`, columns, data: rows.filter((r) => r._status === 'Active') },
    { id: 'onboarding', label: `Onboarding (${rows.filter((r) => r._status === 'Onboarding').length})`, columns, data: rows.filter((r) => r._status === 'Onboarding') },
  ], [rows])

  const cellFormatter: CellFormatter = useCallback((value, key) => {
    if (key === 'name') return { display: <span style={{ fontWeight: 600 }}>{String(value)}</span> }
    if (key === 'tier') return { display: <StatusBadge variant={TIER_VARIANT[String(value)] ?? 'neutral'}>{String(value)}</StatusBadge> }
    if (key === 'outstanding' || key === 'creditLimit') return { display: <span className="cpt-num" style={{ fontWeight: 550 }}>{fmtINR(value as number)}</span> }
    if (key === 'kyc') {
      const v = value === 'Complete' ? 'success' : 'warning'
      return { display: <StatusBadge variant={v as StatusBadgeVariant}>{String(value)}</StatusBadge> }
    }
    if (key === 'status') {
      const v = value === 'Active' ? 'success' : value === 'Onboarding' ? 'info' : 'neutral'
      return { display: <StatusBadge variant={v as StatusBadgeVariant}>{String(value)}</StatusBadge> }
    }
    return null
  }, [])

  return (
    <div className="space-y-6">
      <div className="cpt-page-header">
        <div>
          <h1 className="cpt-page-title">Channel Partners</h1>
          <div className="cpt-page-sub">Manage channel partners, credit limits, KYC, and deployed asset tracking</div>
        </div>
        <button className="cpt-btn cpt-btn-primary" onClick={() => toast.success('Partner onboarding started')}>+ Onboard Partner</button>
      </div>

      <StatsRow stats={kpiStats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="rentals-partners" />
    </div>
  )
}

export default PartnersPage
