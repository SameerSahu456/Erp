import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { UI } from "@/shared/constants/ui"
import { asUuid } from "@/shared/lib/validation"

/** Deep-link prefill from the CRM sales order page
 *  (`?sales_order_id=&so_number=`). The id is UUID-checked (§11.1); the label
 *  is capped so it can't overflow the picker. Null when absent or invalid. */
export function useSalesOrderPrefill(): { id: string; label: string } | null {
  const [searchParams] = useSearchParams()
  return useMemo(() => {
    const id = asUuid(searchParams.get("sales_order_id")?.trim())
    if (!id) return null
    const label = searchParams
      .get("so_number")
      ?.trim()
      .slice(0, UI.SEARCH_MAX_LENGTH)
    return { id, label: label || id }
  }, [searchParams])
}
