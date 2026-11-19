// Role names the UI must not allow updating (permissions, channel tags,
// or rename). `admin` mirrors the backend lock in
// app/modules/auth/services/role_service.py (SYSTEM_ROLES → 403
// ROLE_IS_SYSTEM); `superadmin` is blocked frontend-side because the
// backend treats it as a superuser role (`_SUPERUSER_ROLE_NAMES`) whose
// access bypasses permission checks entirely — edits would be
// misleading no-ops. Single source for every roles-UI surface so the
// list badges and both dialogs can't drift.
export const SYSTEM_ROLE_NAMES = ['admin', 'superadmin'] as const

export function isSystemRoleName(name: string | null | undefined): boolean {
  return !!name && (SYSTEM_ROLE_NAMES as readonly string[]).includes(name.toLowerCase())
}
