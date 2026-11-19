import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react"

import { DiffValue } from "@modules/crm"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import { arrayDelta, changeKind, labelizeField } from "./user-activity.mappers"
import { type FieldChange } from "./user-activity.types"

interface FieldChangesSectionProps {
  /** The edited fields to diff. Assumed non-empty (parent guards). */
  changes: FieldChange[]
  expanded: boolean
  onToggle: () => void
}

/** Renders one field's before → after diff, styled like the CRM audit trail. */
function ChangeRow({ change }: { change: FieldChange }) {
  const kind = changeKind(change)
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
      <span className="font-medium text-foreground">{labelizeField(change.field)}:</span>
      {kind === "added" && (
        <span className="min-w-0 break-words text-foreground">
          <span className="text-success">{S.changes.added}</span>{" "}
          <DiffValue k={change.field} v={change.to} />
        </span>
      )}
      {kind === "removed" && (
        <span className="min-w-0 break-words text-foreground">
          <span className="text-destructive">{S.changes.removed}</span>{" "}
          <DiffValue k={change.field} v={change.from} />
        </span>
      )}
      {kind === "changed" && <ChangedValue change={change} />}
    </div>
  )
}

/** A "changed" field: list fields show only what entered/left; scalar fields
 *  keep the old → new form. */
function ChangedValue({ change }: { change: FieldChange }) {
  // List field (roles, managers, …): show ONLY the items that entered/left,
  // not the whole before + after arrays (which repeat unchanged entries).
  const delta = arrayDelta(change.from, change.to)
  if (delta) {
    return (
      <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {delta.added.length > 0 && (
          <span className="min-w-0 break-words text-foreground">
            <span className="text-success">{S.changes.added}</span>{" "}
            <DiffValue k={change.field} v={delta.added} />
          </span>
        )}
        {delta.removed.length > 0 && (
          <span className="min-w-0 break-words text-foreground">
            <span className="text-destructive">{S.changes.removed}</span>{" "}
            <DiffValue k={change.field} v={delta.removed} />
          </span>
        )}
      </span>
    )
  }
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="break-words text-muted-foreground line-through">
        <DiffValue k={change.field} v={change.from} />
      </span>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
      <span className="break-words text-foreground">
        <DiffValue k={change.field} v={change.to} />
      </span>
    </span>
  )
}

/**
 * Collapsible before → after diff, mirroring the CRM leads/deals audit trail.
 * The toggle button stops propagation so it never navigates; clicking the card
 * elsewhere still redirects to the record.
 */
export function FieldChangesSection({ changes, expanded, onToggle }: FieldChangesSectionProps) {
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        onKeyDown={(e) => e.stopPropagation()}
        aria-expanded={expanded}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        <span>{expanded ? S.changes.hide : S.changes.show}</span>
        {!expanded && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
            {changes.length}
          </span>
        )}
      </button>
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 space-y-1 rounded-md border bg-background/70 p-2"
        >
          {changes.map((change) => (
            <ChangeRow key={change.field} change={change} />
          ))}
        </div>
      )}
    </div>
  )
}
