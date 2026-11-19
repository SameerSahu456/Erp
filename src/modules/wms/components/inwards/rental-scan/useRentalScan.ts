import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useRentalReturnEligibleVariants, useRentalReturnRequest } from "@modules/crm"

import { useGrnBatch, useUpdateGrnBatchDraft } from "../../../hooks/inwards/useInwards"
import { useRentalScanPreview } from "../../../hooks/inwards/useRentalReturnInward"
import { isHeldScan } from "../../../constants/rental-scan"
import type { ReceiveUnitInput } from "../../../api"
import {
  buildStagedLines,
  fallbackVariant,
  isDuplicate,
  isDuplicateUnit,
  lookupsFor,
  rowText,
  scanInputFor,
  scansFromBatch,
  type ScanRow,
} from "./rental-scan-helpers"
import { RENTAL_SCAN_STRINGS as S } from "./rental-scan.strings"

/** The batch, its request, and the account's units on rent — everything the
 *  scan list needs to name a model and an order. */
function useScanContext(batchId: string) {
  const batchQuery = useGrnBatch(batchId)
  const batch = batchQuery.data
  const isRental = batch?.inward_type === "rental_return"
  const rret = useRentalReturnRequest(isRental ? batch?.source_entity_id : null).data
  const variants = useRentalReturnEligibleVariants(rret?.account_id).data
  const list = useMemo(() => variants ?? [], [variants])
  const lookups = useMemo(() => lookupsFor(list), [list])
  return { batchQuery, batch, isRental, rret, lookups, fallback: fallbackVariant(rret, list) }
}

export function useRentalScan(batchId: string) {
  const navigate = useNavigate()
  const ctx = useScanContext(batchId)
  const preview = useRentalScanPreview()
  const saveDraft = useUpdateGrnBatchDraft()
  const [rows, setRows] = useState<ScanRow[]>([])
  const [dirty, setDirty] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const guard = useUnsavedChangesGuard({ isDirty: dirty })

  // Re-classify what the saved draft already holds, once.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current || !ctx.batch || !ctx.isRental) return
    hydrated.current = true
    const scans = scansFromBatch(ctx.batch)
    if (scans.length === 0) return
    preview.mutate(
      { batchId, scans },
      {
        onSuccess: (outcomes) =>
          setRows(outcomes.map((o) => ({ key: crypto.randomUUID(), text: rowText(o.scan), outcome: o }))),
        // Without this a failed re-check left the saved boxes silently missing.
        onError: () => setScanError(S.input.restoreFailed),
      },
    )
  }, [ctx.batch, ctx.isRental, batchId, preview])

  // Every preview carries the WHOLE batch: "order fully returned" and the
  // early-exit estimate depend on the other boxes scanned with this one.
  // Rows are rebuilt from the answer so earlier warnings stay current.
  const reclassify = async (next: { key: string; text: string; scan: ReceiveUnitInput }[]) => {
    if (next.length === 0) return []
    const outcomes = await preview.mutateAsync({ batchId, scans: next.map((n) => n.scan) })
    return next.map((n, i) => ({ key: n.key, text: n.text, outcome: outcomes[i] }))
  }

  const addScan = async (raw: string) => {
    const text = raw.trim()
    if (!text) return false
    if (isDuplicate(rows, text)) {
      setScanError(S.input.duplicate)
      return false
    }
    try {
      const fresh = { key: crypto.randomUUID(), text, scan: scanInputFor(text) }
      const next = await reclassify([
        fresh,
        ...rows.map((r) => ({ key: r.key, text: r.text, scan: r.outcome.scan })),
      ])
      const [added, ...rest] = next
      if (!added?.outcome) return false
      if (isDuplicateUnit(rest, added.outcome)) {
        setScanError(S.input.duplicate)
        return false
      }
      setRows(next)
      setDirty(true)
      setScanError(null)
      return true
    } catch {
      setScanError(S.input.failed)
      return false
    }
  }

  const removeScan = async (key: string) => {
    const remaining = rows.filter((r) => r.key !== key)
    setRows(remaining)
    setDirty(true)
    try {
      setRows(await reclassify(remaining.map((r) => ({ key: r.key, text: r.text, scan: r.outcome.scan }))))
    } catch {
      // The removal stands; only the refreshed warnings are lost.
    }
  }

  const save = async (thenReview: boolean) => {
    await saveDraft.mutateAsync({
      id: batchId,
      body: { lines: buildStagedLines(rows, ctx.fallback) },
    })
    setDirty(false)
    if (!thenReview) return
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    navigate(`/wms/inward/${batchId}/devices`, { replace: true })
  }

  const accepted = rows.filter((r) => !isHeldScan(r.outcome.kind))
  const held = rows.filter((r) => isHeldScan(r.outcome.kind))

  return {
    ...ctx,
    guard,
    accepted,
    held,
    addScan,
    removeScan,
    scanning: preview.isPending,
    scanError,
    clearScanError: () => setScanError(null),
    save,
    saving: saveDraft.isPending,
    dirty,
  }
}

export type RentalScanState = ReturnType<typeof useRentalScan>
