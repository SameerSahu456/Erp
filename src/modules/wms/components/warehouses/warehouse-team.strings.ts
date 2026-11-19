// User-facing copy for the WMS › warehouses › Team Members tab.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the table, its
// empty/error states, per-row aria-labels, and the remove-member dialog copy
// live here as one typed `as const` object instead of being hardcoded ("naked")
// in JSX. The components import this single source so copy stays consistent.
export const WAREHOUSE_TEAM_STRINGS = {
  title: "Team members",
  searchPlaceholder: "Search name or email…",
  filters: {
    role: "Role",
    allRoles: "All roles",
    level: "Level",
    allLevels: "All levels",
  },
  addMember: "Add team member",

  columns: {
    name: "Name",
    email: "Email",
    role: "Role",
    level: "Level",
    actions: "Actions",
  },

  states: {
    teamErrorTitle: "Couldn’t load the team",
    teamErrorDescription: "Refresh to try again.",
    emptyTitle: "No team members yet",
    emptyDescription: "Assign store managers, MIS, and engineers to this warehouse.",
  },

  // Per-row icon-button accessible labels.
  editAria: (name: string) => `Edit ${name}`,
  removeAria: (name: string) => `Remove ${name}`,

  // Remove-team-member dialog.
  removeDialog: {
    title: (name: string) => `Remove ${name} from this warehouse?`,
    description: "This removes warehouse access only. The Comprint user account is not deleted.",
    openWorkTitle: "Open work stays assigned",
    openWork: (name: string) =>
      `Any inspection or repair job assigned to ${name} in this warehouse stays with them until someone reassigns it.`,
    reasonLabel: "Reason",
    reasonPlaceholder: "e.g. moved to another warehouse",
    // §0.9 — disabled-confirm tooltip naming the empty required reason.
    blockedReason: "Enter a reason to continue.",
    cancel: "Cancel",
    remove: "Remove access",
    removing: "Removing…",
  },
} as const;
