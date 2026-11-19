import {
  isUnresolvableReference,
  resolveActivityLogHref,
  type UserActivityLogItem,
} from "@modules/crm"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import {
  ENTITY_KIND_LABEL,
  ICON_TO_TYPE,
  NON_EDIT_FIELDS,
  STATUS_FIELDS,
} from "./user-activity.config"
import {
  type ChangeKind,
  type FieldChange,
  type UserActivityEntry,
  type UserActivityType,
} from "./user-activity.types"

// Approval decisions (account approve, SO line approve, PM approve …) reach the
// FE as generic `field_change`/`update` rows — the backend has no dedicated
// approval icon_type — so we detect them from the title verb. `approv` matches
// "approve"/"approved"/"approval" while the reject path ("… reject line") never
// does, so rejections keep the edit/x icon and only approvals get the check.
function isApprovalRow(item: UserActivityLogItem): boolean {
  return /\bapprov/i.test(item.title)
}

/** True for an approval-decision field (account KYC `approval_status`, plus any
 *  sub-resource `*_approval_status`) — the field whose value carries the
 *  Pending → Approved/Rejected decision. */
function isApprovalStatusField(field: string): boolean {
  return field === "approval_status" || field.endsWith("_approval_status")
}

/** When a status row's *real* event is an approval REJECTION, return that field
 *  change. Rejecting an account flips its `status` to Inactive alongside setting
 *  `approval_status` to Rejected, so the backend emits a plain "<X> moved from
 *  Active to Inactive" status row with the rejection buried in the changes diff.
 *  The user-meaningful event is the rejection, not the incidental de-activation
 *  — so we detect it here and relabel/re-icon the row. */
function rejectedApprovalChange(item: UserActivityLogItem): FieldChange | undefined {
  return extractChanges(item.metadata)?.find(
    (c) => isApprovalStatusField(c.field) && String(c.to).toLowerCase() === "rejected",
  )
}

/** The entity phrase a status/stage title starts with: "Account moved from
 *  Active to Inactive" → "Account". Falls back to the entity-kind label. */
function subjectOf(item: UserActivityLogItem): string {
  const m = item.title.match(/^(.+?)\s+moved from\s/i)
  if (m) return m[1]
  return item.entity_type ? ENTITY_KIND_LABEL[item.entity_type] : item.title
}

// The row's `source` is authoritative for the created/deleted audit shapes;
// everything else falls back to icon_type.
export function resolveType(item: UserActivityLogItem): UserActivityType {
  switch (item.source) {
    case "created":
      return "created"
    case "deleted":
      return "deleted"
    default:
      // A rejection wins over the generic status-move icon: it reads as an
      // "Account rejected" (X) row, not a "moved to Inactive" (→) row.
      if (rejectedApprovalChange(item)) return "rejection"
      if (isApprovalRow(item)) return "approval"
      return ICON_TO_TYPE[item.icon_type] ?? "activity"
  }
}

/** A change whose only displayable value(s) are raw IDs with no name-resolver —
 *  it can only read as "<field>: reference hidden", so it's noise we drop. */
function isNoiseReferenceChange(c: FieldChange): boolean {
  const shown = [c.from, c.to].filter((v) => !isEmptyValue(v))
  return shown.length > 0 && shown.every((v) => isUnresolvableReference(c.field, v))
}

/** Pull the typed `changes` array out of a field_change row's loose metadata,
 *  dropping audit-only bookkeeping fields the user never edited AND raw-ID rows
 *  that would only render as "reference hidden". */
export function extractChanges(
  metadata: Record<string, unknown> | null,
): FieldChange[] | undefined {
  const raw = metadata?.changes
  if (!Array.isArray(raw)) return undefined
  const changes = raw.filter(
    (c): c is FieldChange =>
      typeof c === "object" &&
      c !== null &&
      "field" in c &&
      typeof c.field === "string" &&
      !NON_EDIT_FIELDS.has(c.field),
  )
  const visible = changes.filter(
    // Drop noise-only rows AND no-op rows where the value didn't actually
    // change (a re-save can emit `from === to`) — the diff must only show
    // real edits, never "X → X".
    (c) => !isNoiseReferenceChange(c) && !valuesEqual(c.from, c.to),
  )
  return visible.length > 0 ? visible : undefined
}

