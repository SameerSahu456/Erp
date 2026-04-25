import { useMemo } from "react"
import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"
import { ListPageShell } from "@/components/page"

import { accounts } from "@/modules/crm/data/accounts"
import { invoices } from "@/modules/crm/data/invoices"

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-violet-500/10 text-violet-600',
  'bg-rose-500/10 text-rose-600',
]

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Active: "success",
  Inactive: "error",
  Prospect: "info",
}

function AccountsPage() {
  const navigate = useNavigate()

  // Compute overdue invoices per account
  const overdueByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const inv of invoices) {
      if (inv.status === 'Overdue') {
        map[inv.accountId] = (map[inv.accountId] ?? 0) + 1
      }
    }
    return map
  }, [])

  const accountsTab: TabConfig = useMemo(() => ({
    id: "accounts",
    label: "All Accounts",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "industry", label: "Industry", sortable: true, filterable: true },
      { key: "type", label: "Type", sortable: true, filterable: true },
      { key: "revenue", label: "Revenue", sortable: true, align: "right" },
      { key: "owner", label: "Account Owners", sortable: true, filterable: true },
      { key: "status", label: "Status", sortable: true, filterable: true },
      { key: "overdue", label: "Overdue", sortable: true, align: "center" },
      { key: "city", label: "City", sortable: true },
      { key: "categoriesInterested", label: "Interested" },
      { key: "categoriesBuyed", label: "Bought" },
    ],
    data: accounts.map((a) => {
      const ownersList = a.owners ?? [a.owner]
      return {
        id: a.id,
        name: a.name,
        industry: a.industry,
        type: a.type,
        revenue: a.revenue,
        owner: ownersList.join(', '),
        _owners: ownersList,
        status: a.status,
        overdue: overdueByAccount[a.id] ?? 0,
        city: a.city,
        categoriesInterested: a.categoriesInterested?.join(', ') ?? '',
        categoriesBuyed: a.categoriesBuyed?.join(', ') ?? '',
      }
    }),
  }), [overdueByAccount])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "owner") {
      const owners: string[] = (row as Record<string, unknown>)._owners as string[] ?? [String(value)]
      if (owners.length === 1) {
        return {
          display: (
            <div className="flex items-center gap-2">
              <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium', AVATAR_COLORS[0])}>
                {getInitials(owners[0])}
              </div>
              <span className="text-sm">{owners[0]}</span>
            </div>
          ),
        }
      }
      return {
        display: (
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {owners.map((name, i) => (
                <div
                  key={name}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-background text-[10px] font-medium',
                    AVATAR_COLORS[i % AVATAR_COLORS.length]
                  )}
                  style={{ zIndex: owners.length - i }}
                  title={name}
                >
                  {getInitials(name)}
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <span className="text-sm">{owners[0]}</span>
              <span className="text-xs text-muted-foreground"> +{owners.length - 1}</span>
            </div>
          </div>
        ),
      }
    }
    if (key === "revenue" && typeof value === "number") {
      return { display: formatCurrency(value) }
    }
    if (key === "status" && typeof value === "string") {
      const variant = statusVariant[value] ?? "neutral"
      return {
        display: <StatusBadge variant={variant}>{value}</StatusBadge>,
      }
    }
    if (key === "overdue" && typeof value === "number") {
      if (value > 0) {
        return {
          display: <Badge variant="destructive" size="sm">{value} overdue</Badge>,
        }
      }
      return { display: <span className="text-muted-foreground text-xs">—</span> }
    }
    if (key === "categoriesInterested" && typeof value === "string" && value) {
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {value.split(', ').map((cat) => (
              <Badge key={cat} variant="primary-soft" size="sm" className="text-[10px]">{cat}</Badge>
            ))}
          </div>
        ),
      }
    }
    if (key === "categoriesBuyed" && typeof value === "string" && value) {
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {value.split(', ').map((cat) => (
              <Badge key={cat} variant="success-soft" size="sm" className="text-[10px]">{cat}</Badge>
            ))}
          </div>
        ),
      }
    }
    return null
  }

  return (
    <ListPageShell
      title="Accounts"
      subtitle="Companies you do business with, their owners, and outstanding invoices."
      breadcrumbs={[{ label: 'CRM' }, { label: 'Accounts' }]}
      actions={
        <Button onClick={() => navigate("/crm/accounts/new")}>
          <Plus className="mr-1 size-4" />
          Add Account
        </Button>
      }
    >
      <BusinessMetricsTable
        tabs={[accountsTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="crm-accounts"
        onRowClick={(row) => navigate(`/crm/accounts/${row.id}`)}
        emptyState={{
          title: 'No accounts yet',
          description: 'Add companies you do business with to track revenue and invoices.',
          action: {
            label: 'Add Account',
            onClick: () => navigate('/crm/accounts/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export default AccountsPage
