// User-facing copy for the IMS › specification-attributes sub-feature: the
// master list page + form, the attribute picker on the Category form, and the
// key/value dropdowns in the part/variant Specifications editor.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const SPEC_ATTRIBUTES_STRINGS = {
  form: {
    editTitle: (name: string) => `Edit specification ${name}`,
    createTitle: "Add Specification Attribute",
    nameLabel: "Name",
    namePlaceholder: "RAM",
    nameHelperText:
      "Shown as the specification key on parts and variants. Renaming it also renames it on every part and variant that uses it.",
    valuesLabel: "Suggested values",
    valuesPlaceholder: "Type a value and press Enter",
    valuesHelperText:
      "Offered in the value dropdown. Users can still type a value that isn’t listed. At least one is required while the attribute is active.",
    categoriesLabel: "Categories",
    categoriesPlaceholder: "Select categories…",
    categoriesHelperText:
      "The categories this attribute applies to. It’s then offered on those categories’ parts and variants. You can also manage this from the category.",
    activeLabel: "Active",
    activeHelperText:
      "Inactive attributes stay on the parts and variants that already use them, but don’t appear in new selections.",
    activeAriaLabel: "Specification attribute is active",
    loadError:
      "Couldn’t load this specification attribute. The id may be invalid or you may not have access.",
    saveChanges: "Save changes",
    createSubmit: "Create attribute",
    saveFallbackError: "Failed to save specification attribute",
  },
  list: {
    title: "Specification Attributes",
    subtitle:
      "The master list of specification names (RAM, CPU, Storage …) picked on categories, parts and variants.",
    add: "Add Attribute",
    editTitle: "Edit attribute",
    deleteTitle: "Delete attribute",
    deleteDialogHeading: "Delete this specification attribute?",
    deleteDescription: (name: string) =>
      `“${name}” will be deleted. If it’s linked to a category or used on a part or variant, deleting is blocked — mark it inactive instead.`,
    deleteCancel: "Cancel",
    deleting: "Deleting…",
    deleteConfirm: "Delete attribute",
    columns: {
      name: "Name",
      values: "Suggested values",
      categories: "Categories",
      status: "Status",
      actions: "Actions",
    },
    active: "Active",
    inactive: "Inactive",
    noValues: "—",
    editAriaLabel: (name: string) => `Edit ${name}`,
    deleteAriaLabel: (name: string) => `Delete ${name}`,
    empty: {
      title: "No specification attributes yet",
      descriptionWrite:
        "Add attributes like RAM or CPU so they can be linked to categories and picked on parts and variants.",
      descriptionReadOnly:
        "Ask an admin to add specification attributes so they can be picked on parts and variants.",
    },
    error: {
      title: "Couldn’t load specification attributes",
      description: "Something went wrong while loading. Please try again.",
    },
  },
  // Attribute dropdown (Category form picker + spec key dropdown).
  picker: {
    searchPlaceholder: "Search specifications…",
    categoryGroup: (categoryName: string) => `${categoryName} specifications`,
    otherGroup: "Other specifications",
    loading: "Loading…",
    empty: "No matching specification.",
    inactiveBadge: "Inactive",
    removeAriaLabel: (name: string) => `Remove ${name}`,
    moveUpAriaLabel: (name: string) => `Move ${name} up`,
    moveDownAriaLabel: (name: string) => `Move ${name} down`,
    categoryLabel: "Specification attributes",
    categoryHelper:
      "Listed first, in this order, in the Specifications dropdown on this category’s parts and variants. All other attributes stay available below them.",
    categoryNone: "No specification attributes linked yet.",
  },
  // Spec key / value cells in the part/variant Specifications editor.
  editor: {
    keyPlaceholder: "Select specification",
    valuePlaceholder: "Value",
    valueSearchPlaceholder: "Search or type a value…",
    useTypedValue: (value: string) => `Use “${value}”`,
    noSuggestions: "No suggested values — type your own.",
    unknownKey: (key: string) =>
      `“${key}” isn’t in the specification master. Pick a specification from the list.`,
  },
  // Stock Items › Specification filter.
  filter: {
    button: "Specifications",
    buttonCount: (n: number) => `Specifications (${n})`,
    heading: "Filter by specification",
    helper: "Show only variants that match every row.",
    addRow: "Add condition",
    apply: "Apply",
    clear: "Clear",
    valuePlaceholder: "Value",
  },
  toasts: {
    created: "Specification attribute created",
    updated: "Specification attribute updated",
    deleted: "Specification attribute deleted",
  },
} as const
