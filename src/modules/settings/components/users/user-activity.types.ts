import type { ActivityLogTab } from "@modules/crm"

export interface UserActivityTimelineProps {
  /** Actor whose activity feed is shown. Drives the API query. */
  userId: string
  /**
   * `scroll` — infinite load-on-scroll (the slide-over sidebar). The timeline
   * owns its scroll container and reveals more rows as the sentinel comes into
   * view. `pager` — numbered pagination via the shared CRM TablePagination
   * (the detail page). Defaults to `pager`.
   */
  mode?: "scroll" | "pager"
  /** Called right before navigating away (e.g. to close a containing sheet). */
  onBeforeNavigate?: () => void
  /**
   * Stack the filters vertically — date field on its own row above the tab
   * chips — for the narrow sidebar sheet. Defaults to the inline layout
   * (chips left, date pushed right) used on the wide detail page.
   */
  stackFilters?: boolean
  /**
   * When set (pager mode), the current page + tab + date range are synced to
   * the URL under `${urlKey}Page` / `${urlKey}Tab` / `${urlKey}From` /
   * `${urlKey}To` so browser-back restores exactly where the user was after
   * they open a linked record and come back. The prefix keeps two timelines on
   * the same route (e.g. the list page's activity sidebar) from colliding with
   * the page's own params. Omitted → the timeline keeps its state locally.
   */
  urlKey?: string
  /**
   * Pager mode only. Fill the parent's height as a flex column: filters pinned
   * on top, the list scrolling in the middle, and the numbered pager pinned to
   * the bottom (always visible, never part of the scroll). For bounded
   * containers like the activity-log slide-over sheet. Defaults to `false` —
   * the inline document-flow layout used on the detail page.
   */
  fillHeight?: boolean
}

// ── View model (kept from the previous static shape so rendering is identical) ──

export type UserActivityType =
  | "call"
  | "email"
  | "whatsapp"
  | "follow_up"
  | "meeting"
  | "task"
  | "note"
  | "activity"
  | "stage_change"
  | "field_change"
  | "created"
  | "deleted"
  | "rejection"
  | "reinstatement"
  | "closed_lost"
  | "account_created"
  | "deal_created"
  | "so_created"
  | "owner_change"
  | "login"
  | "approval"

export type EntityKind =
  | "Lead"
  | "Deal"
  | "Account"
  | "Contact"
  | "Task"
  | "Quote"
  | "Sales Order"
  | "Material Inquiry"
  | "Demo Request"
  | "User"
  | "Role"

/** One field's before → after, as sent in a `field_change` row's metadata. */
export interface FieldChange {
  field: string
  from: unknown
  to: unknown
}

export interface UserActivityEntry {
  id: string
  type: UserActivityType
  title: string
  detail?: string
  timestamp: string
  entityKind?: EntityKind
  linkLabel?: string
  link?: string
  metadata?: Record<string, string>
  /** Populated for `field_change` rows — the list of edited fields. */
  changes?: FieldChange[]
}

export type ChangeKind = "added" | "removed" | "changed"

// ── Tabs ── Only the 3 the backend can honestly serve. The "Activities" and
// "Records" tabs are intentionally hidden for now (see PLAN). `FilterKey`
// values ARE the backend `tab` query param.
export type FilterKey = ActivityLogTab
