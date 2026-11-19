import type { MeetingStatus, MeetingType } from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2) for the CRM › meetings
// sub-feature. Single source for how a meeting's `meeting_type` / `status` wire
// values are shown to the user. Today each label equals its wire value, but
// routing display through these maps means any future copy change lives in one
// place and can't drift across the toolbar filter, the form dialog select, the
// row type icon label, and the status badge.

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  "Video Call": "Video Call",
  "Phone Call": "Phone Call",
  "In Person": "In Person",
  "Site Visit": "Site Visit",
}

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  Scheduled: "Scheduled",
  Completed: "Completed",
  Cancelled: "Cancelled",
}

// Display order for the type/status select options (the wire-value `value`
// stays the source of truth for backend comparisons; the label comes from the
// maps above).
export const MEETING_TYPES: MeetingType[] = [
  "Video Call",
  "Phone Call",
  "In Person",
  "Site Visit",
]

export const MEETING_STATUSES: MeetingStatus[] = [
  "Scheduled",
  "Completed",
  "Cancelled",
]
