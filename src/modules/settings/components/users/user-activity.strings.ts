// User-facing copy for the Settings › users Activity Log (sheet + timeline) and
// the User Detail page. §16.12 — screen copy lives here as one typed `as const`
// object instead of naked strings in JSX.
export const USER_ACTIVITY_STRINGS = {
  // Activity Log slide-over (sheet) opened from the users table.
  log: {
    title: "Activity Log",
    description: (userName: string) =>
      `Everything ${userName} has worked on — linked to the deal, lead or task.`,
  },

  // Filter chips above the timeline.
  filters: {
    all: "All",
    activities: "Activities",
    stage: "Stage Changes",
    records: "Records",
    tasks: "Tasks",
  },

  // Created-date range filter (sidebar sheet + detail timeline). Mirrors the
  // CRM leads "Created Date" filter — from/to bounds sent to the backend.
  dateFilter: {
    label: "Date range",
    placeholder: "Any date",
  },

  // Field-change diff expander (mirrors the CRM leads/deals audit trail).
  changes: {
    show: "Show changes",
    hide: "Hide changes",
    added: "Added",
    removed: "Removed",
    empty: "—",
  },

  // Friendlier title for the pipeline mechanic behind a Closed-Won: a lead's
  // stage is cleared (→ null) when it converts. The user thinks of it as a
  // conversion, not a "moved to None" stage change.
  leadConvertedToDeal: "Lead converted to Deal",

  // A field-change row whose only edit is a status/state field reads as a
  // status update, not a generic "updated". `subject` is the resource phrase
  // (e.g. "Sales Order line item") → "Sales Order line item status updated".
  statusUpdated: (subject: string) => `${subject} status updated`,

  // An approval rejection (approval_status → Rejected) reads as "<Subject>
  // rejected" — the decision, not the incidental de-activation the raw status
  // move ("Account moved from Active to Inactive") would otherwise surface.
  entityRejected: (subject: string) => `${subject} rejected`,

  // Assignee line on task / meeting rows — "Assigned to <name>".
  assignedTo: (name: string) => `Assigned to ${name}`,

  // Empty state when a user has no recorded activity.
  empty: "No recorded activity for this user yet.",

  // Fallback copy when the feed fails to load (non-403).
  loadError: "Failed to load activity.",

  // User Detail page + the field-change diff "Show more/less" expander.
  detail: {
    showMore: "Show more",
    showLess: "Show less",
    subtitle: "User profile and full activity history.",
    activityHistory: "Activity History",
    fields: {
      email: "Email",
      role: "Role",
      department: "Department",
      lastLogin: "Last Login",
    },
  },
} as const
