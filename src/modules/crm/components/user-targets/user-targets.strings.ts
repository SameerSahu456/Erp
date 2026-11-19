// User-facing copy for the CRM › sale-targets sub-feature.
//
// Coding-guideline §16.12 — single typed `as const` source for titles,
// buttons, placeholders, empty/error/loading, dialog, and toast copy.
// Dynamic bits are function members (see `dialog.form.helper`).
export const USER_TARGETS_STRINGS = {
  breadcrumbs: {
    crm: "CRM",
    saleTargets: "Sale Targets",
  },
  page: {
    title: "Sale Targets",
    subtitle:
      "FY-scoped revenue targets for your team. Set, submit, approve, or amend from one place.",
    tabs: {
      all: "All Targets",
      approvals: "Approvals",
    },
    cta: {
      setForTeamMember: "Set target for a team member",
      setForAnyUser: "Create User Target",
      amend: "Amend",
      review: "Review",
      edit: "Edit",
      submit: "Submit for Approval",
      revise: "Revise",
      discard: "Discard",
      view: "View",
      bifurcate: "Bifurcation",
      viewBifurcation: "View Bifurcation",
    },
  },
  filters: {
    users: {
      label: "Users",
      placeholder: "Filter by user",
    },
    fy: {
      label: "Financial year",
      all: "All financial years",
      format: (startYear: number) => `${startYear}-${startYear + 1}`,
    },
    status: {
      label: "Status",
      all: "All statuses",
    },
    search: {
      placeholder: "Search by user…",
    },
  },
  table: {
    columns: {
      user: "User",
      fy: "FY",
      q1: "Q1",
      q2: "Q2",
      q3: "Q3",
      q4: "Q4",
      annual: "Annual",
      status: "Status",
      reviewer: "Last reviewed by",
      updatedAt: "Updated at",
      actions: "Actions",
    },
    autoReviewer: (name: string) => `Auto · ${name}`,
    noReviewer: "—",
    locked: "Approved targets can't be edited.",
    closedFy: "Closed FY — immutable",
  },
  empty: {
    noTargets: "No targets yet",
    noPending: "No targets waiting for approval",
    noTargetsHint: "Set a target for someone in your team to get started.",
    noPendingHint:
      "Non-admin targets for Product Managers / Assistant Product Managers appear here when submitted.",
  },
  dialog: {
    create: {
      title: "Set target",
      subtitle: "Enter the quarterly amounts. Monthly values are auto-split.",
    },
    edit: {
      title: "Edit target",
    },
    view: {
      title: "View target",
    },
    amend: {
      title: "Amend approved target",
      banner:
        "You are editing an Approved target. Status stays Approved; this change is logged as an admin amendment in the audit trail.",
    },
    form: {
      targetUser: {
        label: "Target user",
        placeholder: "Pick a user…",
      },
      fy: {
        label: "Financial year",
        helper:
          "India FY: Apr 1 – Mar 31. e.g. 2026 means FY 2026-27.",
      },
      quarters: {
        q1: "Q1 (Apr – Jun)",
        q2: "Q2 (Jul – Sep)",
        q3: "Q3 (Oct – Dec)",
        q4: "Q4 (Jan – Mar)",
      },
      annual: "Annual",
      annualHint: "Auto-computed as Q1 + Q2 + Q3 + Q4.",
      monthlyHint:
        "Each quarter will be auto-split into 3 monthly values (last month absorbs any paisa remainder).",
      routingHint: {
        approvalPrefix: "This target subject requires admin approval. ",
        approvalBody:
          "The row will land in Pending Approval until an admin reviews it.",
        autoPrefix: "This target will auto-approve on save. ",
        autoBody:
          "Approvers only review Product Manager / Assistant Product Manager targets.",
      },
    },
    reject: {
      title: "Reject target",
      helper: "Please provide a reason (min 5 characters).",
      placeholder:
        "e.g. Q3 ambition is unrealistic given current pipeline — please recalibrate.",
    },
    approve: {
      title: "Approve target",
      body: "Approving will move this target to Approved status. The author will be notified.",
    },
    discard: {
      title: "Discard target",
      body: "This target will be soft-deleted. The row stays for audit; you can create a new target for the same user and FY.",
    },
    bifurcate: {
      title: "Bifurcate target",
      subtitleFor: (userName: string, fy: string) =>
        `${userName} · FY ${fy}. Split the quarterly totals by category, OEM and condition.`,
      hint: "Any key left as “All” acts as a wildcard. A row with condition=All can’t coexist with specific-condition rows on the same category + OEM.",
      allocatedLabel: "Allocated",
      remainingLabel: "Remaining",
      headerLabel: "Header total",
      linesLabel: "Σ Lines",
      columns: {
        category: "Category",
        oem: "OEM",
        condition: "Condition",
        q1: "Q1",
        q2: "Q2",
        q3: "Q3",
        q4: "Q4",
        annual: "Annual",
      },
      addLine: "Add line",
      removeLine: "Remove",
      wildcard: "All",
      saveCta: "Save bifurcation",
      mismatchHint:
        "Σ Lines must equal the header totals on every quarter before you can save.",
      overlapHint:
        "A line with condition=All overlaps a specific-condition line on the same category + OEM. Pick one.",
      loadMore: "Load more",
      emptyHint: "No breakdown yet. Add a line to split this target.",
    },
    actions: {
      cancel: "Cancel",
      close: "Close",
      save: "Save",
      saveAmendment: "Save Amendment",
      approve: "Approve",
      reject: "Reject",
      submit: "Submit",
      confirmDiscard: "Discard",
    },
  },
  toast: {
    createdApproved: "Target saved and auto-approved",
    createdPending: "Target submitted for approval",
    updated: "Target updated",
    submitted: "Target submitted for approval",
    approved: "Target approved",
    rejected: "Target rejected",
    revised: "Target returned to draft",
    discarded: "Target discarded",
    bifurcationSaved: "Target breakdown saved",
  },
  errors: {
    loadFailed: "Couldn't load targets. Please retry.",
    saveFailed: "Save failed. Please retry.",
  },
} as const
