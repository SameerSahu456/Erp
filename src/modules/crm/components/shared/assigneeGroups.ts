export type Assignee = {
  userId: string | null
  fallbackName: string | null
  role: string
}

// Roles that belong in the primary "Account Owners" grid (rendered as full
// cards with email/phone). Every other role (BDE, Pre-Sales Manager, …) is a
// "support" member rendered as a compact name-only row in a divided section.
export const OWNER_ROLES = new Set(["Assigned To", "Account Owner"])

export type SupportGroup = { role: string; members: Assignee[] }

// Group the non-owner assignees by role, preserving first-seen order, so the
// card can render one uppercase heading per role followed by its members.
export function groupSupportByRole(assignees: Assignee[]): SupportGroup[] {
  const groups: SupportGroup[] = []
  const byRole = new Map<string, SupportGroup>()
  for (const a of assignees) {
    if (OWNER_ROLES.has(a.role)) continue
    let group = byRole.get(a.role)
    if (!group) {
      group = { role: a.role, members: [] }
      byRole.set(a.role, group)
      groups.push(group)
    }
    group.members.push(a)
  }
  return groups
}
