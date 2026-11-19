// User-facing copy for the Settings › Profile sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, field labels, and section headings live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX. Components import this
// via a relative path.
export const PROFILE_STRINGS = {
  page: {
    title: "Profile",
    subtitle: "View your personal information and preferences.",
  },
  personalInfo: {
    sectionTitle: "Personal Information",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    departmentLabel: "Department",
    roleLabel: "Role",
    saveChanges: "Save Changes",
  },
  accountInfo: {
    sectionTitle: "Account Info",
    roleLabel: "Role",
    lastLoginLabel: "Last login",
  },
} as const
