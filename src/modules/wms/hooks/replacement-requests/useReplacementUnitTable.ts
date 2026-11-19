/** Search, slot-capping and select-all for `ReplacementUnitTable` (local UI state only). */
import { useCallback, useMemo, useState } from "react"

import type { ReplacementUnitSelection } from "../../components/replacement-requests/replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "../../components/replacement-requests/replacement-requests.strings"
import type { ReplacementRowUnit } from "../../components/replacement-requests/replacement-unit-table-helpers"

const U = S.form.units

export function useReplacementUnitTable({
  units,
  picks,
  onSetMany,
}: {
  units: ReplacementRowUnit[]
  picks: ReadonlyMap<string, ReplacementUnitSelection>
  onSetMany: (units: ReplacementRowUnit[], on: boolean) => void
}) {
  const [search, setSearch] = useState("")
  const [bulkReason, setBulkReason] = useState("")

  const pickedKeys = [...picks.keys()]

  // Only the first `bucketAvailable` free units per part are pickable; the rest show disabled.
  const slotIndex = useMemo(() => {
    const counter = new Map<string, number>()
    const m = new Map<string, number>()
    for (const u of units) {
      if (!u.selectable) continue
      const n = counter.get(u.bucketKey) ?? 0
      m.set(u.unitKey, n)
      counter.set(u.bucketKey, n + 1)
    }
    return m
  }, [units])
  const pickable = useCallback(
    (u: ReplacementRowUnit) =>
      u.selectable &&
      (slotIndex.get(u.unitKey) ?? Infinity) < u.bucketAvailable,
    [slotIndex],
  )

  // Client-side: the list is bounded by what one order shipped. CP-309 — keep
  // ineligible units VISIBLE but sink them to the bottom so the operator never
  // scrolls past disabled rows to reach a selectable one. Stable sort: pickable
  // rows keep their order on top, disabled ones keep theirs below.
  const visibleUnits = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? units.filter((u) =>
          `${u.internal_serial} ${u.manufacturer_serial ?? ""} ${u.part_name} ${u.variant_name}`
            .toLowerCase()
            .includes(q),
        )
      : units
    return [...filtered].sort((a, b) => Number(pickable(b)) - Number(pickable(a)))
  }, [units, search, pickable])

  const anyPickable = visibleUnits.some(pickable)
  // The free units the search shows that can still be ticked.
  const fillable = visibleUnits.filter(
    (u) => pickable(u) && !picks.has(u.unitKey),
  )
  const allSelected = pickedKeys.length > 0 && fillable.length === 0

  // Per-part totals so a partly-claimed part can explain its cap.
  const bucketTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of visibleUnits) m.set(u.bucketKey, (m.get(u.bucketKey) ?? 0) + 1)
    return m
  }, [visibleUnits])
  const bucketFirstDri = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of visibleUnits) {
      if (!m.has(u.bucketKey)) m.set(u.bucketKey, u.unitKey)
    }
    return m
  }, [visibleUnits])
  const hintFor = (u: ReplacementRowUnit): string | null => {
    const total = bucketTotals.get(u.bucketKey) ?? 0
    return bucketFirstDri.get(u.bucketKey) === u.unitKey &&
      u.bucketAvailable < total
      ? U.freeOfTotal(u.bucketAvailable, total)
      : null
  }

  // Header select-all: tick every pickable free unit, or clear every visible
  // ticked one.
  const toggleAll = () => {
    onSetMany(
      allSelected
        ? visibleUnits.filter((u) => picks.has(u.unitKey))
        : fillable,
      !allSelected,
    )
  }

  return {
    search,
    setSearch,
    bulkReason,
    setBulkReason,
    visibleUnits,
    pickedKeys,
    pickable,
    anyPickable,
    allSelected,
    hintFor,
    toggleAll,
  }
}
