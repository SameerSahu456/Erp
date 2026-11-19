import { useMemo, useState } from "react"

import type { CustomerDeficiencyWire } from "../../api"
import {
  useCustomerDeficiencies,
  useCustomerDeficiencyCount,
} from "../../hooks/deficiencies/useDeficiencies"
import { DEFICIENCY_TABS, type DeficiencyTabId } from "./deficiencies.columns"

const PAGE_SIZE = 20

/** Queue state: tab, type filter, page, and the rows picked for a charge
 *  order. Selection survives paging but is cleared by any filter change, so
 *  a charge order never carries a row the operator can no longer see. */
export function useDeficiencyQueue() {
  const [tab, setTab] = useState<DeficiencyTabId>("open")
  const [type, setType] = useState("")
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState<Map<string, CustomerDeficiencyWire>>(new Map())

  const status = DEFICIENCY_TABS.find((t) => t.id === tab)?.status
  const listQuery = useCustomerDeficiencies({
    status: status ? [...status] : undefined,
    deficiency_type: type || undefined,
    page,
    page_size: PAGE_SIZE,
  })
  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items])
  const openCount = useCustomerDeficiencyCount({ status: ["open"], deficiency_type: type || undefined }).data
  const waiverCount = useCustomerDeficiencyCount({ status: ["waiver_pending"], deficiency_type: type || undefined }).data

  const resetTo = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
    setPicked(new Map())
  }

  const toggle = (row: CustomerDeficiencyWire) =>
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(row.id)) next.delete(row.id)
      else next.set(row.id, row)
      return next
    })

  const chargeable = items.filter((d) => d.status === "open" && !d.is_credit)
  const allPicked = chargeable.length > 0 && chargeable.every((d) => picked.has(d.id))
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Map(prev)
      for (const d of chargeable) {
        if (allPicked) next.delete(d.id)
        else next.set(d.id, d)
      }
      return next
    })

  const pickedRows = [...picked.values()]
  const oneCustomer = new Set(pickedRows.map((d) => d.account_id)).size <= 1

  return {
    tab,
    setTab: resetTo(setTab),
    type,
    setType: resetTo(setType),
    page,
    setPage,
    pageSize: PAGE_SIZE,
    listQuery,
    items,
    counts: { open: openCount ?? 0, waiver: waiverCount ?? 0 } as Record<string, number>,
    picked,
    pickedRows,
    toggle,
    toggleAll,
    allPicked,
    oneCustomer,
    clearPicked: () => setPicked(new Map()),
  }
}

export type DeficiencyQueue = ReturnType<typeof useDeficiencyQueue>
