import { CrmDataTable } from "../shared/CrmDataTable"
import type { CellFormatter, TabConfig } from "../shared/CrmDataTable"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINRShort } from "@/lib/currency"

import { invoices } from "@/modules/crm/data/invoices"
import { INVOICE_STATUS_VARIANT } from "../../constants/invoice-status"
import { CRM_INVOICES_STRINGS } from "./invoices.strings"

const S = CRM_INVOICES_STRINGS.list

const invoicesTab: TabConfig = {
  id: "invoices",
  label: S.tabLabel,
  columns: [
    { key: "invoiceNumber", label: S.columns.invoiceNumber, sortable: true },
    { key: "accountName", label: S.columns.accountName, sortable: true },
    { key: "amount", label: S.columns.amount, sortable: true, align: "right" },
    { key: "status", label: S.columns.status, sortable: true },
    { key: "issueDate", label: S.columns.issueDate, sortable: true },
    { key: "dueDate", label: S.columns.dueDate, sortable: true },
  ],
  data: invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    accountName: inv.accountName,
    amount: inv.amount,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
  })),
}

const baseCellFormatter: CellFormatter = (value, key, row) => {
  if (key === "amount" && typeof value === "number") {
    return { display: formatINRShort(value) }
  }
  if (key === "status" && typeof value === "string") {
    const variant = INVOICE_STATUS_VARIANT[value] ?? "neutral"
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  // Row-level styling
  const status = row["status"]
  if (status === "Overdue") {
    return { className: "text-destructive" }
  }
  if (status === "Paid") {
    return { className: "text-status-success-text" }
  }
  return null
}

interface InvoicesTableProps {
  onInvoiceClick: (invoiceNumber: string) => void
  onRowClick: (id: string) => void
  onCreate: () => void
}

export function InvoicesTable({ onInvoiceClick, onRowClick, onCreate }: InvoicesTableProps) {
  const cellFormatter: CellFormatter = (value, key, row) => {
    // Make invoice number clickable
    if (key === "invoiceNumber" && typeof value === "string") {
      return {
        display: (
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline cursor-pointer font-medium"
            onClick={() => onInvoiceClick(value)}
          >
            {value}
          </button>
        ),
      }
    }
    return baseCellFormatter(value, key, row)
  }

  return (
    <CrmDataTable
      className="crm-premium-table"
      tabs={[invoicesTab]}
      cellFormatter={cellFormatter}
      pageSize={10}
      persistKey="crm-invoices"
      onRowClick={(row) => onRowClick(String(row.id))}
      emptyState={{
        title: S.empty.title,
        description: S.empty.description,
        action: {
          label: S.empty.action,
          onClick: onCreate,
        },
      }}
    />
  )
}
