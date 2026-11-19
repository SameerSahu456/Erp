import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"

export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getDealStageVariant(stage: string): StatusBadgeVariant {
  switch (stage) {
    case "Closed Won":
      return "success"
    case "Closed Lost":
      return "error"
    case "Negotiation":
      return "warning"
    default:
      return "info"
  }
}

export function getInvoiceStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "Draft":
      return "neutral"
    case "Sent":
      return "info"
    case "Partially Paid":
      return "warning"
    case "Paid":
      return "success"
    case "Overdue":
      return "error"
    case "Void":
      return "error"
    default:
      return "neutral"
  }
}
