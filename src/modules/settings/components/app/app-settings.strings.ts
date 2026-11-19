// User-facing copy for the Settings › App Settings sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, helper text, dialog copy, and section headings live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX. Components import this via a relative path.
export const APP_SETTINGS_STRINGS = {
  page: {
    title: "App Settings",
    subtitle: "Theme, color mode, notifications, and account preferences.",
  },
  appearance: {
    sectionTitle: "Appearance",
    colorModeLabel: "Color Mode",
    lightMode: "Light",
    darkMode: "Dark",
    systemMode: "System",
  },
  display: {
    sectionTitle: "Display",
    sidebarDefaultLabel: "Sidebar Default State",
    sidebarExpanded: "Expanded",
    sidebarCollapsed: "Collapsed",
    itemsPerPageLabel: "Items per Page",
    dateFormatLabel: "Date Format",
    dateFormatDDMMYYYY: "DD/MM/YYYY",
    dateFormatMMDDYYYY: "MM/DD/YYYY",
    dateFormatYYYYMMDD: "YYYY-MM-DD",
    currencyLabel: "Currency",
    languageLabel: "Language",
    languagePlaceholder: "English",
    languageEnglish: "English",
    moreLanguagesSoon: "More languages coming soon",
  },
  notifications: {
    sectionTitle: "Notifications",
    emailNotificationsLabel: "Email Notifications",
    pushNotificationsLabel: "Push Notifications",
    notificationTypesLabel: "Notification Types",
    crmLabel: "CRM",
    wmsLabel: "WMS",
    procurementLabel: "Procurement",
    invoicesLabel: "Invoices",
    digestFrequencyLabel: "Digest Frequency",
    digestDaily: "Daily",
    digestWeekly: "Weekly",
    digestNone: "None",
  },
  dataPrivacy: {
    sectionTitle: "Data & Privacy",
    exportTitle: "Export All Data",
    exportDescription: "Download all your data as a ZIP archive",
    exportButton: "Export",
    deleteTitle: "Delete Account",
    deleteDescription: "Permanently delete your account and all data",
    deleteDialogTitle: "Delete Account",
    deleteDialogDescription:
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.",
    deleteConfirmLabel: "Delete Account",
    deleteButton: "Delete Account",
  },
  saveButton: "Save Settings",
} as const
