import { Plus } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BusinessMetricsTable } from "@/components/common/BusinessMetricsTable"
import type { TabConfig, CellFormatter } from "@/components/common/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/StatusBadge"

import { accounts } from "@/modules/crm/data/accounts"

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const statusVariant: Record<string, StatusBadgeVariant> = {
  Active: "success",
  Inactive: "error",
  Prospect: "info",
}

const accountsTab: TabConfig = {
  id: "accounts",
  label: "All Accounts",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "industry", label: "Industry", sortable: true, filterable: true },
    { key: "type", label: "Type", sortable: true, filterable: true },
    { key: "revenue", label: "Revenue", sortable: true, align: "right" },
    { key: "owner", label: "Owner", sortable: true, filterable: true },
    { key: "status", label: "Status", sortable: true, filterable: true },
    { key: "city", label: "City", sortable: true },
    { key: "categoriesInterested", label: "Interested" },
    { key: "categoriesBuyed", label: "Buyed" },
  ],
  data: accounts.map((a) => ({
    id: a.id,
    name: a.name,
    industry: a.industry,
    type: a.type,
    revenue: a.revenue,
    owner: a.owner,
    status: a.status,
    city: a.city,
    categoriesInterested: a.categoriesInterested?.join(', ') ?? '',
    categoriesBuyed: a.categoriesBuyed?.join(', ') ?? '',
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === "name" && typeof value === "string") {
    return {
      display: <Link to={`/crm/accounts/${row["id"]}`} className="text-primary hover:underline font-medium">{value}</Link>,
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

function AccountsPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Accounts</h2>
        <Button onClick={() => navigate("/crm/accounts/new")}>
          <Plus className="mr-1 size-4" />
          Add Account
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[accountsTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default AccountsPage
