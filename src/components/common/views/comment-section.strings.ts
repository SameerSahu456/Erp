// User-facing copy for the CommentSection component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): all literal
// strings rendered inside CommentSection live here. Components import this
// via a relative path.
//
// Dynamic copy is expressed as a function member (see `loading`, `error`,
// `empty`, `addButton`).
export const COMMENT_SECTION_STRINGS = {
  // Sentinel / infinite-scroll copy.
  sentinel: {
    loadingMore: "Loading more…",
    scrollUpForOlder: "Scroll up for older messages",
    scrollForMore: "Scroll for more",
  },
  // Loading / error / empty states for the list area.
  // Functions receive the noun so the copy stays consistent with the caller's
  // `noun` prop (e.g. "messages" vs "comments").
  loading: (plural: string) => `Loading ${plural}…`,
  error: (plural: string) => `Failed to load ${plural}.`,
  empty: {
    noItems: (plural: string) => `No ${plural} yet`,
    startConversation: "Start a conversation. Use @ to mention someone.",
  },
  // Mention hint shown below the composer in both layouts.
  mentionHint:
    "Type @ to mention someone — they'll get a notification. Enter to send · Shift+Enter for a new line.",
  // Composer add button.
  adding: "Adding…",
  addButton: (singular: string) => `Add ${singular}`,
  // Chat layout "send" button aria-label.
  sendAriaLabel: (singular: string) => `Send ${singular}`,
  // Comment row.
  row: {
    system: "System",
    loading: "Loading…",
    unknownUser: "Unknown user",
    deleteAriaLabel: "Delete comment",
  },
} as const
