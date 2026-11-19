import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { CategoryOptionsCombobox, OEMOptionsCombobox } from "@modules/ims"

import type {
  UserSalesTargetLine,
  UserSalesTargetLineCondition,
  UserSalesTargetLineInput,
} from "../../api"
import { USER_SALES_TARGET_LINE_CONDITIONS } from "../../api"
import { useUserTargetLines } from "../../hooks/user-targets/useUserTargets"
import { USER_TARGETS_STRINGS as S } from "./user-targets.strings"

// ─── Public types ──────────────────────────────────────────────────────

/** Summary of the editor's current state. The parent form uses it to:
 *   - decide whether to PUT lines after creating/updating the header,
 *   - disable Save while the editor is in an invalid state,
 *   - render the overlap / mismatch hint next to its own Save button. */
export interface BifurcationEditorState {
  /** True once the user has touched a line (added / removed / edited). */
  dirty: boolean
  /** Current line set, ready for ``PUT /crm/user-targets/{id}/lines``. */
  lines: UserSalesTargetLineInput[]
  /** True when there's at least one line AND Σ lines does NOT match
   *  the header on at least one quarter. */
  hasMismatch: boolean
  /** True when a wildcard (All) condition coexists with a specific condition
   *  on the same ``(category, oem)`` pair — server would 422. */
  hasOverlap: boolean
}

interface Props {
  /** Target id to lazy-load existing lines from. ``null`` on create flow. */
  targetId: string | null
  /** Current header quarterly totals the editor measures Σ lines against.
   *  Decimal strings; the editor parses with ``parseAmount``. */
  headerQuarters: {
    q1: string
    q2: string
    q3: string
    q4: string
  }
  /** Fires whenever the editor state changes so the parent can gate Save. */
  onChange: (state: BifurcationEditorState) => void
  /** Set to ``false`` to pause the ``GET`` while the parent accordion
   *  is collapsed. */
  enabled?: boolean
  /** View-only mode — disables every control, hides Add Line + 🗑 trash,
   *  skips the mismatch / overlap warnings (nothing to save), and reports
   *  ``dirty: false`` so the parent form never fires a PUT. Used when the
   *  viewer can't change the target at the current status (Approved for
   *  non-admin, Pending for non-admin, prior-FY for everyone). */
  readOnly?: boolean
}

// ─── Internal draft row ────────────────────────────────────────────────

const WILDCARD = "__all__"

interface DraftLine {
  localId: string
  serverId?: string
  categoryId: string | null
  oemId: string | null
  condition: UserSalesTargetLineCondition | null
  q1: string
  q2: string
  q3: string
  q4: string
}

function emptyLine(): DraftLine {
  return {
    localId: crypto.randomUUID(),
    categoryId: null,
    oemId: null,
    condition: null,
    q1: "0",
    q2: "0",
    q3: "0",
    q4: "0",
  }
}

function fromServerLine(line: UserSalesTargetLine): DraftLine {
  return {
    localId: crypto.randomUUID(),
    serverId: line.id,
    categoryId: line.category_id,
    oemId: line.oem_id,
    condition: line.condition,
    q1: line.q1_target,
    q2: line.q2_target,
    q3: line.q3_target,
    q4: line.q4_target,
  }
}

function parseAmount(raw: string): number {
  const trimmed = raw.trim()
  if (!trimmed) return 0
  const lower = trimmed.toLowerCase()
  const num = parseFloat(lower)
  if (!Number.isFinite(num)) return 0
  if (lower.endsWith("cr")) return num * 10_000_000
  if (lower.endsWith("l")) return num * 100_000
  return num
}

function fmt(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0"
  return formatINRShort(String(value))
}

function toDecimalString(value: number): string {
  return value.toFixed(2)
}

// ─── Component ─────────────────────────────────────────────────────────

