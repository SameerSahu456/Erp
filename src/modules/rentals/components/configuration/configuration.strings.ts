import { BILLING_GRACE_MAX, BILLING_GRACE_MIN } from "../../constants/billing";

/** Rentals Configuration page — billing schedule, manual run, agreement
 *  defaults and settings change history.
 *  Setting names live in `constants/rental-settings.ts`. */
export const CONFIGURATION_STRINGS = {
  agreementDefaults: {
    title: "Agreement defaults",
    description:
      "What a new rental agreement starts with, and what approving one requires.",
    graceLabel: "Default billing grace days",
    graceHelp: `Days assumed between dispatch and delivery when no delivery date is recorded. New agreements start with this; each agreement can still override it. ${BILLING_GRACE_MIN}–${BILLING_GRACE_MAX}.`,
    graceInvalid: `Enter a whole number from ${BILLING_GRACE_MIN} to ${BILLING_GRACE_MAX}.`,
    returnGraceLabel: "Default return grace days",
    returnGraceHelp: `Days in transit on the way back that are not charged when a unit is settled at warehouse arrival. Accounts without their own billing settings start with this; each account and agreement can still override it. ${BILLING_GRACE_MIN}–${BILLING_GRACE_MAX}.`,
    requireSignedLabel: "Require signed document for approval",
    requireSignedHelp:
      "When on, an agreement can only be approved once Comprint and the customer have signed and the signed document is uploaded. Agreements already approved are not affected.",
    readOnly: "You can view these settings but not change them.",
  },
  history: {
    title: "Change history",
    description: "Who changed which rental setting, and when.",
    loading: "Loading change history…",
    failed: "Could not load the change history.",
    empty: "No settings changes recorded yet.",
    unknownUser: "System",
    columns: {
      setting: "Setting",
      change: "Change",
      user: "Changed by",
      when: "When",
    },
    change: (from: string, to: string) => `${from} → ${to}`,
    on: "On",
    off: "Off",
  },
  configuration: {
    title: "Rental configuration",
    description:
      "When the daily billing run fires, and whether it fires at all.",
    loading: "Loading configuration…",
    loadError: "Could not load the billing configuration.",
    scheduleTitle: "Billing schedule",
    enabled: "Run billing automatically",
    enabledHelp:
      "When off, no invoices are raised on schedule. You can still run billing by hand below.",
    // The run time on a 12-hour clock: one label, three typed-or-picked parts.
    runTime: "Run time (IST)",
    hour: "Hour",
    minute: "Minute",
    meridiem: "AM or PM",
    timeSeparator: ":",
    timeHelp:
      "Changing the time creates a new slot for today, which re-triggers a run. That is deliberate — re-running is safe, because a settled period is never billed twice.",
    lastRun: "Last run",
    lastSlot: "Last slot claimed",
    never: "Never",
    save: "Save schedule",
    manualTitle: "Run billing now",
    manualHelp:
      "Bills every order due on each day from From to To, as the daily run would have. Safe to repeat — an order already settled for a period is never billed again.",
    runPeriod: "Period",
    runPeriodPlaceholder: "Today",
    runDateHelp:
      "Leave blank to run today, pick one day, or pick a From–To range. A past date makes a back-dated correction; a future date bills that period ahead of time.",
    runRange: (from: string, to: string) => `each day from ${from} to ${to}`,
    rangeInverted: "To must be on or after From.",
    rangeTooLong: (days: number) => `One run covers at most ${days} days — split the range.`,
    run: "Run billing",
    running: "Running…",
    // A run WRITES invoices and moves every billed unit's anchor forward.
    // There is no undo, so it is confirmed and the date is named (§5).
    runTitle: "Run billing now?",
    runDescription: (when: string) =>
      `This raises invoices for every unit due ${when} and moves their billing anchors forward. Invoices already raised are not repeated, but the run cannot be undone.`,
    runOn: (date: string) => `on ${date}`,
    runToday: "today",
    runConfirm: "Run billing",
    runCancel: "Not now",
  },
} as const;
