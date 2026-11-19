import type { NotificationWire } from "./api"

// Backend `entity_type` (singular, snake_case) → frontend URL slug
// (plural, kebab-case). The map is the source of truth for click-to-
// detail navigation from the notification list. New module entity types
// only have to be added here; the rest of the popover stays unchanged.
//
// Intentionally NOT in this map: `purchase_request` — there is no
// `/crm/purchase-requests/:id` route today, only the list page.
// Notifications about a specific purchase request fall through to the
// module landing page; once a detail page lands, add the slug here.
const ENTITY_SLUGS: Record<string, string> = {
  lead: "leads",
  deal: "deals",
  account: "accounts",
  contact: "contacts",
  quote: "quotes",
  material_inquiry: "material-inquiries",
  demo_request: "demo-requests",
  task: "tasks",
}

// Entity types whose notifications open a LIST page rather than
// `/<module>/<slug>/<id>`. An IMS export has no detail page — "your export
// is ready / failed" lands on My exports, where the job can be downloaded or
// run again (ims/stock-adjustment spec E6).
const ENTITY_LIST_ROUTES: Record<string, string> = {
  ims_export_job: "/ims/exports",
}

// Which tabs each detail page actually renders. The frontend tabs are
// not uniform across entities — Account/Contact don't have a Comments
// tab, Lead/Deal don't have an Activities tab, etc. When a notification
// asks for a tab that doesn't exist here, we fall back to the page's
// natural default (DetailTabs picks the first available tab).
//
// Keep in sync with the tab arrays in `modules/crm/pages/*DetailPage.tsx`.
const TABS_BY_ENTITY: Record<string, readonly string[]> = {
  lead: ["overview", "notes", "tasks", "comments"],
  deal: ["overview", "notes", "tasks", "comments"],
  account: ["overview", "addresses", "contacts", "deals", "quotes", "sales-orders", "meetings", "activities", "notes"],
  contact: ["overview", "activities", "meetings", "notes"],
  material_inquiry: ["comments"],
  // demo_request, quote, task → no tab map needed; fall through to default.
}

// Source row type → which tab on the parent should activate when the
// user clicks the notification. The notification's `source_entity_type`
// (set by the backend at emission time) is what drives the choice — a
// mention from a Comment goes to ?tab=comments, a mention from a Note
// goes to ?tab=notes, a task event goes to ?tab=tasks.
const TAB_BY_SOURCE: Record<string, string> = {
  comment: "comments",
  note: "notes",
  task: "tasks",
}

/**
 * Resolve the in-app URL for a notification. Returns `null` if the
 * notification is system-level (no `entity_type` / `entity_id`) — the
 * caller should treat null as "row not clickable".
 *
 * URL shape: `/<module>/<slug>/<entity_id>?tab=<tab>#<source_type>-<source_id>`
 *
 * - `?tab=` is appended when the source_entity_type maps to a tab AND
 *   that tab exists on the target entity's detail page. If the tab
 *   isn't available (e.g. a comment notification on an Account, which
 *   has no Comments tab), we omit the query param so the page opens
 *   on its default tab instead of silently landing on Overview because
 *   `?tab=comments` didn't match anything.
 *
 * - `#<source>-<id>` is appended when both source fields are set. The
 *   matching section component (CommentSection, NotesSection,
 *   TasksSection) reads the hash and scrolls the row into view with a
 *   brief highlight ring. If the target row isn't on the current
 *   page (paginated lists), the hash is harmless — the user just
 *   lands on the tab.
 *
 * Unknown entity types fall back to the module landing page so the
 * user lands somewhere meaningful even when the slug map is out of
 * date. The popover surfaces a soft toast in that branch.
 */
export function notificationHref(
  n: Pick<
    NotificationWire,
    "module" | "entity_type" | "entity_id" | "source_entity_type" | "source_entity_id"
  >,
): string | null {
  if (!n.entity_type || !n.entity_id) return null
  const listRoute = ENTITY_LIST_ROUTES[n.entity_type]
  if (listRoute) return listRoute
  const slug = ENTITY_SLUGS[n.entity_type]
  if (!slug) {
    // Unknown type — best-effort fallback to module root.
    return `/${n.module}`
  }
  let url = `/${n.module}/${slug}/${n.entity_id}`

  if (n.source_entity_type) {
    const tab = TAB_BY_SOURCE[n.source_entity_type]
    if (tab) {
      const availableTabs = TABS_BY_ENTITY[n.entity_type]
      // Append ?tab= only when the entity actually has that tab. Otherwise
      // let DetailTabs fall back to the first tab (Overview / similar)
      // rather than showing nothing because the requested tab is unknown.
      if (!availableTabs || availableTabs.includes(tab)) {
        url += `?tab=${tab}`
      }
    }
    if (n.source_entity_id) {
      url += `#${n.source_entity_type}-${n.source_entity_id}`
    }
  }

  return url
}
