import { useState } from "react"

import { stripHtml } from "@/lib/utils"

import { genId } from "../../components/quotes/quoteBuilderShared"
import type {
  HydrateRowWire,
  QuoteTermPayload,
  QuoteTermWire,
} from "../../api"

/**
 * One editable Terms & Conditions clause in the quote builder.
 *
 * `title`/`body` are the UI-facing names (mapped to the backend's
 * `heading`/`body_html` at the API boundary). `isFixed` locks the clause to
 * its sort position — a fixed clause can't be dragged, moved, or removed, and
 * nothing may displace it (enforced here; the backend only STORES the flag).
 * `sourceTemplateRowId` is the breadcrumb to the seeding brand-template row
 * (null = added ad-hoc by sales).
 */
export interface EditableClause {
  id: string
  title: string
  body: string
  isFixed: boolean
  /** Whether sales may edit this clause's title/body. `false` disables both
   *  inputs. Defaults to `true` when the backend omits `is_editable`. */
  isEditable: boolean
  /** Whether sales may delete this clause. `false` disables the remove button.
   *  Defaults to `true` when the backend omits `is_deletable`. */
  isDeletable: boolean
  sourceTemplateRowId: string | null
}

/** Which of a clause's fields are currently failing the empty-field check. */
export interface ClauseFieldErrors {
  title?: boolean
  body?: boolean
}

// ── Mapping helpers (FE ↔ BE) ──────────────────────────────────────────────

/** Hydrate template row → editable clause (fresh UI id each time). */
export function clauseFromRow(row: HydrateRowWire): EditableClause {
  return {
    id: genId("tc"),
    title: row.heading,
    body: row.body_html,
    isFixed: row.is_fixed,
    isEditable: row.is_editable ?? true,
    isDeletable: row.is_deletable ?? true,
    sourceTemplateRowId: row.id,
  }
}

/** Saved quote-term snapshot row (edit mode) → editable clause. */
export function clauseFromTerm(term: QuoteTermWire): EditableClause {
  return {
    id: genId("tc"),
    title: term.heading,
    body: term.body_html,
    isFixed: term.is_fixed,
    isEditable: term.is_editable ?? true,
    isDeletable: term.is_deletable ?? true,
    sourceTemplateRowId: term.source_template_row_id,
  }
}

/**
 * Editable clauses → the `terms[]` save payload. `sequence` is recomputed
 * 1-based over the final order — fixed clauses keep their number because they
 * never move.
 *
 * All three permission flags are persisted so they round-trip on edit/amend:
 * clauses seeded from a template carry the template's `is_fixed` /
 * `is_editable` / `is_deletable`; ad-hoc clauses added by sales carry
 * `false` / `true` / `true` (set in `addClause`).
 */
export function clausesToPayload(clauses: EditableClause[]): QuoteTermPayload[] {
  return clauses.map((c, i) => ({
    sequence: i + 1,
    heading: c.title.trim(),
    body_html: c.body,
    is_fixed: c.isFixed,
    is_editable: c.isEditable,
    is_deletable: c.isDeletable,
    source_template_row_id: c.sourceTemplateRowId,
  }))
}

// ── Fixed-aware reordering ──────────────────────────────────────────────────
//
// A fixed clause is pinned to its ABSOLUTE index, so its sequence number never
// changes (c3 stays 3, c6 stays 6). Movable clauses reorder among the remaining
// (non-fixed) slots and MAY move past a fixed clause — the fixed one simply
// holds its slot while the movable ones flow around it. We reorder the movable
// subsequence, then re-interleave the fixed clauses back at their old indices.

/** Rebuild the full list from a reordered movable subsequence, dropping the
 *  fixed clauses back at their original absolute indices. */
function reassembleWithFixed(
  original: EditableClause[],
  nextMovable: EditableClause[],
): EditableClause[] {
  const result: EditableClause[] = []
  let mi = 0
  for (const c of original) {
    result.push(c.isFixed ? c : nextMovable[mi++])
  }
  return result
}

/**
 * Move `sourceId` into `targetId`'s slot among the movable clauses. No-op if
 * either clause is fixed (a fixed clause can't move and can't be displaced).
 * Fixed clauses keep their sequence; movable clauses may cross them. Exported
 * for unit tests.
 */
