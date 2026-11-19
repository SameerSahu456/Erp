// User-facing copy for the loose top-level CRM account-contacts / address dialog
// components (AccountContactsField, AccountContactsEditor, AddressFormDialog,
// ContactFormDialog).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and toast
// messages live here as one typed `as const` object instead of being hardcoded
// ("naked") in JSX/hooks. Components import this single source so copy stays
// consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `*.edit`, `*.unlinkConfirm`).
export const ACCOUNT_CONTACTS_STRINGS = {
  contactsField: {
    existingContact: "Existing contact",
    newContact: "New contact",
    unnamedContact: "(unnamed contact)",
    markPrimary: "Mark as primary contact",
    primary: "Primary",
    editContact: "Edit contact",
    editAria: (name: string) => `Edit ${name || "contact"}`,
    remove: "Remove",
    addNewContact: "Add new contact",
  },
  picker: {
    linkExisting: "Link existing contact",
    title: "Link existing contact",
    searchPlaceholder: "Search contacts...",
    noResults: "No contacts found.",
    loadError: "Failed to load contacts",
    loadingMore: "Loading…",
    close: "Close",
  },
  // Single source of copy for the unified ContactFormDialog — used by BOTH the
  // account-create staging flow and the account-edit / deals / demo-requests
  // persist flow (replaces the former `newContactDialog` + `inlineAddContact`
  // buckets so create and edit render identical copy).
  contactDialog: {
    addTitle: "Add contact",
    editTitle: "Edit contact",
    name: "Name",
    namePlaceholder: "Name",
    email: "Email",
    emailPlaceholder: "name@example.com",
    phone: "Phone",
    phonePlaceholder: "10-digit Indian number",
    designation: "Designation",
    designationPlaceholder: "e.g. Purchase Manager",
    department: "Department",
    departmentPlaceholder: "Department",
    status: "Status",
    cancel: "Cancel",
    saveChanges: "Save changes",
    addContact: "Add contact",
    emailExists: (name: string) =>
      `A contact with this email already exists: ${name}.`,
    emailExistsGeneric: "A contact with this email already exists.",
    toast: {
      createFailed: "Failed to create contact",
      updateFailed: "Failed to update contact",
    },
    validation: {
      nameRequired: "Name is required.",
      reachRequired: "Provide at least one of email or phone.",
      designationMax: "Designation must be ≤ 100 characters.",
      departmentMax: "Department must be ≤ 100 characters.",
    },
  },
  contactsEditor: {
    loading: "Loading contacts…",
    loadError: "Failed to load contacts.",
    empty: "No contacts linked yet.",
    setPrimary: "Set as primary contact",
    primary: "Primary contact",
    editContact: "Edit contact",
    editAria: (name: string) => `Edit ${name}`,
    unlink: "Unlink",
    unlinkConfirm: (name: string) =>
      `Unlink ${name} from this account? The contact itself is not deleted.`,
    // Every account must keep at least one contact — unlinking the only one is
    // blocked (see contactAccountGuard / useAccountForm).
    lastContactBlocked:
      "Can't unlink — an account must have at least one contact. Add another contact first.",
    addNewContact: "Add new contact",
    toast: {
      linked: "Contact linked",
      linkFailed: "Failed to link contact",
      unlinked: "Contact unlinked",
      unlinkFailed: "Failed to unlink contact",
    },
  },
  // Single source of copy for the unified AddressFormDialog — used by BOTH the
  // persist flow (Sales Order / demo close-won, writes via API) and the stage
  // flow (close-won wizard, hands the address back to the parent). Replaces the
  // former `inlineAddAddress` (here) + `addressDialog` (accounts.strings.ts)
  // buckets so every add/edit-address modal renders identical copy. Label is
  // mandatory in both flows.
  addressDialog: {
    addTitle: "Add Address",
    editTitle: "Edit Address",
    // Pick-from-account toggle (stage flow only, when account addresses exist).
    fromAccount: "From Account",
    newAddress: "New Address",
    default: "Default",
    alreadyAdded: "Already added",
    label: "Label",
    labelPlaceholder: "e.g. HQ Billing, Pune DC",
    type: "Type",
    both: "Both",
    line1: "Address Line 1",
    line1Placeholder: "Street address, building, floor",
    line2: "Address Line 2",
    line2Placeholder: "Area, landmark (optional)",
    city: "City",
    cityPlaceholder: "City",
    state: "State",
    statePlaceholder: "State",
    pincode: "Pincode",
    pincodePlaceholder: "6-digit pincode",
    gstin: "GSTIN (optional)",
    gstinPlaceholder: "e.g. 29ABCDE1234F1Z5",
    gstinHint: "The GSTIN registered at this location. Leave blank to use the account's GSTIN.",
    setAsDefault: "Set as default address",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    addAddress: "Add Address",
    validation: {
      labelRequired: "Label is required.",
      line1Required: "Address line 1 is required.",
      line1Max: "Address line 1 must be ≤ 255 characters.",
      line2Max: "Address line 2 must be ≤ 255 characters.",
      cityRequired: "City is required.",
      cityMax: "City must be ≤ 100 characters.",
      stateRequired: "State is required.",
      stateMax: "State must be ≤ 100 characters.",
      pincodeRequired: "Pincode is required.",
      labelMax: "Label must be ≤ 100 characters.",
      gstinFormat:
        "GSTIN must be 15 characters: 2-digit state code + PAN + entity number + Z + check digit.",
      fixHighlighted: "Please fix the highlighted fields.",
    },
  },
} as const

// ── Display labels for backend enum values ──
// The Select rows render the enum value as its own label; hoisted here so the
// JSX carries a label lookup rather than a naked string equal to the value.
export const CONTACT_STATUS_LABELS = {
  Active: "Active",
  Inactive: "Inactive",
} as const

export const ADDRESS_TYPE_LABELS = {
  Billing: "Billing",
  Shipping: "Shipping",
  Both: "Both",
} as const
