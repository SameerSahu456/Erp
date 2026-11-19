import { useAuth } from '@shared/auth/use-auth'
import { fullName } from '@shared/auth/AuthContext'
import type { UserRole } from '@shared/auth/roles'
import { ROLE_HIERARCHY } from '@/constants/roles'

// Read-only profile controller. Every value comes straight from the current
// user (GET /auth/me) — no local edit state. The Profile tab renders disabled
// inputs because the backend has no self-service profile-update endpoint yet
// (only the admin PATCH /users/{id}, gated by AUTH_USERS_MANAGE). Fields with
// no backend source (bio, member-since, notification prefs) are commented out
// in the view rather than faked.
export function useProfile() {
  const { user: authUser } = useAuth()
  // ProfilePage is rendered under RequireAuth, so authUser is always non-null here
  const user = authUser!
  const displayName = fullName(user)
  // A user can hold multiple roles — surface every one, not just the first.
  // Fall back to a single VIEWER pill when the account has no roles at all.
  const roles = (user.roles.length ? user.roles : ['VIEWER']) as UserRole[]
  const roleLabels = roles.map((role) => ROLE_HIERARCHY[role]?.label ?? role)
  const primaryRole = roles[0]
  const roleConfig = ROLE_HIERARCHY[primaryRole]

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return {
    authUser,
    user,
    displayName,
    roles,
    roleLabels,
    primaryRole,
    roleConfig,
    name: displayName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    designation: user.designation,
    location: user.location,
    branch: user.branch,
    lastLoginAt: user.last_login_at,
    initials,
  }
}

export type ProfileController = ReturnType<typeof useProfile>
