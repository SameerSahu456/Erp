import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react"
import {
  ClipboardPaste,
  FileSpreadsheet,
  Layers,
  Package2,
  Plus,
  Trash2,
  Eraser,
  CornerDownLeft,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RequiredMark } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  buildLineGroups,
  extractPcColumn,
  isBlankCells,
  isHeaderCells,
  MAX_PASTE_ROWS,
  normalizeCondition,
  parsePastedCells,
  rowRoles,
  validateCells,
  validatePasteText,
  type GridIssue,
  type PastedLineGroup,
  type PastedRowRole,
} from "../../lib/paste-line-items"
import { useAllCategoriesShort } from "@modules/ims"
import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import type { LineItemColumnKey } from "./LineItemsGrid"

const P = LINE_ITEMS_STRINGS.paste

interface PasteLineItemsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Whether the builder already holds real (non-empty) lines — drives the replace/append choice. */
  hasExistingLines: boolean
  onApply: (groups: PastedLineGroup[], mode: "replace" | "append") => void
  /** Columns the host document requires on a saved line (same set the
   *  line-items grid header marks). Shown as the red `*` on the matching
   *  paste column so the sheet is prepared with the right cells filled. */
  requiredColumns?: ReadonlyArray<LineItemColumnKey>
}

// ── Grid model ──

type ColKey = "partNumber" | "category" | "condition" | "description" | "quantity" | "price"

/** Fixed Excel column order — parser/validator reads cells by this index.
 *  Matches the display order below so pasted sheets mirror what the user sees. */
const PASTE_FIELDS: readonly ColKey[] = ["partNumber", "description", "quantity", "price", "category", "condition"]

/** Display order shown in the modal — safe to rearrange. */
const COLUMNS = [
  { key: "partNumber", label: P.columns.partNumber, width: "w-40 min-w-[9rem]", placeholder: "DL360 GEN11" },
  { key: "description", label: P.columns.description, width: "min-w-[18rem]", placeholder: "HPE ProLiant DL360 Gen11 …" },
  { key: "quantity", label: P.columns.quantity, width: "w-20 min-w-[5rem]", placeholder: "1" },
  { key: "price", label: P.columns.price, width: "w-28 min-w-[7rem]", placeholder: "1424000" },
  { key: "category", label: P.columns.category, width: "w-28 min-w-[7rem]", placeholder: "Servers" },
  { key: "condition", label: P.columns.condition, width: "w-28 min-w-[6.5rem]", placeholder: "new / ref" },
] as const satisfies ReadonlyArray<{ key: ColKey; label: string; width: string; placeholder: string }>

/** Paste column → the grid column it lands in. Part Name has no paste
 *  column (it resolves from the part number), so it never marks here. */
const COL_TO_GRID_KEY: Record<ColKey, LineItemColumnKey> = {
  partNumber: "partNumber",
  category: "category",
  condition: "condition",
  description: "description",
  quantity: "qty",
  price: "price",
}
type GridRow = Record<ColKey, string>

const EMPTY_ROW = (): GridRow => ({
  partNumber: "",
  category: "",
  condition: "",
  description: "",
  quantity: "",
  price: "",
})
const INITIAL_ROWS = 8

function rowToCells(r: GridRow): string[] {
  // MUST return cells in PASTE_FIELDS order — the validator and group builder
  // read by positional index (`[pn, cat, cond, desc, qty, price]`). Returning
  // them in display order would silently feed wrong fields into validation.
  return PASTE_FIELDS.map((k) => r[k])
}

// Only the (commented-out) structure preview used this.
// function fmtInr(n: number): string {
//   return n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
// }