export function BifurcationEditor({
  targetId,
  headerQuarters,
  onChange,
  enabled = true,
  readOnly = false,
}: Props) {
  // Always seed the editor with one ``(All, All, All)`` row carrying the
  // current header quarters so the user (or an approver) immediately sees
  // the implicit catch-all. The hydration effect below replaces the seed
  // only when the server returns at least one real line; a target with no
  // explicit breakdown keeps this row visible as "nothing special yet".
  const [draft, setDraft] = useState<DraftLine[]>(() => [
    {
      localId: crypto.randomUUID(),
      categoryId: null,
      oemId: null,
      condition: null,
      q1: headerQuarters.q1,
      q2: headerQuarters.q2,
      q3: headerQuarters.q3,
      q4: headerQuarters.q4,
    },
  ])
  const [dirty, setDirty] = useState(false)

  const linesQuery = useUserTargetLines(targetId ?? undefined, {
    enabled: enabled && Boolean(targetId),
  })

  // Hydrate from the server pages once per unique snapshot — same ref-key
  // pattern used elsewhere so a window-focus refetch doesn't wipe local edits.
  const loadedPages = linesQuery.data?.pages
  const loadedLines = useMemo<UserSalesTargetLine[]>(
    () => (loadedPages ?? []).flatMap((p) => p.items),
    [loadedPages],
  )
  const hydratedKeyRef = useRef<string | null>(null)
  const linesSnapshot = loadedLines.map((l) => l.id).join(",")
  useEffect(() => {
    // Create flow has no server header to pull from — leave the lazy
    // ``useState`` initializer's seed row alone. Only hydrate on edit.
    if (targetId === null) return
    if (dirty) return
    if (hydratedKeyRef.current === linesSnapshot) return
    // A target with no server-side lines keeps the ``(All, All, All)``
    // seed so the viewer sees the implicit catch-all instead of a blank
    // "No breakdown yet" state. Mark hydrated so we don't re-check.
    if (loadedLines.length === 0) {
      hydratedKeyRef.current = linesSnapshot
      return
    }
    hydratedKeyRef.current = linesSnapshot
    // Deliberate sync of external state (server lines) → local draft when
    // the hydration key flips; the ref guard above makes this fire at most
    // once per unique server snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setDraft(loadedLines.map(fromServerLine))
  }, [targetId, dirty, linesSnapshot, loadedLines])

  // Live-sync the seed row's quarters to the header while the user hasn't
  // interacted with the breakdown. Once they touch anything in the table
  // (``dirty = true``), stop syncing — the seed is now the user's data.
  // The sync only touches a draft that still looks like the pure wildcard
  // ``(All, All, All)`` single row; any divergence (user swapped a key or
  // added a second row) is treated as "user has taken ownership".
  useEffect(() => {
    if (readOnly) return
    if (dirty) return
    // Deliberate sync of external state (parent form's quarterly inputs)
    // → the catch-all seed row's quarters. Short-circuits inside the
    // updater when the row is no longer a pure wildcard or already matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setDraft((rows) => {
      if (rows.length !== 1) return rows
      const row = rows[0]
      // Only sync the pure wildcard tuple — if the user swapped the first
      // row to a specific (cat, oem, condition), it's no longer a "seed".
      if (
        row.categoryId !== null ||
        row.oemId !== null ||
        row.condition !== null
      ) {
        return rows
      }
      if (
        row.q1 === headerQuarters.q1 &&
        row.q2 === headerQuarters.q2 &&
        row.q3 === headerQuarters.q3 &&
        row.q4 === headerQuarters.q4
      ) {
        return rows
      }
      return [
        {
          ...row,
          q1: headerQuarters.q1,
          q2: headerQuarters.q2,
          q3: headerQuarters.q3,
          q4: headerQuarters.q4,
        },
      ]
    })
  }, [readOnly, dirty, headerQuarters])

  // Infinite scroll sentinel for lazy-loading long line lists inside the
  // accordion. Observer attaches to the last visible node.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = linesQuery
  useEffect(() => {
    if (!enabled) return
    const el = sentinelRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void fetchNextPage()
        }
      },
      { rootMargin: "80px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage])

  function updateRow(localId: string, patch: Partial<DraftLine>) {
    if (readOnly) return
    setDirty(true)
    setDraft((rows) =>
      rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
    )
  }
  function removeRow(localId: string) {
    if (readOnly) return
    setDirty(true)
    setDraft((rows) => rows.filter((r) => r.localId !== localId))
  }
  function addRow() {
    if (readOnly) return
    setDirty(true)
    setDraft((rows) => [...rows, emptyLine()])
  }

  // Σ Lines + comparison vs the header totals the parent passed in.
  const sums = useMemo(() => {
    const sum = { q1: 0, q2: 0, q3: 0, q4: 0 }
    for (const r of draft) {
      sum.q1 += parseAmount(r.q1)
      sum.q2 += parseAmount(r.q2)
      sum.q3 += parseAmount(r.q3)
      sum.q4 += parseAmount(r.q4)
    }
    return { ...sum, annual: sum.q1 + sum.q2 + sum.q3 + sum.q4 }
  }, [draft])

  const headerSums = useMemo(
    () => ({
      q1: parseAmount(headerQuarters.q1),
      q2: parseAmount(headerQuarters.q2),
      q3: parseAmount(headerQuarters.q3),
      q4: parseAmount(headerQuarters.q4),
    }),
    [headerQuarters],
  )

  const hasMismatch = useMemo(() => {
    if (draft.length === 0) return false
    return (
      sums.q1 !== headerSums.q1 ||
      sums.q2 !== headerSums.q2 ||
      sums.q3 !== headerSums.q3 ||
      sums.q4 !== headerSums.q4
    )
  }, [draft.length, sums, headerSums])

  const hasOverlap = useMemo(() => {
    const byPair = new Map<string, (UserSalesTargetLineCondition | null)[]>()
    const nullCat = "__nullcat__"
    const nullOem = "__nulloem__"
    for (const r of draft) {
      const key = `${r.categoryId ?? nullCat}::${r.oemId ?? nullOem}`
      const list = byPair.get(key) ?? []
      list.push(r.condition)
      byPair.set(key, list)
    }
    for (const conds of byPair.values()) {
      const hasWildcard = conds.some((c) => c === null)
      const hasSpecific = conds.some((c) => c !== null)
      if (hasWildcard && hasSpecific) return true
    }
    return false
  }, [draft])

  // Push state to the parent on every meaningful change — the parent uses
  // this to decide whether to POST / PATCH alone or also PUT lines.
  const serialised: UserSalesTargetLineInput[] = useMemo(
    () =>
      draft.map((r) => ({
        category_id: r.categoryId,
        oem_id: r.oemId,
        condition: r.condition,
        q1_target: toDecimalString(parseAmount(r.q1)),
        q2_target: toDecimalString(parseAmount(r.q2)),
        q3_target: toDecimalString(parseAmount(r.q3)),
        q4_target: toDecimalString(parseAmount(r.q4)),
      })),
    [draft],
  )

  useEffect(() => {
    // Force ``dirty: false`` in view-only mode so the parent save flow
    // never fires PUT /lines even if a stray update slipped through.
    onChange({
      dirty: readOnly ? false : dirty,
      lines: serialised,
      hasMismatch: readOnly ? false : hasMismatch,
      hasOverlap: readOnly ? false : hasOverlap,
    })
  }, [dirty, serialised, hasMismatch, hasOverlap, readOnly, onChange])

  // Scoped read-only styling — the shared Input / SelectTrigger /
  // combobox-trigger primitives dim disabled state to `opacity-50..60`,
  // which makes the Bifurcation table almost unreadable in view mode.
  // Neutralise the opacity and switch to a muted gray fill so each cell
  // still clearly reads as "not editable" while the value stays legible.
  const readOnlyFieldClass = readOnly
    ? "disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:border-input"
    : undefined
  const readOnlyTriggerClass = readOnly
    ? "h-8 disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:border-input"
    : "h-8"

  // ── UI ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <Typography variant="helper" tone="muted">
        {S.dialog.bifurcate.hint}
      </Typography>

      <div className="min-h-[220px] overflow-y-auto rounded-md border">
        {linesQuery.isLoading && draft.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : draft.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {S.dialog.bifurcate.emptyHint}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs">
              <tr>
                <th className="w-[26%] px-3 py-2 text-left font-medium">
                  {S.dialog.bifurcate.columns.category}
                </th>
                <th className="w-[20%] px-3 py-2 text-left font-medium">
                  {S.dialog.bifurcate.columns.oem}
                </th>
                <th className="w-[14%] px-3 py-2 text-left font-medium">
                  {S.dialog.bifurcate.columns.condition}
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  {S.dialog.bifurcate.columns.q1}
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  {S.dialog.bifurcate.columns.q2}
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  {S.dialog.bifurcate.columns.q3}
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  {S.dialog.bifurcate.columns.q4}
                </th>
                <th
                  className="w-10 px-1"
                  aria-label={S.dialog.bifurcate.removeLine}
                />
              </tr>
            </thead>
            <tbody>
              {draft.map((row) => (
                <tr key={row.localId} className="border-t">
                  <td className="px-2 py-1">
                    <CategoryOptionsCombobox
                      value={row.categoryId}
                      onValueChange={(id) =>
                        updateRow(row.localId, { categoryId: id })
                      }
                      placeholder={S.dialog.bifurcate.wildcard}
                      wildcardLabel={S.dialog.bifurcate.wildcard}
                      triggerClassName={readOnlyTriggerClass}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <OEMOptionsCombobox
                      value={row.oemId}
                      onValueChange={(id) =>
                        updateRow(row.localId, { oemId: id })
                      }
                      placeholder={S.dialog.bifurcate.wildcard}
                      wildcardLabel={S.dialog.bifurcate.wildcard}
                      triggerClassName={readOnlyTriggerClass}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Select
                      value={row.condition ?? WILDCARD}
                      onValueChange={(value) =>
                        updateRow(row.localId, {
                          condition:
                            value === WILDCARD
                              ? null
                              : (value as UserSalesTargetLineCondition),
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger className={cn("w-full", readOnlyTriggerClass)}>
                        {/* Base UI's SelectValue doesn't auto-render the
                            selected item's children — it just prints the raw
                            string value. Map it to a label here so the
                            wildcard sentinel ("__all__") shows as "All". */}
                        <SelectValue placeholder={S.dialog.bifurcate.wildcard}>
                          {row.condition ?? S.dialog.bifurcate.wildcard}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={WILDCARD}>
                          {S.dialog.bifurcate.wildcard}
                        </SelectItem>
                        {USER_SALES_TARGET_LINE_CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                    <td key={q} className="px-1 py-1">
                      <Input
                        className={cn(
                          "h-8 text-right tabular-nums",
                          readOnlyFieldClass,
                        )}
                        value={row[q]}
                        onChange={(e) =>
                          updateRow(row.localId, { [q]: e.target.value })
                        }
                        inputMode="decimal"
                        readOnly={readOnly}
                        disabled={readOnly}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-right">
                    {readOnly ? null : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow(row.localId)}
                        title={S.dialog.bifurcate.removeLine}
                        aria-label={S.dialog.bifurcate.removeLine}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {hasNextPage ? (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center p-2 text-xs text-muted-foreground"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Loading more…
              </>
            ) : (
              S.dialog.bifurcate.loadMore
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        {readOnly ? (
          <span />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + {S.dialog.bifurcate.addLine}
          </Button>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
          <Label className="text-xs text-muted-foreground">
            {S.dialog.bifurcate.linesLabel}:
          </Label>
          <span
            className={cn(
              !readOnly && sums.q1 !== headerSums.q1 && "text-destructive",
            )}
          >
            Q1 {fmt(sums.q1)}
          </span>
          <span
            className={cn(
              !readOnly && sums.q2 !== headerSums.q2 && "text-destructive",
            )}
          >
            Q2 {fmt(sums.q2)}
          </span>
          <span
            className={cn(
              !readOnly && sums.q3 !== headerSums.q3 && "text-destructive",
            )}
          >
            Q3 {fmt(sums.q3)}
          </span>
          <span
            className={cn(
              !readOnly && sums.q4 !== headerSums.q4 && "text-destructive",
            )}
          >
            Q4 {fmt(sums.q4)}
          </span>
          <span className="font-medium">
            {S.dialog.form.annual} {fmt(sums.annual)}
          </span>
        </div>
      </div>

      {/* Mismatch / overlap hints only matter when the user can save — hide
          them in read-only mode so the view stays visually calm. */}
      {!readOnly && hasOverlap ? (
        <Typography variant="helper" tone="danger" className="px-1">
          {S.dialog.bifurcate.overlapHint}
        </Typography>
      ) : null}
      {!readOnly && !hasOverlap && hasMismatch ? (
        <Typography variant="helper" tone="danger" className="px-1">
          {S.dialog.bifurcate.mismatchHint}
        </Typography>
      ) : null}
    </div>
  )
}
