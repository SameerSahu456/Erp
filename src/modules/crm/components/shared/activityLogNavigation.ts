// Where an activity-log row navigates to when clicked — the SINGLE source of
// truth for that decision. Change redirect behaviour here, nowhere else.
//
// Two composable layers keep it scalable:
//
//   1. ENTITY_NAV — per entity_type: its detail route plus which deep-link
//      tabs that detail page exposes (audit trail, tasks). Add or edit an
//      entity here and every source picks the change up automatically.
//   2. SOURCE_TARGET — per source: how to turn the entity config + the row's
//      ids into a final URL. Change a source's rule (e.g. where a task links)
//      in exactly one place.
//
// The UI calls only `resolveActivityLogHref(item)`.

import type {
  ActivityLogEntityType,
  ActivityLogSource,
  UserActivityLogItem,
} from "../../api/activity-log"

export interface EntityNavConfig {
  /** Base detail route, e.g. "/crm/leads" — `${route}/${id}` is the record. */
  route: string
  /** DetailTabs id for the audit-trail tab, if this entity's page has one. */
  auditTab?: string
  /** DetailTabs id for the tasks tab, if this entity's page has one. */
  tasksTab?: string
}

// Only lead + deal detail pages currently expose audit-trail / tasks tabs;
// the rest fall back to their plain detail page. Give another entity those
// tabs and its stage/field/task rows deep-link automatically.
export const ENTITY_NAV: Record<ActivityLogEntityType, EntityNavConfig> = {
  lead: { route: "/crm/leads", auditTab: "audit-trail", tasksTab: "tasks" },
  deal: { route: "/crm/deals", auditTab: "audit-trail", tasksTab: "tasks" },
  account: { route: "/crm/accounts" },
  contact: { route: "/crm/contacts" },
  quote: { route: "/crm/quotes" },
  sales_order: { route: "/crm/sales-orders" },
  material_inquiry: { route: "/crm/material-inquiries" },
  demo_request: { route: "/crm/demo-requests" },
  // Auth-module rows. `user` deep-links to the user detail page by id. `role`
  // audit rows carry no entity_id (the backend records role changes without a
  // resource_id), so `resolveActivityLogHref` returns null before this route is
  // ever used — it's here only to satisfy the exhaustive Record type.
  user: { route: "/settings/users" },
  role: { route: "/settings/roles" },
}

// DOM-id prefixes for the deep-link scroll target. A row renders
// `id="<prefix>-<rowId>"`; the URL carries `#<prefix>-<rowId>`; the shared
// `useScrollToHashTarget` hook matches them, scrolls, and flashes the ring —
// the exact same mechanism (and highlight UI) as notification clicks.
//   - `audit` → an <AuditEntry> row (audit-trail tab)
//   - `task`  → a task row (tasks tab; matches TasksSection's own prefix)
export const ACTIVITY_LOG_HASH_PREFIX = {
  audit: "audit",
  task: "task",
} as const

// Build `<route>/<id>`, optionally `?tab=<tab>` and `#<hash>` — the same URL
// shape notification deep links use (see shared/notifications/routing.ts).
function detailPath(
  cfg: EntityNavConfig,
  id: string,
  deepLink?: { tab: string; hash: string },
): string {
  const base = `${cfg.route}/${id}`
  if (!deepLink) return base
  return `${base}?tab=${deepLink.tab}#${deepLink.hash}`
}

// (item, cfg, entityId) → href. entityId is pre-validated non-null.
type SourceTarget = (
  item: UserActivityLogItem,
  cfg: EntityNavConfig,
  entityId: string,
) => string

// Audit-backed rows (stage_change + field_change): deep-link to the entity's
// audit-trail tab and scroll/flash the specific audit row when the page has
// that tab; else fall back to the plain detail page.
const auditTarget: SourceTarget = (item, cfg, entityId) =>
  cfg.auditTab && item.audit_id
    ? detailPath(cfg, entityId, {
        tab: cfg.auditTab,
        hash: `${ACTIVITY_LOG_HASH_PREFIX.audit}-${item.audit_id}`,
      })
    : detailPath(cfg, entityId)

// Task rows: deep-link to the entity's tasks tab and the specific task (the
// row id IS the task id) when the page has that tab; else the detail page.
const taskTarget: SourceTarget = (item, cfg, entityId) =>
  cfg.tasksTab
    ? detailPath(cfg, entityId, {
        tab: cfg.tasksTab,
        hash: `${ACTIVITY_LOG_HASH_PREFIX.task}-${item.id}`,
      })
    : detailPath(cfg, entityId)

// Logged activities: just open the related record.
const entityTarget: SourceTarget = (_item, cfg, entityId) => detailPath(cfg, entityId)

const SOURCE_TARGET: Record<ActivityLogSource, SourceTarget> = {
  stage_change: auditTarget,
  field_change: auditTarget,
  // created / deleted are audit-backed (carry audit_id) → deep-link to the
  // entity's audit-trail tab, same as stage/field changes.
  created: auditTarget,
  deleted: auditTarget,
  task: taskTarget,
  activity: entityTarget,
  // meeting rows are standalone (no entity_type/entity_id), so
  // `resolveActivityLogHref` returns null before this is ever reached — the
  // entry exists only to satisfy the exhaustive Record type.
  meeting: entityTarget,
}

/**
 * Resolve the navigation URL for an activity-log row, or `null` when the row
 * isn't linkable (no related entity, or an unknown entity type). The single
 * entry point the UI calls — never build these URLs inline.
 */
export function resolveActivityLogHref(item: UserActivityLogItem): string | null {
  if (!item.entity_type || !item.entity_id) return null
  const cfg = ENTITY_NAV[item.entity_type]
  if (!cfg) return null
  return SOURCE_TARGET[item.source](item, cfg, item.entity_id)
}
