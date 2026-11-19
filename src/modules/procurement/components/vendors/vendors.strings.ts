// User-facing copy for the Procurement › vendors sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const VENDORS_STRINGS = {
  breadcrumbs: {
    procurement: "Procurement",
    vendors: "Vendors",
    loading: "Loading…",
    notFound: "Not found",
  },
  list: {
    title: "Vendors",
    subtitle:
      "Procurement vendor master — contacts, GST identifiers, and active status.",
    tabLabel: "All Vendors",
    columns: {
      srNo: "Sr. No.",
      code: "Code",
      name: "Name",
      contact: "Contact",
      email: "Email",
      status: "Status",
      created: "Created At",
    },
    stats: {
      total: "Total Vendors",
      active: "Active (current view)",
      inactive: "Inactive (current view)",
    },
    searchPlaceholder: "Search by name, code, or contact...",
    addVendor: "Add Vendor",
    filterTitle: "Filter Vendors",
    filterStatusLabel: "Status",
    filterAllStatuses: "All statuses",
    clearFilters: "Clear All Filters",
    loading: "Loading vendors…",
    refreshing: "Refreshing vendors…",
    loadError: "Unable to load vendors.",
    error: {
      title: "Couldn't load vendors",
      description: "Something went wrong fetching the vendor list. Please retry.",
    },
    empty: {
      title: "No vendors yet",
      description:
        "Add vendors so you can issue purchase orders and record GRNs against them.",
      action: "Add Vendor",
    },
  },
  detail: {
    loadingTitle: "Loading vendor…",
    loadingBody: "Loading vendor details…",
    notFoundTitle: "Vendor not found",
    loadError: "Vendor could not be loaded.",
    editButton: "Edit",
    deleteButton: "Delete",
    activateButton: "Activate",
    deactivateButton: "Deactivate",
    sidePanel: {
      statusTitle: "Status",
      auditTitle: "Audit",
      created: "Created",
      lastUpdated: "Last updated",
    },
    contact: {
      cardTitle: "Contact",
      nameLabel: "Contact name",
      emailLabel: "Email",
      phoneLabel: "Phone",
      gstLabel: "GST number",
      addressLabel: "Address",
    },
    contacts: {
      cardTitle: "Additional contacts",
      addContact: "Add Contact",
      empty: "No additional contacts yet. Add the people at this vendor who coordinate with us — they become pickable as “Purchase Requested By” on a PO.",
      edit: "Edit contact",
      remove: "Remove contact",
      removeTitle: "Remove contact?",
      removeDescription: (name: string) =>
        `Remove “${name}” from this vendor's contacts? Existing POs keep the name they were saved with.`,
      removeConfirm: "Remove",
      dialog: {
        addTitle: "Add contact",
        editTitle: "Edit contact",
        name: "Name",
        namePlaceholder: "Full name",
        email: "Email",
        emailPlaceholder: "person@acme.example",
        phone: "Phone",
        phonePlaceholder: "+91 98765 43210",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving…",
      },
    },
    notes: {
      cardTitle: "Notes",
      empty: "No notes yet.",
    },
    delete: {
      title: "Delete vendor?",
      // `"<name>". You won't see it in vendor lists or pickers afterwards.`
      description: (name: string) =>
        `This will soft-delete "${name}". You won't see it in vendor lists or pickers afterwards.`,
      confirmLabel: "Delete",
      confirmingLabel: "Deleting…",
    },
  },
  form: {
    titleEdit: "Edit Vendor",
    titleCreate: "New Vendor",
    fields: {
      name: "Name",
      namePlaceholder: "ACME Distributors Pvt Ltd",
      contactName: "Contact name",
      contactNamePlaceholder: "Priya Shah",
      phone: "Phone",
      phonePlaceholder: "+91 98765 43210",
      email: "Email",
      emailPlaceholder: "ops@acme.example",
      gstNumber: "GST number",
      gstPlaceholder: "29ABCDE1234F2Z5",
      gstHelper: "15–20 characters.",
      status: "Status",
      notes: "Notes",
      notesPlaceholder: "Internal notes about this vendor.",
      addressSection: "Address",
      line1: "Address line 1",
      line1Placeholder: "Building, street",
      line2: "Address line 2",
      line2Placeholder: "Area, landmark",
      city: "City",
      cityPlaceholder: "Pune",
      state: "State",
      statePlaceholder: "Maharashtra",
      pincode: "Pincode",
      pincodePlaceholder: "411001",
    },
    actions: {
      cancel: "Cancel",
      saving: "Saving…",
      saveChanges: "Save Changes",
      createVendor: "Create Vendor",
    },
  },
  // Mutation toast messages (useVendors hook).
  toast: {
    created: "Vendor created",
    updated: "Vendor updated",
    deleted: "Vendor deleted",
  },
} as const