/** Render a snake_case field key as a human label (e.g. contact_name → Contact name). */
export function labelizeField(field: string): string {
  const spaced = field.replace(/_/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function isEmptyValue(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
}

/** Classify a field change so the diff can style it like the CRM audit trail:
 *  a value appearing (added), disappearing (removed), or moving old → new. */
export function changeKind(change: FieldChange): ChangeKind {
  if (isEmptyValue(change.from)) return "added"
  if (isEmptyValue(change.to)) return "removed"
  return "changed"
}

/** Stable key for comparing values in list diffs. Objects compare by JSON,
 *  primitives by string form. */
function valueKey(v: unknown): string {
  return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)
}

/** True when `from` and `to` are the same value — order-insensitive for lists.
 *  Used to drop no-op rows the backend may still emit (e.g. a field re-saved
 *  with an unchanged value), so the diff never shows "X → X". */
function valuesEqual(from: unknown, to: unknown): boolean {
  if (from === to) return true
  if (Array.isArray(from) && Array.isArray(to)) {
    if (from.length !== to.length) return false
    const a = from.map(valueKey).sort()
    const b = to.map(valueKey).sort()
    return a.every((v, i) => v === b[i])
  }
  if (typeof from === "object" && typeof to === "object" && from && to) {
    return JSON.stringify(from) === JSON.stringify(to)
  }
  return false
}

/** For a list-valued "changed" field, return only the items that actually
 *  entered (`added`) or left (`removed`) — never the ones present on BOTH
 *  sides. `null` when either side isn't a list (scalar → show old → new). */
export function arrayDelta(
  from: unknown,
  to: unknown,
): { added: unknown[]; removed: unknown[] } | null {
  if (!Array.isArray(from) || !Array.isArray(to)) return null
  const fromKeys = new Set(from.map(valueKey))
  const toKeys = new Set(to.map(valueKey))
  return {
    added: to.filter((v) => !fromKeys.has(valueKey(v))),
    removed: from.filter((v) => !toKeys.has(valueKey(v))),
  }
}

function isStatusField(field: string): boolean {
  return STATUS_FIELDS.has(field) || field.endsWith("_status")
}

/** True when a field-change row includes a status/state field — the status
 *  move is the user-meaningful event (any decided_by / decided_at stamped
 *  alongside are just its metadata), so the title reads "<X> status updated"
 *  instead of a bare "<X> updated". */
function hasStatusChange(changes: FieldChange[] | undefined): boolean {
  return !!changes && changes.some((c) => isStatusField(c.field))
}

/** Rewrite a "<subject> updated" title into "<subject> status updated". Leaves
 *  titles that don't end in "updated" untouched. */
function toStatusTitle(title: string): string {
  if (!/\bupdated$/i.test(title)) return title
  return S.statusUpdated(title.replace(/\s*updated$/i, ""))
}

/** A lead's stage is CLEARED (→ null) when it converts on Closed-Won — the raw
 *  audit row reads "Lead moved from X to None". Surface that as the user-facing
 *  "Lead converted to Deal" instead of the internal stage-clear mechanic. */
function isLeadConversionRow(item: UserActivityLogItem): boolean {
  const meta = item.metadata
  return (
    item.entity_type === "lead" &&
    !!meta &&
    meta.field === "stage" &&
    !isEmptyValue(meta.from) &&
    isEmptyValue(meta.to)
  )
}

export function mapItem(item: UserActivityLogItem): UserActivityEntry {
  const metadata = item.metadata
    ? Object.fromEntries(
        Object.entries(item.metadata)
          .filter(([, v]) => v != null && typeof v !== "object")
          .map(([k, v]) => [k, String(v)]),
      )
    : undefined
  const changes = extractChanges(item.metadata)
  // Title precedence: approval-rejection relabel → lead-conversion relabel →
  // status-only relabel → the backend title as-is. Rejection comes first so an
  // account rejection reads as "Account rejected" instead of the misleading
  // "Account moved from Active to Inactive".
  const title = rejectedApprovalChange(item)
    ? S.entityRejected(subjectOf(item))
    : isLeadConversionRow(item)
      ? S.leadConvertedToDeal
      : hasStatusChange(changes)
        ? toStatusTitle(item.title)
        : item.title
  return {
    id: item.id,
    type: resolveType(item),
    title,
    detail: item.description ?? undefined,
    timestamp: item.occurred_at,
    entityKind: item.entity_type ? ENTITY_KIND_LABEL[item.entity_type] : undefined,
    linkLabel: item.entity_label ?? undefined,
    // Single source of truth for where a row navigates (per-source, per-entity).
    link: resolveActivityLogHref(item) ?? undefined,
    metadata,
    // Any audit-derived row (created / deleted / stage_change / field_change)
    // may carry a field diff — surface it so the "Show changes" expander works
    // everywhere, not just plain field updates.
    changes,
  }
}

export function entityBadgeVariant(
  kind?: string,
): "success" | "info" | "warning" | "secondary" {
  if (kind === "Deal") return "success"
  if (kind === "Lead") return "info"
  if (kind === "Task") return "warning"
  return "secondary"
}
