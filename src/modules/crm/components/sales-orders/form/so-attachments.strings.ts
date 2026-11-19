// Copy for the Sales Order Attachments section (form + Closed Won) and the
// read-only Attachments section on the SO detail page. Per Coding-guideline
// §16.12 — user-facing text is centralized, not inlined in components.

export const SO_ATTACHMENT_STRINGS = {
  section: {
    title: "Attachments",
    subtitle: "Attach the SO copy, customer PO, screenshots or anything else.",
    addLine: "Add attachment",
    empty: "No attachments yet.",
    typeLabel: "Type",
    // The type Select opens unset — the user names what they're attaching
    // rather than un-picking a default that happened to be wrong.
    typePlaceholder: "Select type",
    filesLabel: "Files",
    choose: "Choose files…",
    // Plain-English stand-in for the MIME allow-list — the raw list is nine
    // entries long and unreadable in the UI.
    hint: "PDF, images, Word, Excel or CSV · up to 20 MB each",
    otherLabelField: "Type name",
    otherLabelPlaceholder: "e.g. Customer email thread",
    removeLine: "Remove",
    removeFile: "Remove file",
    uploading: "Uploading…",
    countSuffix: (n: number) => (n === 1 ? "1 file" : `${n} files`),
  },
  detail: {
    title: "Attachments",
    empty: "No attachments on this sales order.",
    loadError: "Could not load attachments.",
    view: "View",
    download: "Download",
  },
  errors: {
    typeRequired: "Choose a type for this attachment.",
    labelRequired: "Enter a name for this attachment type.",
    labelTooLong: "Type name must be 100 characters or fewer.",
    fileTooLarge: (name: string) => `${name} is larger than the 20 MB limit.`,
    tooManyFiles: "A sales order can carry at most 30 attachments.",
    // A type already in use is disabled in the dropdown, so this is the
    // backstop for a duplicate arriving any other way (e.g. hydration).
    duplicateType: (label: string) =>
      `${label} is already added above — attach the files to that row instead.`,
    duplicateOtherLabel: (label: string) =>
      `“${label}” is already added above — attach the files to that row instead.`,
  },
} as const;
