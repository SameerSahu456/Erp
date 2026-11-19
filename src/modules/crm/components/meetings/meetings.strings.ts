// User-facing copy for the CRM › meetings sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const MEETINGS_STRINGS = {
  list: {
    title: "Meetings",
    subtitle: "Schedule and track meetings with leads and deals.",
    breadcrumbCrm: "CRM",
    breadcrumbMeetings: "Meetings",
    newMeeting: "New Meeting",
    paginationNoun: "meetings",
    stats: {
      scheduled: "Scheduled",
      completed: "Completed",
      thisWeek: "This Week",
      total: "Total",
    },
    loadError: "Failed to load meetings.",
    empty: {
      filteredTitle: "No meetings match your filters",
      filteredDescription: "Try clearing the search or filters to see more meetings.",
      filteredAction: "Clear filters",
      title: "No meetings yet",
      description: "Schedule a meeting with a lead or deal to track conversations.",
      action: "New Meeting",
    },
  },
  toolbar: {
    searchPlaceholder: "Search meetings...",
    statusPlaceholder: "Status",
    allStatus: "All Status",
    typePlaceholder: "Type",
    allTypes: "All Types",
  },
  row: {
    editAria: "Edit meeting",
    completeAria: "Complete meeting",
    cancelAria: "Cancel meeting",
  },
  form: {
    editTitle: "Edit Meeting",
    createTitle: "New Meeting",
    titleLabel: "Title *",
    titlePlaceholder: "Enter meeting title",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Meeting agenda or description",
    typeLabel: "Type",
    dateLabel: "Date *",
    startTimeLabel: "Start Time",
    endTimeLabel: "End Time",
    locationLabel: "Location",
    locationPlaceholder: "e.g., Google Meet, Office address",
    assignedToLabel: "Assigned To *",
    assignedPlaceholder: "Select a user",
    assignedSearchPlaceholder: "Search users…",
    assignedFallbackLabel: "Assigned user",
    cancel: "Cancel",
    saving: "Saving…",
    creating: "Creating…",
    saveChanges: "Save Changes",
    createMeeting: "Create Meeting",
    errors: {
      datePast: "Meeting date cannot be in the past",
      startPast: "Start time cannot be in the past",
      endBeforeStart: "End time must be after start time",
      assigneeRequired: "Assigned To is required",
    },
  },
  toast: {
    created: "Meeting created",
    createFailed: "Failed to create meeting",
    updated: "Meeting updated",
    updateFailed: "Failed to update meeting",
    completed: "Meeting marked complete",
    completeFailed: "Failed to complete meeting",
    cancelled: "Meeting cancelled",
    cancelFailed: "Failed to cancel meeting",
  },
} as const
