// User-facing copy for the WMS › warehouses create/edit form.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, field
// labels, placeholders, hints, empty/not-found text, and button labels live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX. The component imports this single source so copy stays consistent and is
// edited in one place.
//
export const WAREHOUSE_FORM_STRINGS = {
  header: {
    back: "Back",
    editTitle: "Edit Warehouse",
    newTitle: "Create Warehouse",
    createSubtitle: "Add a new warehouse to manage storage locations, stock and team access.",
  },

  sections: {
    details: "Warehouse details",
    capabilities: "Storage capabilities",
    address: "Warehouse address",
  },

  notFound: {
    title: "Warehouse not found",
    back: "Back to warehouses",
    message: "Warehouse not found — it may have been deleted.",
  },

  fields: {
    name: {
      label: "Name",
      placeholder: "Mumbai Refurb Warehouse",
      helper: "Visible to store staff in pickers and dashboards.",
    },
    code: {
      label: "Code",
      placeholder: "MUM-WH1",
      immutableHelper: "Code is immutable after creation.",
      helper:
        "Uppercase letters, numbers, hyphens or underscores. 2–20 chars. Starts with a letter.",
    },
    description: {
      label: "Description",
      placeholder: "Physical stock area for refurbished laptops.",
    },
    categories: {
      label: "Categories handled",
      placeholder: "Select categories…",
      helper: "Selecting a category covers all its sub-categories.",
    },
    conditions: {
      label: "Stock conditions accepted",
      placeholder: "Select options",
      helper: "Choose the conditions this warehouse can store.",
      nounSingular: "condition",
      nounPlural: "conditions",
    },
    addressLine1: {
      label: "Address line 1",
      placeholder: "Plot 42, MIDC Industrial Area",
    },
    addressLine2: {
      label: "Address line 2",
      placeholder: "Andheri East",
    },
    city: {
      label: "City",
      placeholder: "Mumbai",
    },
    state: {
      label: "State",
      placeholder: "Select state",
      searchPlaceholder: "Search state",
      emptyText: "No state matches.",
    },
    pincode: {
      label: "Pincode",
      placeholder: "400093",
    },
    country: {
      label: "Country",
      placeholder: "Select country",
      searchPlaceholder: "Search country",
      emptyText: "No country matches.",
    },
  },

  actions: {
    cancel: "Cancel",
    saving: "Saving…",
    creating: "Creating…",
    saveChanges: "Save changes",
    createWarehouse: "Create warehouse",
  },
} as const;