export function PasteLineItemsDialog({
  open,
  onOpenChange,
  hasExistingLines,
  onApply,
  requiredColumns,
}: PasteLineItemsDialogProps) {
  const requiredSet = useMemo(() => new Set(requiredColumns ?? []), [requiredColumns])
  const [rows, setRows] = useState<GridRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, EMPTY_ROW),
  )
  /** Per-row explicit role sourced from a P/C indicator column in the pasted data.
   *  null = fall back to price-based heuristic for that row. */
  const [explicitPcRoles, setExplicitPcRoles] = useState<Array<PastedRowRole | null>>([])
  const [mode, setMode] = useState<"replace" | "append">("append")
  // const [showPreview, setShowPreview] = useState(false)
  /** Problem with the last paste itself (bad format), shown as a banner until dismissed or the next paste. */
  const [pasteIssue, setPasteIssue] = useState<{
    level: "error" | "warning"
    message: string
  } | null>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  useEffect(() => {
    if (!open) return
    setRows(Array.from({ length: INITIAL_ROWS }, EMPTY_ROW))
    setExplicitPcRoles([])
    setMode(hasExistingLines ? "append" : "replace")
    // setShowPreview(false)
    setPasteIssue(null)
  }, [open, hasExistingLines])

  const cells = useMemo(() => rows.map(rowToCells), [rows])
  const roles = useMemo(() => rowRoles(cells, explicitPcRoles), [cells, explicitPcRoles])
  const parsed = useMemo(() => buildLineGroups(cells, explicitPcRoles), [cells, explicitPcRoles])
  const componentCount = parsed.groups.reduce((n, g) => n + g.components.length, 0)
  const filledRows = roles.filter((r) => r !== "blank").length

  // ── Category lookup — load once when dialog opens ──
  const { data: allCategories } = useAllCategoriesShort({ enabled: open, isActive: true })
  const knownCategories = useMemo(
    () => new Set((allCategories ?? []).map((c) => c.name.toLowerCase())),
    [allCategories],
  )

  // ── Validation ──
  const issues = useMemo(
    () =>
      validateCells(
        cells,
        knownCategories.size > 0 ? knownCategories : undefined,
        explicitPcRoles.length > 0 ? explicitPcRoles : undefined,
      ),
    [cells, knownCategories, explicitPcRoles],
  )
  const errors = issues.filter((i) => i.level === "error")
  const warnings = issues.filter((i) => i.level === "warning")
  const issueByCell = useMemo(() => {
    const m = new Map<string, GridIssue[]>()
    for (const i of issues) {
      const k = i.col === undefined ? `${i.row}` : `${i.row}:${i.col}`
      m.set(k, [...(m.get(k) ?? []), i])
    }
    return m
  }, [issues])
  const rowHasError = (ri: number) => issues.some((i) => i.row === ri && i.level === "error")
  const cellIssues = (ri: number, ci: number) => issueByCell.get(`${ri}:${ci}`) ?? []
  const rowIssues = (ri: number) => issueByCell.get(`${ri}`) ?? []
  // Any listed cell issue blocks "Add N lines" — warnings included (unknown
  // category / condition, empty description), not just red errors. The
  // dismissible paste-shape banner (extra columns ignored) is informational
  // and does not block.
  const overCap = filledRows > MAX_PASTE_ROWS
  const blocked = issues.length > 0 || pasteIssue?.level === "error" || overCap
  /** One entry per distinct message, with every row it applies to — so the summary never repeats itself. */
  const groupedIssues = useMemo(() => {
    const m = new Map<
      string,
      { level: "error" | "warning"; message: string; rows: number[]; col?: number }
    >()
    for (const i of issues) {
      const key = `${i.level}|${i.message}`
      const g = m.get(key)
      if (g) {
        if (!g.rows.includes(i.row)) g.rows.push(i.row)
      } else {
        m.set(key, { level: i.level, message: i.message, rows: [i.row], col: i.col })
      }
    }
    return [...m.values()].sort((a, b) =>
      a.level === b.level ? 0 : a.level === "error" ? -1 : 1,
    )
  }, [issues])
  const canApply = parsed.groups.length > 0 && !blocked

  // ── Cell editing ──

  function setCell(rowIdx: number, key: ColKey, value: string) {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)))
  }

  /** Write a block of pasted cells into the grid starting at (rowIdx, colIdx), growing the grid as needed. */
  function fillFrom(
    rowIdx: number,
    colIdx: number,
    block: string[][],
    pcRoles?: Array<PastedRowRole | null>,
  ) {
    if (block.length === 0) return
    // Pasted cells are in PASTE_FIELDS order; translate the clicked display
    // column to its paste-order index so Excel data lands in the right field
    // regardless of how COLUMNS is arranged.
    const startPasteIdx = PASTE_FIELDS.indexOf(COLUMNS[colIdx]?.key ?? "partNumber")
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }))
      const needed = rowIdx + block.length + 1 // keep one spare row under the paste
      while (next.length < needed) next.push(EMPTY_ROW())
      block.forEach((line, i) => {
        const target = next[rowIdx + i]!
        line.forEach((val, j) => {
          const field = PASTE_FIELDS[startPasteIdx + j]
          if (!field) return
          target[field] = val.trim()
        })
        target.condition = normalizeCondition(target.condition) ?? target.condition
      })
      return next
    })
    if (pcRoles && pcRoles.length > 0) {
      setExplicitPcRoles((prev) => {
        const next = [...prev]
        while (next.length < rowIdx) next.push(null)
        pcRoles.forEach((role, i) => { next[rowIdx + i] = role })
        return next
      })
    }
  }

  /** Guards cumulative grid size — the per-paste cap in `validatePasteText`
   *  only sees the clipboard text, so stacked pastes could otherwise push the
   *  grid past MAX_PASTE_ROWS. Returns false and surfaces an error banner when
   *  pasting the incoming block would exceed the cap. */
  function withinCapacity(incomingBlock: string[][]): boolean {
    const incoming = incomingBlock.filter((r) => !isBlankCells(r)).length
    if (filledRows + incoming > MAX_PASTE_ROWS) {
      setPasteIssue({
        level: "error",
        message: P.issues.gridExceeded(filledRows, incoming, MAX_PASTE_ROWS),
      })
      return false
    }
    return true
  }

  function handleCellPaste(e: ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) {
    const text = e.clipboardData.getData("text/plain")
    if (!text.includes("\t") && !text.includes("\n")) return // plain single value — let the input handle it
    e.preventDefault()
    const problem = validatePasteText(text)
    setPasteIssue(problem)
    if (problem?.level === "error") return
    let block = parsePastedCells(text)
    if (block.length > 1 && block[0] && isHeaderCells(block[0])) block = block.slice(1)
    const extracted = extractPcColumn(block)
    if (extracted) block = extracted.cells
    if (!withinCapacity(block)) return
    fillFrom(rowIdx, colIdx, block, extracted?.pcRoles)
    // setShowPreview(true)
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setPasteIssue({ level: "error", message: P.issues.clipboardEmpty })
        return
      }
      const problem = validatePasteText(text)
      setPasteIssue(problem)
      if (problem?.level === "error") return
      let block = parsePastedCells(text)
      if (block[0] && isHeaderCells(block[0])) block = block.slice(1)
      const extracted = extractPcColumn(block)
      if (extracted) block = extracted.cells
      if (!withinCapacity(block)) return
      // Drop into the first trailing empty row so repeated pastes stack instead of overwriting.
      const firstEmpty = roles.findIndex(
        (r, i) => r === "blank" && roles.slice(i).every((x) => x === "blank"),
      )
      fillFrom(firstEmpty === -1 ? rows.length : firstEmpty, 0, block, extracted?.pcRoles)
      // setShowPreview(true)
    } catch {
      setPasteIssue({ level: "warning", message: P.issues.clipboardBlocked })
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) {
    const move = (r: number, c: number) => {
      const col = COLUMNS[c]
      if (!col) return
      if (r >= rows.length) setRows((prev) => [...prev, EMPTY_ROW()])
      requestAnimationFrame(() => inputRefs.current.get(`${r}:${col.key}`)?.focus())
    }
    if (e.key === "Enter") {
      e.preventDefault()
      move(rowIdx + 1, colIdx)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      move(rowIdx + 1, colIdx)
    } else if (e.key === "ArrowUp" && rowIdx > 0) {
      e.preventDefault()
      move(rowIdx - 1, colIdx)
    }
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()])
    setExplicitPcRoles((prev) => [...prev, null])
  }

  function insertBlankAfter(rowIdx: number) {
    setRows((prev) => [...prev.slice(0, rowIdx + 1), EMPTY_ROW(), ...prev.slice(rowIdx + 1)])
    setExplicitPcRoles((prev) => [...prev.slice(0, rowIdx + 1), null, ...prev.slice(rowIdx + 1)])
  }

  function removeRow(rowIdx: number) {
    setRows((prev) => (prev.length <= 1 ? [EMPTY_ROW()] : prev.filter((_, i) => i !== rowIdx)))
    setExplicitPcRoles((prev) => (prev.length <= 1 ? [] : prev.filter((_, i) => i !== rowIdx)))
  }

  function clearAll() {
    setRows(Array.from({ length: INITIAL_ROWS }, EMPTY_ROW))
    setExplicitPcRoles([])
    // setShowPreview(false)
    setPasteIssue(null)
  }

  function handleApply() {
    if (!canApply) return
    onApply(parsed.groups, mode)
    onOpenChange(false)
  }

  // A stray click outside must not discard a half-prepared paste — the grid
  // can hold up to 100 rows. Close only via Cancel, the X, or Esc.
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-7xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            {P.title}
          </DialogTitle>
          <DialogDescription>{P.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Paste problem banner */}
          {pasteIssue && (
            <div
              role="alert"
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                pasteIssue.level === "error"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-warning/40 bg-warning/5 text-warning",
              )}
            >
              {pasteIssue.level === "error" ? (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span className="flex-1">{pasteIssue.message}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted"
                onClick={() => setPasteIssue(null)}
                aria-label={P.dismiss}
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Validation summary */}
          {(errors.length > 0 || warnings.length > 0) && filledRows > 0 && (
            <div
              role={errors.length > 0 ? "alert" : "status"}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                errors.length > 0
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-warning/40 bg-warning/5",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 font-medium",
                  errors.length > 0 ? "text-destructive" : "text-warning",
                )}
              >
                {errors.length > 0 ? (
                  <AlertCircle className="size-3.5" />
                ) : (
                  <AlertTriangle className="size-3.5" />
                )}
                {errors.length > 0 ? P.summary.fixRed : P.summary.fixHighlighted}
              </div>
              <Typography asChild variant="caption">
              <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto pl-5">
                {groupedIssues.map((g) => (
                  <li
                    key={`${g.level}|${g.message}`}
                    className={cn("list-disc", g.level === "warning" && "text-muted-foreground")}
                  >
                    <span>{g.message}</span>{" "}
                    <span className="text-muted-foreground">
                      ({g.rows.length === 1 ? P.summary.row : P.summary.rows}{" "}
                      {g.rows.map((r, k) => (
                        <span key={r}>
                          {k > 0 && ", "}
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() =>
                              inputRefs.current
                                .get(`${r}:${PASTE_FIELDS[g.col ?? 0]!}`)
                                ?.focus()
                            }
                          >
                            {r + 1}
                          </button>
                        </span>
                      ))}
                      )
                    </span>
                  </li>
                ))}
              </ul>
              </Typography>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" size="sm">
                <Package2 />
                {P.parentCount(parsed.groups.length)}
              </Badge>
              <Badge variant="outline" size="sm">
                <Layers />
                {P.componentCount(componentCount)}
              </Badge>
              {parsed.skippedRows > 0 && (
                <Typography variant="helper" tone="warning">{P.skippedRows(parsed.skippedRows)}</Typography>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={pasteFromClipboard}
              >
                <ClipboardPaste />
                {P.pasteFromClipboard}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
              >
                <Plus />
                {P.row}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={clearAll}
                disabled={filledRows === 0}
              >
                <Eraser />
                {P.clear}
              </Button>
            </div>
          </div>

          {/* Spreadsheet grid */}
          <div className="overflow-hidden rounded-lg border">
            <div className="cpt-edit-grid-scroll">
            <table className="cpt-edit-grid min-w-[820px]">
              <thead>
                <tr>
                  <th className="w-8 center">#</th>
                  <th className="w-10 center" title={P.pcTitle}>
                    P/C
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        (c.key === "quantity" || c.key === "price") && "right",
                        c.width,
                      )}
                    >
                      {c.label}
                      {requiredSet.has(COL_TO_GRID_KEY[c.key]) && (
                        <RequiredMark className="ml-0.5" />
                      )}
                    </th>
                  ))}
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const role = roles[ri] ?? "blank"
                  const isParent = role === "parent"
                  const isComponent = role === "component"
                  return (
                    <tr
                      key={ri}
                      className={cn(
                        "group",
                        isComponent && "is-component",
                        rowHasError(ri) && "is-error",
                      )}
                    >
                      <td
                        className="center"
                        title={rowIssues(ri).map((i) => i.message).join("\n") || undefined}
                      >
                        {rowHasError(ri) ? (
                          <AlertCircle className="mx-auto size-3.5 text-destructive" />
                        ) : (
                          <Typography variant="helper" tone="muted" numeric>{ri + 1}</Typography>
                        )}
                      </td>
                      <td className="center">
                        {isParent && (
                          <Badge variant="primary-soft" size="sm" className="size-5 px-0 text-primary" title={P.parentTitle}>
                            P
                          </Badge>
                        )}
                        {isComponent && (
                          <Badge variant="grey" size="sm" className="size-5 px-0" title={P.componentTitle}>
                            C
                          </Badge>
                        )}
                      </td>
                      {COLUMNS.map((c, ci) => {
                        // Validator's `col` is paste-order; map display ci → paste col for the lookup.
                        const pasteCol = PASTE_FIELDS.indexOf(c.key)
                        const cIssues = [
                          ...cellIssues(ri, pasteCol),
                          ...(ci === 0 ? rowIssues(ri) : []),
                        ].filter(
                          (i, k, arr) => arr.findIndex((o) => o.message === i.message) === k,
                        )
                        const cError = cIssues.some((i) => i.level === "error")
                        const cWarn = !cError && cIssues.length > 0
                        return (
                          <td
                            key={c.key}
                            className={cn("cell-field", isComponent && ci === 0 && "pl-3!")}
                          >
                            <input
                              ref={(el) => {
                                const k = `${ri}:${c.key}`
                                if (el) inputRefs.current.set(k, el)
                                else inputRefs.current.delete(k)
                              }}
                              value={row[c.key]}
                              onChange={(e) => setCell(ri, c.key, e.target.value)}
                              onPaste={(e) => handleCellPaste(e, ri, ci)}
                              onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                              placeholder={ri === 0 ? c.placeholder : ""}
                              spellCheck={false}
                              inputMode={
                                c.key === "quantity" || c.key === "price" ? "decimal" : "text"
                              }
                              aria-invalid={cError || undefined}
                              title={
                                cIssues.length > 0
                                  ? cIssues.map((i) => i.message).join("\n")
                                  : c.key === "price"
                                    ? P.priceHint
                                    : undefined
                              }
                              data-warn={cWarn || undefined}
                              className={cn(
                                "cell-input",
                                (c.key === "quantity" || c.key === "price") && "right",
                                c.key === "partNumber" && "font-mono",
                                isParent && c.key === "partNumber" && "font-semibold",
                              )}
                            />
                          </td>
                        )
                      })}
                      <td className="center">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title={P.insertRowBelow}
                            aria-label={P.insertRowBelow}
                            className="text-muted-foreground"
                            onClick={() => insertBlankAfter(ri)}
                          >
                            <CornerDownLeft />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title={P.removeRow}
                            aria-label={P.removeRow}
                            className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            onClick={() => removeRow(ri)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
          <Typography variant="caption" tone="muted" className="block">{P.tip}</Typography>

          {/* Preview of resulting quote structure — commented out (2026-10-16):
              the "Show how this lands in the line items" toggle + card list
              is hidden; the sheet grid above is the only preview now.
          {canApply && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-primary"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? P.preview.hide : P.preview.show}
              </Button>
              {showPreview && (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                  {parsed.groups.map((g, gi) => (
                    <div key={gi} className="rounded-md border bg-background p-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Typography variant="mono" className="font-semibold">
                              {g.parent.partNumber || "—"}
                            </Typography>
                            {g.parent.category && (
                              <Badge variant="secondary" size="sm">
                                {g.parent.category}
                              </Badge>
                            )}
                            {g.parent.condition && (
                              <Badge variant="outline" size="sm">
                                {g.parent.condition}
                              </Badge>
                            )}
                          </div>
                          <Typography asChild variant="caption" tone="muted">
                            <p className="mt-0.5 line-clamp-2">{g.parent.description}</p>
                          </Typography>
                        </div>
                        <Typography asChild variant="helper" numeric align="end">
                        <div className="shrink-0">
                          <div>
                            {P.preview.qty} {g.parent.qty}
                          </div>
                          <div className="font-semibold">
                            {g.parent.price !== undefined ? (
                              `₹${fmtInr(g.parent.price)}`
                            ) : (
                              <span className="text-warning">{P.preview.noPrice}</span>
                            )}
                          </div>
                        </div>
                        </Typography>
                      </div>
                      {g.components.length > 0 && (
                        <Typography asChild variant="caption">
                        <ul className="mt-2 space-y-0.5 border-l-2 border-muted pl-2.5">
                          {g.components.map((c, ci) => (
                            <li
                              key={ci}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="min-w-0 truncate">
                                <span className="font-mono font-medium">
                                  {c.partNumber || "—"}
                                </span>
                                {c.description && (
                                  <span className="text-muted-foreground"> · {c.description}</span>
                                )}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                ×{c.qty}
                              </span>
                            </li>
                          ))}
                        </ul>
                        </Typography>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          */}
        </div>

        <DialogFooter className="mx-0 mb-0 flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Append/Replace mode radios hidden by request — default mode is set
              in the open-effect: `append` when the builder has existing lines,
              `replace` otherwise. Uncomment to restore the user choice.
          {hasExistingLines ? (
            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="paste-mode"
                  checked={mode === "append"}
                  onChange={() => setMode("append")}
                  className="accent-primary"
                />
                {P.modeAppend}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="paste-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="accent-primary"
                />
                {P.modeReplace}
              </label>
            </div>
          ) : (
            <span />
          )}
          */}
          <span />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {P.cancel}
            </Button>
            <Button type="button" size="sm" disabled={!canApply} onClick={handleApply}>
              {P.addLines(parsed.groups.length)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