export function reorderKeepingFixed(
  clauses: EditableClause[],
  sourceId: string,
  targetId: string,
): EditableClause[] {
  if (sourceId === targetId) return clauses
  const source = clauses.find((c) => c.id === sourceId)
  const target = clauses.find((c) => c.id === targetId)
  if (!source || !target || source.isFixed || target.isFixed) return clauses

  const movable = clauses.filter((c) => !c.isFixed)
  const from = movable.findIndex((c) => c.id === sourceId)
  const to = movable.findIndex((c) => c.id === targetId)
  if (from < 0 || to < 0) return clauses

  const nextMovable = [...movable]
  nextMovable.splice(from, 1)
  // Insert at the target's ORIGINAL movable index: a downward drag lands the
  // clause just AFTER the target (so it can reach the last movable slot), an
  // upward drag lands it just BEFORE. Re-finding the target post-removal would
  // always insert before it — the bug that made top→bottom drags impossible.
  nextMovable.splice(to, 0, source)
  return reassembleWithFixed(clauses, nextMovable)
}

/** Nudge a non-fixed clause one slot up (dir -1) or down (dir +1) among the
 *  movable clauses — skipping over any fixed clause in between (it keeps its
 *  slot; the movable clause flows around it). No-op at the movable list's
 *  boundary or for a fixed clause. Exported for unit tests. */
export function moveKeepingFixed(
  clauses: EditableClause[],
  id: string,
  dir: -1 | 1,
): EditableClause[] {
  const clause = clauses.find((c) => c.id === id)
  if (!clause || clause.isFixed) return clauses
  const movable = clauses.filter((c) => !c.isFixed)
  const idx = movable.findIndex((c) => c.id === id)
  const target = idx + dir
  if (idx < 0 || target < 0 || target >= movable.length) return clauses
  return reorderKeepingFixed(clauses, id, movable[target].id)
}

/**
 * Insert a new (movable) clause immediately before the trailing run of fixed
 * clauses — so a fixed clause pinned to the end stays last. This holds even
 * after every movable clause above it has been deleted: with only a trailing
 * fixed clause left, the new clause is placed before it (not appended after).
 * Exported for unit tests.
 */
export function insertKeepingFixed(
  clauses: EditableClause[],
  clause: EditableClause,
): EditableClause[] {
  // Count the maximal suffix of fixed clauses; the insertion point is right
  // before it. When nothing is fixed this is the end (plain append); when
  // only a trailing fixed clause remains this is index 0, keeping it last.
  let trailingFixed = 0
  for (let i = clauses.length - 1; i >= 0 && clauses[i].isFixed; i--) {
    trailingFixed++
  }
  const at = clauses.length - trailingFixed
  const next = [...clauses]
  next.splice(at, 0, clause)
  return next
}

// ── Controller ──────────────────────────────────────────────────────────────

interface UseQuoteClausesOptions {
  /** Initial clause list — seeded from a saved quote's terms (edit mode) or
   *  empty (create, until a vertical is picked and hydrated). */
  initialClauses: EditableClause[]
  /** Display name of the selected brand — drives the badge + the "Reset to
   *  <brand> default" label. `null` until a vertical is chosen. */
  brandName: string | null
  /** Fired by the "Reset to <brand> default" button. The builder owns the
   *  re-hydrate call + toast (it holds the brand code + API). */
  onResetToDefaults: () => void
  /** True while a hydrate/reset request is in flight — disables the reset
   *  button so the user can't stack requests. */
  resetting?: boolean
}

/**
 * Controller for the Quote Terms & Conditions clause builder. Owns the local
 * clause list + accordion/drag UI state. Seeded from the API (via
 * `initialClauses` / `replaceClauses`), never from hardcoded data. Fixed
 * clauses are position-locked (see `reorderKeepingFixed`). See
 * `comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md`.
 */
