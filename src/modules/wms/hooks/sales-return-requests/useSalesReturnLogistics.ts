import { useState } from "react"

import { usePatchSalesReturnRequest, type SalesReturnRequestWire } from "@modules/crm"

/** Logistics (courier / AWB / expected arrival) editor state + save. */
export function useSalesReturnLogistics(
  sret: SalesReturnRequestWire | undefined,
  patchMutation: ReturnType<typeof usePatchSalesReturnRequest>,
) {
  const [editingLogistics, setEditingLogistics] = useState(false)
  const [courier, setCourier] = useState("")
  const [awb, setAwb] = useState("")
  const [expectedArrival, setExpectedArrival] = useState("")

  const openLogisticsEditor = () => {
    if (!sret) return
    setCourier(sret.courier_name ?? "")
    setAwb(sret.awb_number ?? "")
    setExpectedArrival(sret.expected_arrival_date ?? "")
    setEditingLogistics(true)
  }

  const saveLogistics = async () => {
    if (!sret) return
    await patchMutation.mutateAsync({
      sretId: sret.id,
      body: {
        courier_name: courier.trim() || null,
        awb_number: awb.trim() || null,
        expected_arrival_date: expectedArrival || null,
      },
    })
    setEditingLogistics(false)
  }

  const logisticsDirty =
    !!sret &&
    (courier !== (sret.courier_name ?? "") ||
      awb !== (sret.awb_number ?? "") ||
      expectedArrival !== (sret.expected_arrival_date ?? ""))

  return {
    editingLogistics,
    setEditingLogistics,
    courier,
    setCourier,
    awb,
    setAwb,
    expectedArrival,
    setExpectedArrival,
    logisticsDirty,
    openLogisticsEditor,
    saveLogistics,
  }
}
