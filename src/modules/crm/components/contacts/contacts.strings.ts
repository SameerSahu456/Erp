// User-facing copy for the CRM › contacts sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, validation
// messages, and the sub-feature's toast messages live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX/hooks.
// Components and hooks import this single source so copy stays consistent and
// is edited in one place.
//
// Dynamic copy is expressed as a function member (see `form.title`,
// `select.triggerLabel`).
export const CONTACTS_STRINGS = {
  breadcrumbs: {
    crm: "CRM",
    contacts: "Contacts",
    edit: "Edit",
    newContact: "New Contact",
  },
  list: {
    title: "Contacts",
    subtitle: "People you correspond with, grouped by account and department.",
    addContact: "Add Contact",
    tabLabel: "All Contacts",
    columns: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      accounts: "Accounts",
      designation: "Designation",
      department: "Department",
      preferred: "Preferred",
      status: "Status",
      createdOn: "Created On",
    },
    pills: {
      accountsSummary: "Accounts",
      accountsHover: "Linked Accounts",
    },
    preferredBadge: "Preferred",
    loading: "Loading contacts…",
    loadError: "Unable to load contacts.",
    empty: {
      title: "No contacts yet",
      description:
        "Add the people you correspond with — they can be linked to one or more accounts.",
      action: "Add Contact",
    },
  },
  detail: {
    loading: "Loading contact…",
    notFoundTitle: "Contact not found",
    notFoundDescription:
      "The contact you're looking for doesn't exist or has been removed.",
    back: "Back to Contacts",
    tabs: {
      overview: "Overview",
      activities: "Activities",
      meetings: "Meetings",
      notes: "Notes",
    },
    meetingsPlaceholder:
      "The Meetings module backend is not shipped yet. This tab will populate from live data once the service goes live.",
    overview: {
      heading: "Contact Information",
      labels: {
        email: "Email",
        phone: "Phone",
        designation: "Designation",
        account: "Account",
        lastContact: "Last Contact",
        created: "Created On",
      },
    },
    linkedAccounts: {
      title: "Linked Accounts",
      empty: "Orphan contact — not linked to any account.",
      linkedAtPrefix: "Linked",
    },
    actions: {
      edit: "Edit",
      delete: "Delete",
    },
  },
  form: {
    editTitleLoading: "Edit Contact",
    subtitleLoading: "Loading contact details…",
    loadError: "Failed to load contact.",
    // Edit title carries the contact name; create title is fixed copy.
    title: (isEdit: boolean, name: string) =>
      isEdit ? `Edit Contact: ${name}` : "Create Contact",
    subtitle: (isEdit: boolean) =>
      isEdit
        ? "Update contact details and account links."
        : "Add a new contact and optionally link them to one or more accounts.",
    saveLabel: (isEdit: boolean) => (isEdit ? "Save Changes" : "Create Contact"),
    cardTitle: (isEdit: boolean) =>
      isEdit ? "Edit Contact Details" : "New Contact Details",
    // Duplicate-email banner wraps the existing contact name in <strong>, so
    // the copy is split around the highlighted name.
    duplicateBefore: "A live contact already uses this email:",
    duplicateLink: "Open existing contact →",
    identity: {
      sectionLabel: "Contact Details",
      name: "Name",
      namePlaceholder: "Full name",
      email: "Email",
      emailPlaceholder: "name@example.com",
      phone: "Phone",
      phonePlaceholder: "10-digit mobile number",
      contactHint: "Provide at least one of email or phone.",
      altPhone: "Alt Phone",
      altPhonePlaceholder: "Alternate number (optional)",
    },
    role: {
      sectionLabel: "Role & Accounts",
      designation: "Designation",
      designationPlaceholder: "e.g. Procurement Manager",
      department: "Department",
      departmentPlaceholder: "Select department (optional)",
      status: "Status",
      linkedAccounts: "Linked Accounts",
      lockedHint:
        "Linked from the account page — this link is required and can't be removed here.",
    },
  },
  select: {
    placeholder: "Select linked accounts...",
    searchPlaceholder: "Search accounts...",
    loadError: "Failed to load accounts",
    fallbackAccountLabel: "Account",
    // "1 account linked" / "N accounts linked"
    triggerLabel: (count: number) =>
      `${count} account${count === 1 ? "" : "s"} linked`,
    lockedRowTitle: "This link is required and can't be removed",
    lockedChipTitle: "Required link — can't be removed",
    unsetPrimary: "Unset primary",
    makePrimary: "Make primary",
    primaryAccount: "Primary account",
    removeLink: "Remove account link",
  },
  delete: {
    title: "Delete contact?",
    // Body wraps the contact name in <strong>, so it is split into the copy
    // before/after the highlighted name rather than a single string.
    bodyBefore: "This soft-deletes ",
    bodyAfter:
      ". The data remains in the database but is hidden from list/detail queries.",
    cancel: "Cancel",
    confirm: "Delete",
    confirming: "Deleting…",
    // Blocked when deleting this contact would leave one or more accounts with
    // no contact at all (see contactAccountGuard).
    lastContactBlocked: (accounts: string[]) => {
      const list = accounts.join(", ")
      const subject = accounts.length === 1 ? "it" : "them"
      return `Can't delete — ${list} would be left with no contact. Add another contact to ${subject} first.`
    },
  },
  validation: {
    nameRequired: "Name is required.",
    nameLabel: "Name",
    contactRequired: "Provide at least one of email or phone.",
    emailInvalid: "Email looks invalid.",
    accountRequired: "Link at least one account.",
    primaryMustBeLinked: "Primary account must be one of the linked accounts.",
    fixHighlighted: "Please fix the highlighted fields.",
    // Blocked when removing an account link would orphan that account (every
    // account must keep at least one contact).
    lastContactBlocked: (accounts: string[]) => {
      const list = accounts.join(", ")
      const subject = accounts.length === 1 ? "it" : "them"
      return `Can't remove — ${list} would be left with no contact. Add another contact to ${subject} first.`
    },
  },
  toast: {
    created: "Contact created",
    createFailed: "Failed to create contact",
    updated: "Contact updated",
    updateFailed: "Failed to update contact",
    deleted: "Contact deleted",
    deleteFailed: "Failed to delete contact",
    accountLinked: "Account linked to contact",
    accountLinkFailed: "Failed to link account",
    accountUnlinked: "Account unlinked",
    accountUnlinkFailed: "Failed to unlink account",
    primaryUpdated: "Primary account updated",
    primaryUpdateFailed: "Failed to promote primary account",
  },
} as const