export function useQuoteClauses(opts: UseQuoteClausesOptions) {
  const [clauses, setClauses] = useState<EditableClause[]>(opts.initialClauses)
  /** Tracks hand-edits (text/order/add/remove) — drives the "Edited" badge
   *  and the warn-on-brand-switch guard. Reset by `replaceClauses`. */
  const [termsEdited, setTermsEdited] = useState(false)
  /** Ids of expanded clauses. Empty by default so the section stays compact. */
  const [openClauseIds, setOpenClauseIds] = useState<Set<string>>(() => new Set())
  /** Whether the whole clause list is revealed. Hidden by default. */
  const [listOpen, setListOpen] = useState(false)
  /** Drag-to-reorder state. */
  const [dragClauseId, setDragClauseId] = useState<string | null>(null)
  const [dragOverClauseId, setDragOverClauseId] = useState<string | null>(null)
  /** Per-clause empty-field validation flags, keyed by clause id. Set by
   *  `validateClauses` on a save attempt; each field clears as the user types
   *  a non-empty value into it (see `updateClause`). */
  const [clauseErrors, setClauseErrors] = useState<Record<string, ClauseFieldErrors>>({})

  /** Replace the whole clause list (hydrate / reset). Returns the section to
   *  its pristine, unedited state.
   *
   *  Collapses the section by default (used when switching vertical — a new
   *  brand's clauses start compact). Pass `{ preserveOpenState: true }` from
   *  "Reset to <brand> default" so the section stays exactly as the user left
   *  it: still revealed, and still fully expanded if it was. Clause ids change
   *  on replace, so per-clause open state can only be carried over wholesale. */
  function replaceClauses(next: EditableClause[], opts?: { preserveOpenState?: boolean }) {
    if (opts?.preserveOpenState) {
      const wasAllOpen = clauses.length > 0 && clauses.every((c) => openClauseIds.has(c.id))
      setOpenClauseIds(wasAllOpen ? new Set(next.map((c) => c.id)) : new Set())
    } else {
      setOpenClauseIds(new Set())
      setListOpen(false)
    }
    setClauses(next)
    setTermsEdited(false)
    setClauseErrors({})
  }

  const isBodyBlank = (body: string) => stripHtml(body).trim().length === 0

  /** Validate every editable clause has a non-empty title + body. Locked
   *  (non-editable) clauses are skipped — the user can't fix them, so they
   *  must never block save. Sets the inline error flags and expands any
   *  offending clause so the user sees it. Returns true when all valid. */
  function validateClauses(): boolean {
    const errs: Record<string, ClauseFieldErrors> = {}
    for (const c of clauses) {
      if (!c.isEditable) continue
      const titleBlank = c.title.trim().length === 0
      const bodyBlank = isBodyBlank(c.body)
      if (titleBlank || bodyBlank) {
        errs[c.id] = {
          ...(titleBlank ? { title: true } : {}),
          ...(bodyBlank ? { body: true } : {}),
        }
      }
    }
    setClauseErrors(errs)
    const invalidIds = Object.keys(errs)
    if (invalidIds.length > 0) {
      setListOpen(true)
      setOpenClauseIds((prev) => {
        const nextSet = new Set(prev)
        invalidIds.forEach((id) => nextSet.add(id))
        return nextSet
      })
    }
    return invalidIds.length === 0
  }

  function toggleClause(id: string) {
    setOpenClauseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() {
    setListOpen(true)
    setOpenClauseIds(new Set(clauses.map((c) => c.id)))
  }

  function collapseAll() {
    setListOpen(false)
    setOpenClauseIds(new Set())
  }

  function updateClause(id: string, patch: Partial<Pick<EditableClause, "title" | "body">>) {
    setClauses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    setTermsEdited(true)
    // Clear a field's inline error as soon as the user gives it a value.
    setClauseErrors((prev) => {
      const current = prev[id]
      if (!current) return prev
      const nextForClause: ClauseFieldErrors = { ...current }
      if (patch.title !== undefined && patch.title.trim().length > 0) delete nextForClause.title
      if (patch.body !== undefined && !isBodyBlank(patch.body)) delete nextForClause.body
      const next = { ...prev }
      if (!nextForClause.title && !nextForClause.body) delete next[id]
      else next[id] = nextForClause
      return next
    })
  }

  function addClause() {
    const clause: EditableClause = {
      id: genId("tc"),
      title: "",
      body: "",
      isFixed: false,
      isEditable: true,
      isDeletable: true,
      sourceTemplateRowId: null,
    }
    // Insert before any trailing fixed clause so a "last" fixed clause stays last.
    setClauses((prev) => insertKeepingFixed(prev, clause))
    setListOpen(true)
    setOpenClauseIds((prev) => new Set(prev).add(clause.id))
    setTermsEdited(true)
  }

  function removeClause(id: string) {
    setClauses((prev) => {
      const clause = prev.find((c) => c.id === id)
      // Only deletable clauses can be removed (the control is disabled too).
      if (!clause || !clause.isDeletable) return prev
      return prev.filter((c) => c.id !== id)
    })
    setOpenClauseIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setClauseErrors((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setTermsEdited(true)
  }

  function moveClause(id: string, dir: -1 | 1) {
    setClauses((prev) => moveKeepingFixed(prev, id, dir))
    setTermsEdited(true)
  }

  /** Drag a clause onto another to drop it into that position (fixed-aware). */
  function reorderClause(sourceId: string, targetId: string) {
    setClauses((prev) => reorderKeepingFixed(prev, sourceId, targetId))
    setTermsEdited(true)
  }

  return {
    brandName: opts.brandName,
    resetting: opts.resetting ?? false,
    clauses,
    replaceClauses,
    clauseErrors,
    validateClauses,
    termsEdited,
    openClauseIds,
    listOpen,
    dragClauseId,
    dragOverClauseId,
    setDragClauseId,
    setDragOverClauseId,
    toggleClause,
    expandAll,
    collapseAll,
    updateClause,
    addClause,
    removeClause,
    moveClause,
    reorderClause,
    resetToDefaults: opts.onResetToDefaults,
  }
}

export type QuoteClausesController = ReturnType<typeof useQuoteClauses>