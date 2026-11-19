// OR semantics for arrays — mirrors backend `require_permission(*codes)` at
// `comprint-erp-backend/app/core/rbac/dependencies.py`. Every CRM endpoint is
// gated as `require_permission(broad_code, finer_code)`; user holding *either*
// passes. The frontend bundles in `modules/crm/permissions.ts` follow the same
// shape, so `can()` must match.
export function can(
  userPerms: string[],
  required: string | readonly string[],
): boolean {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required as string];
  return list.some((p) => userPerms.includes(p));
}

// Alias retained for backwards compatibility with `usePermission().canAny`.
// Identical to `can()` when given an array; existing callers continue to work.
export function canAny(userPerms: string[], required: readonly string[]): boolean {
  return required.some((p) => userPerms.includes(p));
}
