import { useMemo } from 'react'

import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockRentalAssets } from '../data/assets'
import { mockRentalContracts } from '../data/contracts'
import { mockSupportTickets, mockRentalPartners } from '../data/tickets'
import { ASSET_CATEGORY_LABELS } from '../types'

const fmtINR = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function RentalAnalyticsPage() {
  const totalAUM = useMemo(() => mockRentalAssets.reduce((s, a) => s + a.acquisitionCost, 0), [])
  const deployed = mockRentalAssets.filter((a) => a.status === 'Deployed').length
  const utilization = Math.round((deployed / mockRentalAssets.length) * 100)
  const monthlyRevenue = mockRentalContracts.filter((c) => c.status === 'Active' || c.status === 'Extended').reduce((s, c) => s + c.monthlyRental, 0)
  const totalOverdue = mockRentalContracts.reduce((s, c) => s + c.totalOverdue, 0)
  const openTickets = mockSupportTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length
  const activePartners = mockRentalPartners.filter((p) => p.status === 'Active').length

  const execKPIs: DataCardProps[] = [
    { label: 'AUM (Assets Under Management)', value: fmtINR(totalAUM), sub: `${mockRentalAssets.length} assets` },
    { label: 'Monthly Recurring Revenue', value: fmtINR(monthlyRevenue), sub: 'Active contracts', trend: { value: 12, isPositive: true } },
    { label: 'Fleet Utilization', value: `${utilization}%`, sub: `${deployed} of ${mockRentalAssets.length} deployed` },
    { label: 'DSO (Days Sales Outstanding)', value: '42 days', sub: 'Target: 45 days', trend: { value: 5, isPositive: true } },
    { label: 'Dispute Rate', value: '1.2%', sub: 'Target: < 1%', trend: { value: 0.3, isPositive: true } },
  ]

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; deployed: number; value: number }> = {}
    for (const a of mockRentalAssets) {
      const cat = ASSET_CATEGORY_LABELS[a.category]
      if (!map[cat]) map[cat] = { count: 0, deployed: 0, value: 0 }
      map[cat].count++
      if (a.status === 'Deployed') map[cat].deployed++
      map[cat].value += a.bookValue
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count)
  }, [])

  // Top partners by revenue
  const topPartners = useMemo(() =>
    [...mockRentalPartners]
      .filter((p) => p.status === 'Active')
      .sort((a, b) => b.deployedAssets - a.deployedAssets)
      .slice(0, 5),
  [])

  return (
    <div className="space-y-6">
      <div className="cpt-page-header">
        <div>
          <h1 className="cpt-page-title">Rental Analytics</h1>
          <div className="cpt-page-sub">Executive dashboard — fleet performance, margin analysis, and partner insights</div>
        </div>
        <div className="cpt-row">
          <div className="cpt-seg">
            <button className="on">MTD</button>
            <button>QTD</button>
            <button>YTD</button>
          </div>
          <button className="cpt-btn">Export</button>
        </div>
      </div>

      {/* Executive KPIs */}
      <StatsRow stats={execKPIs} />

      {/* Two-column layout */}
      <div className="cpt-split">
        {/* Fleet by Category */}
        <div className="cpt-kpi" style={{ padding: 0 }}>
          <div className="cpt-card-header">
            <div className="cpt-card-title">Fleet by Category</div>
            <span className="cpt-muted cpt-tiny">{mockRentalAssets.length} total assets</span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            <table className="cpt-tbl">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="right">Count</th>
                  <th className="right">Deployed</th>
                  <th className="right">Utilization</th>
                  <th className="right">Book Value</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map(([cat, data]) => (
                  <tr key={cat}>
                    <td style={{ fontWeight: 550 }}>{cat}</td>
                    <td className="right cpt-num">{data.count}</td>
                    <td className="right cpt-num">{data.deployed}</td>
                    <td className="right">
                      <StatusBadge variant={data.deployed / data.count > 0.7 ? 'success' : data.deployed / data.count > 0.4 ? 'warning' : 'error'}>
                        {Math.round((data.deployed / data.count) * 100)}%
                      </StatusBadge>
                    </td>
                    <td className="right cpt-num" style={{ fontWeight: 550 }}>{fmtINR(data.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Metrics sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="cpt-kpi" style={{ padding: 0 }}>
            <div className="cpt-card-header">
              <div className="cpt-card-title">Support Overview</div>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {[
                ['Open Tickets', String(openTickets)],
                ['SLA Compliance', '96%'],
                ['Avg Resolution', '6.2 hours'],
                ['Advance Replacements (MTD)', '1'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E4E7EC' }}>
                  <span className="cpt-muted" style={{ fontSize: 13 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cpt-kpi" style={{ padding: 0 }}>
            <div className="cpt-card-header">
              <div className="cpt-card-title">Top Partners</div>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {topPartners.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #E4E7EC' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div className="cpt-muted cpt-tiny">{p.deployedAssets} assets · {p.city}</div>
                  </div>
                  <StatusBadge variant={p.tier === 'Platinum' ? 'info' : p.tier === 'Gold' ? 'warning' : 'neutral'}>{p.tier}</StatusBadge>
                </div>
              ))}
            </div>
          </div>

          <div className="cpt-kpi" style={{ padding: 0 }}>
            <div className="cpt-card-header">
              <div className="cpt-card-title">Receivables</div>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {[
                ['Total Outstanding', fmtINR(totalOverdue + mockRentalPartners.reduce((s, p) => s + p.outstandingAmount, 0))],
                ['Overdue (>30 days)', fmtINR(totalOverdue)],
                ['Active Partners', String(activePartners)],
                ['Dispute Rate', '1.2%'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E4E7EC' }}>
                  <span className="cpt-muted" style={{ fontSize: 13 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RentalAnalyticsPage
