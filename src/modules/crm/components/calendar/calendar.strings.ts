// User-facing copy for the CRM › calendar sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, empty/error/loading text, and the sub-feature's count pills live here
// as one typed `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this single source so copy stays consistent and is edited in
// one place.
//
// Dynamic copy is expressed as a function member (see `grid.meetingCount` /
// `grid.taskCount` / `dayDetail.formatSelectedDate`). Weekday/month names that
// come from date formatting live in `calendarHelpers.ts`, not here.
export const CALENDAR_STRINGS = {
  page: {
    title: "Calendar",
    subtitle: "Tasks and meetings at a glance",
    new: "New",
    newMeeting: "New Meeting",
    newTask: "New Task",
  },
  grid: {
    today: "Today",
    // Count pills wrap the numeric count in a styled span, so the label is the
    // copy that follows the number.
    meetingCount: (count: number) => `${count} mtg`,
    taskCount: (count: number) => `${count} task`,
  },
  dayDetail: {
    selectDate: "Select a date",
    loadError: "Couldn't load tasks and meetings. Please try again.",
    loading: "Loading…",
    clickPrompt: "Click on a date to view tasks and meetings",
    empty: "No tasks or meetings on this day",
    unassigned: "Unassigned",
    priority: "priority",
    // The selected-date heading is produced by date formatting; the format
    // options (not copy) stay colocated with this formatter.
    formatSelectedDate: (dateKey: string) =>
      new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  },
} as const
