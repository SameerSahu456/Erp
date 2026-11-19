// User-facing copy for the CRM › notifications sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, empty/error/loading text, filter-tab labels, and the sub-feature's
// toast/status messages live here as one typed `as const` object instead of
// being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `header.unreadBadge`).
export const NOTIFICATIONS_STRINGS = {
  filterTabs: {
    all: "All",
    unread: "Unread",
  },
  header: {
    title: "Notification Center",
    unreadBadge: (count: number) => `${count} unread`,
    markAllRead: "Mark All as Read",
    markingAll: "Marking…",
  },
  list: {
    loading: "Loading notifications…",
    loadError: "Failed to load notifications.",
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    emptyUnread: {
      title: "You're all caught up",
      description: "New unread notifications will appear here.",
    },
    emptyAll: {
      title: "No notifications yet",
      description: "Mentions, task assignments, and stage changes will land here.",
    },
  },
} as const
