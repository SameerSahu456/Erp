// User-facing copy for the page-shell components (Breadcrumbs, EntityHeader,
// FormPageShell, PageHeader).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): accessible
// labels, button labels, and dynamic copy that appear in the shared shell
// chrome live here so they are never hardcoded in JSX.
//
// Dynamic copy is expressed as a function member.
export const PAGE_SHELLS_STRINGS = {
  breadcrumbs: {
    navAriaLabel: "Breadcrumb",
  },
  entityHeader: {
    goBackAriaLabel: "Go back",
    /** `"3 owners"` — pluralised at runtime. */
    ownersCount: (count: number) => `${count} owner${count !== 1 ? "s" : ""}`,
  },
  formPageShell: {
    formActionsAriaLabel: "Form actions",
    cancel: "Cancel",
  },
  pageHeader: {
    goBackAriaLabel: "Go back",
  },
} as const
