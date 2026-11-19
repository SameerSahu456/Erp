import { useState } from "react";

import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronUp,
  FileText,
  GripVertical,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FieldError } from "@/components/common/forms/FieldError";

import type { QuoteClausesController } from "../../hooks/quotes/useQuoteClauses";
import { QUOTES_STRINGS } from "./quotes.strings";

const V = QUOTES_STRINGS.validation;
const CL = QUOTES_STRINGS.builder.clauses;

/**
 * Quote → Terms & Conditions clause builder. State is owned by the caller
 * (`useQuoteClauses`, lifted into the quote builder) and shared with the
 * header-level Business Vertical selector. Clauses are seeded from the brand
 * hydrate API and persisted on the quote's `terms[]`. Fixed clauses are
 * position-locked (drag/move/remove disabled). See `comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md`.
 */
export function QuoteClauseSection({
  c,
  readOnly = false,
  resolveBody,
}: {
  c: QuoteClausesController;
  /** Detail/view page: clauses stay expandable (to read) but every editing
   *  control is hidden and bodies render as plain text. */
  readOnly?: boolean;
  /** Display-only transform applied to a clause body in read-only mode —
   *  used to resolve the `{{quote.validity_days}}` token against the quote's
   *  current validity date. Deliberately NOT applied to the editable textarea,
   *  so editing keeps the raw token and it round-trips (stays dynamic). */
  resolveBody?: (body: string) => string;
}) {
  const {
    brandName,
    resetting,
    clauses,
    clauseErrors,
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
    resetToDefaults,
  } = c;

  // Read-only (detail page) collapse state, owned HERE rather than in
  // `useQuoteClauses`: the hook's `listOpen` starts false for the builder, and
  // the detail page needs its own initial value rather than a second meaning
  // bolted onto the shared flag. Starts CLOSED so the section loads compact —
  // "Expand all" then opens the list and every body at once (see `toggleList`).
  const [readOnlyListOpen, setReadOnlyListOpen] = useState(false);

  // The list previously had NO collapse on the detail page: the toggle was a
  // real <button>, and the detail page wraps this section in a
  // `<fieldset disabled>` (QuoteBuilderBody), which natively freezes every
  // nested form control — so the button would have rendered permanently dead.
  // It is now rendered as a <div role="button"> in read-only mode, the same
  // escape hatch the per-clause toggles below already use: a <div> is not a
  // form control, so `fieldset[disabled]` cannot reach it.
  const listExpanded = readOnly ? readOnlyListOpen : listOpen;
  const showList = listExpanded;

  /** Collapse-all / expand-all — IDENTICAL in both modes.
   *
   *  "Expand all" opens the list AND every clause body; "Collapse all" shuts
   *  both. The detail page deliberately does not do its own titles-only
   *  variant: the control is labelled "Expand all", so expanding only the
   *  titles leaves eleven rows the user still has to click one by one, and the
   *  same label would mean two different things depending on the page.
   *
   *  `expandAll` / `collapseAll` also drive the shared `listOpen`, which is
   *  what the builder reads; `readOnlyListOpen` mirrors it for the detail page
   *  (see above). Both are set together so the two never disagree. */
  const toggleList = () => {
    if (listExpanded) {
      collapseAll();
      setReadOnlyListOpen(false);
    } else {
      expandAll();
      setReadOnlyListOpen(true);
    }
  };

  // Movable clauses can flow past fixed ones, so the up/down arrows are gated
  // on the first/last MOVABLE clause — not the absolute first/last row (a
  // movable clause below a fixed one can still move up past it).
  const movableIds = clauses.filter((c) => !c.isFixed).map((c) => c.id);
  const firstMovableId = movableIds[0];
  const lastMovableId = movableIds[movableIds.length - 1];

  return (
    <div className="quote-clause-section space-y-4">
      {/* ── Terms & Conditions ── */}
      <div className="overflow-hidden rounded-xl border bg-gradient-to-b from-muted/30 to-transparent">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-[18px]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Typography variant="card-title" asChild>
                  <h3>Terms &amp; Conditions</h3>
                </Typography>
                {brandName && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    <Tag className="size-2.5" />
                    {brandName}
                  </Badge>
                )}
                {termsEdited && (
                  <Badge variant="warning" size="sm">
                    Edited
                  </Badge>
                )}
              </div>
              <Typography variant="helper" tone="muted" asChild>
                <p>
                  {clauses.length} clause{clauses.length === 1 ? "" : "s"}
                </p>
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {clauses.length > 0 &&
              (readOnly ? (
                // <div>, not <Button>: the detail page's `<fieldset disabled>`
                // would render a real button permanently dead. Keyboard support
                // is wired by hand for the same reason a native button can't be
                // used — mirrors the per-clause toggle below.
                <div
                  role="button"
                  tabIndex={0}
                  onClick={toggleList}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleList();
                    }
                  }}
                  aria-expanded={listExpanded}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {listExpanded ? (
                    <ChevronsDownUp className="size-3.5" />
                  ) : (
                    <ChevronsUpDown className="size-3.5" />
                  )}
                  <Typography variant="helper" tone="inherit" asChild>
                    <span>{listExpanded ? CL.collapseAll : CL.expandAll}</span>
                  </Typography>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleList}
                >
                  {listExpanded ? (
                    <>
                      <ChevronsDownUp className="size-3.5" />
                      {CL.collapseAll}
                    </>
                  ) : (
                    <>
                      <ChevronsUpDown className="size-3.5" />
                      {CL.expandAll}
                    </>
                  )}
                </Button>
              ))}
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                disabled={!brandName || resetting}
              >
                <RotateCcw className="size-3.5" />
                {brandName
                  ? `Reset to ${brandName} default`
                  : "Reset to default"}
              </Button>
            )}
          </div>
        </div>

        {/* Clause list */}
        <div className="space-y-2.5 p-3.5">
          {!showList ? (
            // Detail page renders a <div role="button">: this section sits
            // inside a `<fieldset disabled>` there (QuoteBuilderBody), which
            // natively kills every nested form control, so a real button would
            // be permanently dead. Builder keeps the native button.
            readOnly ? (
              <div
                role="button"
                tabIndex={0}
                onClick={toggleList}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleList();
                  }
                }}
                aria-expanded={false}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronsUpDown className="size-4 text-muted-foreground" />
                <Typography variant="body-strong" tone="muted">
                  {`${clauses.length} clause${clauses.length === 1 ? "" : "s"} hidden · ${CL.expandAll} to view`}
                </Typography>
              </div>
            ) : (
              <button
                type="button"
                onClick={expandAll}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <ChevronsUpDown className="size-4 text-muted-foreground" />
                <Typography variant="body-strong" tone="muted">
                  {clauses.length === 0
                    ? "No clauses — add one or reset to defaults"
                    : `${clauses.length} clause${clauses.length === 1 ? "" : "s"} hidden · Expand all to view & edit`}
                </Typography>
              </button>
            )
          ) : (
            <>
              {clauses.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed py-8 text-center">
                  <FileText className="size-5 text-muted-foreground/50" />
                  <Typography variant="body" tone="muted">
                    No clauses yet
                  </Typography>
                  <Typography variant="helper" tone="muted">
                    {brandName
                      ? `Add a clause or reset to the ${brandName} template.`
                      : "Select a vertical to load its template, or add a clause."}
                  </Typography>
                </div>
              )}

              {clauses.map((clause, index) => {
                const isOpen = openClauseIds.has(clause.id);
                return (
                  <div
                    key={clause.id}
                    onDragOver={(e) => {
                      // Fixed clauses are locked to their slot — never a drop target.
                      if (!dragClauseId || clause.isFixed) return;
                      e.preventDefault();
                      if (dragOverClauseId !== clause.id)
                        setDragOverClauseId(clause.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragClauseId) reorderClause(dragClauseId, clause.id);
                      setDragClauseId(null);
                      setDragOverClauseId(null);
                    }}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
                      dragClauseId === clause.id && "opacity-50",
                      dragOverClauseId === clause.id &&
                        dragClauseId !== clause.id
                        ? "border-primary ring-2 ring-primary/30"
                        : isOpen
                          ? "border-primary/40 shadow-md ring-1 ring-primary/10"
                          : "hover:border-primary/30",
                    )}
                  >
                    {/* Collapsed header — click to expand */}
                    <div className="flex items-center gap-1.5 p-2">
                      {/* Drag handle (editing only) */}
                      {!readOnly && (
                        <div
                          draggable={!clause.isFixed}
                          onDragStart={() => {
                            if (clause.isFixed) return;
                            setDragClauseId(clause.id);
                          }}
                          onDragEnd={() => {
                            setDragClauseId(null);
                            setDragOverClauseId(null);
                          }}
                          className={cn(
                            "flex items-center self-stretch px-0.5 text-muted-foreground/50",
                            clause.isFixed
                              ? "cursor-not-allowed opacity-40"
                              : "cursor-grab hover:text-muted-foreground active:cursor-grabbing",
                          )}
                          aria-label={
                            clause.isFixed
                              ? "Fixed clause — locked position"
                              : "Drag to reorder"
                          }
                          title={
                            clause.isFixed
                              ? "Fixed clause — locked position"
                              : "Drag to reorder"
                          }
                        >
                          <GripVertical className="size-4" />
                        </div>
                      )}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleClause(clause.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleClause(clause.id);
                          }
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md"
                        aria-expanded={isOpen}
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Typography
                            variant="helper"
                            tone="inherit"
                            numeric
                            asChild
                          >
                            <span className="font-bold">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </Typography>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Typography
                            variant="card-title"
                            tone="muted"
                            truncate
                            asChild
                          >
                            <p>
                              {isOpen && !readOnly
                                ? "Editing clause"
                                : clause.title
                                  ? `${String(index + 1).padStart(2, "0")} · ${clause.title}`
                                  : `Clause ${String(index + 1).padStart(2, "0")}`}
                            </p>
                          </Typography>
                        </div>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </div>

                      {/* Controls (editing only) */}
                      {!readOnly && (
                        <div className="flex shrink-0 items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={
                              clause.isFixed || clause.id === firstMovableId
                            }
                            onClick={() => moveClause(clause.id, -1)}
                            aria-label="Move clause up"
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={
                              clause.isFixed || clause.id === lastMovableId
                            }
                            onClick={() => moveClause(clause.id, 1)}
                            aria-label="Move clause down"
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            disabled={!clause.isDeletable}
                            onClick={() => removeClause(clause.id)}
                            aria-label={
                              clause.isDeletable
                                ? "Remove clause"
                                : "This clause cannot be removed"
                            }
                            title={
                              clause.isDeletable
                                ? undefined
                                : "This clause cannot be removed"
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expanded body — read-only text on the detail page, editable
                        inputs otherwise. A clause with `isEditable=false` shows
                        disabled inputs (locked by the backend). */}
                    {isOpen && (
                      <div className="space-y-5 border-t bg-muted/10 px-5 py-5 pl-12">
                        {readOnly ? (
                          <>
                            {clause.title && (
                              <Typography variant="body-strong" asChild>
                                <p>{clause.title}</p>
                              </Typography>
                            )}
                            <Typography variant="body" tone="muted" asChild>
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {resolveBody
                                  ? resolveBody(clause.body)
                                  : clause.body}
                              </p>
                            </Typography>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label
                                className="font-ui"
                                htmlFor={`clause-title-${clause.id}`}
                                required={clause.isEditable}
                              >
                                Title
                              </Label>
                              <Input
                                id={`clause-title-${clause.id}`}
                                placeholder="Clause title (e.g. Validity)"
                                value={clause.title}
                                onChange={(e) =>
                                  updateClause(clause.id, {
                                    title: e.target.value,
                                  })
                                }
                                disabled={!clause.isEditable}
                                title={
                                  clause.isEditable
                                    ? undefined
                                    : "This clause is locked and cannot be edited"
                                }
                                className="h-9"
                                // Commented out: with "Expand all" every clause
                                // mounts at once, the last one grabs focus and
                                // the browser scrolls it into view — the page
                                // jumps down. Leave focus where the user put it.
                                // autoFocus={clause.isEditable}
                                aria-invalid={Boolean(
                                  clauseErrors[clause.id]?.title,
                                )}
                                aria-describedby={
                                  clauseErrors[clause.id]?.title
                                    ? `clause-title-${clause.id}-error`
                                    : undefined
                                }
                              />
                              <FieldError
                                id={`clause-title-${clause.id}-error`}
                                message={
                                  clauseErrors[clause.id]?.title
                                    ? V.clauseTitleRequired
                                    : undefined
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                className="font-ui"
                                htmlFor={`clause-body-${clause.id}`}
                                required={clause.isEditable}
                              >
                                Clause text
                              </Label>
                              <Textarea
                                id={`clause-body-${clause.id}`}
                                placeholder="What this term means for the customer…"
                                value={clause.body}
                                onChange={(e) =>
                                  updateClause(clause.id, {
                                    body: e.target.value,
                                  })
                                }
                                disabled={!clause.isEditable}
                                title={
                                  clause.isEditable
                                    ? undefined
                                    : "This clause is locked and cannot be edited"
                                }
                                rows={4}
                                className="resize-none leading-relaxed"
                                aria-invalid={Boolean(
                                  clauseErrors[clause.id]?.body,
                                )}
                                aria-describedby={
                                  clauseErrors[clause.id]?.body
                                    ? `clause-body-${clause.id}-error`
                                    : undefined
                                }
                              />
                              <FieldError
                                id={`clause-body-${clause.id}-error`}
                                message={
                                  clauseErrors[clause.id]?.body
                                    ? V.clauseBodyRequired
                                    : undefined
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer (editing only) */}
              {!readOnly && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addClause}
                    className="border-dashed"
                  >
                    <Plus className="size-3.5" />
                    Add clause
                  </Button>
                  <Typography
                    variant="helper"
                    tone="muted"
                    className="hidden sm:block"
                  >
                    Click a clause to edit · drag the handle or use the arrows
                    to reorder
                  </Typography>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
