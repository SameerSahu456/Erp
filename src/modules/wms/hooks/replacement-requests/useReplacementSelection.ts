/** Row selection and the bulk decisions on the replacement-request detail page. */
import { useState } from "react"
import { toast } from "sonner"

import {
  useApproveReplacementItems,
  useRejectReplacementItem,
  type ReplacementRequestItemWire,
} from "@modules/crm"

import { REPLACEMENT_SELECTION_STRINGS as S } from "./use-replacement-selection.strings"

export function useReplacementSelection({
  rrId,
  decidable,
  pageDecidable,
}: {
  rrId: string | undefined
  /** Every unit this viewer may still decide. */
  decidable: ReplacementRequestItemWire[]
  /** The ones on the current page: "select all" covers only these. */
  pageDecidable: ReplacementRequestItemWire[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejecting, setRejecting] = useState(false)
  const approveMany = useApproveReplacementItems()
  const rejectOne = useRejectReplacementItem()

  // Derived, so a unit decided in the meantime drops out on its own.
  const selected = decidable.filter((item) => selectedIds.has(item.id))
  const allOnPageSelected =
    pageDecidable.length > 0 && pageDecidable.every((item) => selectedIds.has(item.id))

  const toggleSelected = (itemId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of pageDecidable) {
        if (allOnPageSelected) next.delete(item.id)
        else next.add(item.id)
      }
      return next
    })

  const approveSelected = () => {
    if (!rrId) return
    approveMany.mutate(
      { rrId, itemIds: selected.map((item) => item.id) },
      { onSuccess: () => setSelectedIds(new Set()) },
    )
  }

  /** One call per unit: there is no batch reject. A rejected unit leaves the
   *  selection straight away, so a retry only sends what is still open.
   *  Returns whether every unit went through. */
  const rejectSelected = async (reason: string): Promise<boolean> => {
    if (!rrId) return false
    const total = selected.length
    let done = 0
    setRejecting(true)
    try {
      for (const item of selected) {
        await rejectOne.mutateAsync({ rrId, itemId: item.id, reason })
        done += 1
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }
    } catch {
      // The reject hook has already shown the backend's message.
      if (done > 0) toast.info(S.partlyRejected(done, total))
      return false
    } finally {
      setRejecting(false)
    }
    // shortcut: the reject hook toasts every unit, so clear those and show one
    // summary. Upgrade to a batch reject hook in the CRM module when allowed.
    toast.dismiss()
    toast.success(S.rejected(done))
    return true
  }

  return {
    selectedIds,
    selected,
    allOnPageSelected,
    toggleSelected,
    toggleAllOnPage,
    approveSelected,
    approvePending: approveMany.isPending,
    rejectSelected,
    rejecting,
  }
}
