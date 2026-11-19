import { useAuth } from "@shared/auth/use-auth";

import { can } from "./can";

/**
 * A declarative access rule. A user satisfies it when ANY avenue matches (OR
 * across all three), so you grant access by *adding* an avenue:
 *
 *   - `allowSuperuser` (default `true`) → a backend `is_superuser` always passes
 *     (mirrors the backend `require_permission` superuser bypass).
 *   - `permissions` → the user holds at least one of these permission codes.
 *   - `roles` → the user holds at least one of these role names (matched
 *     case-insensitively).
 *
 * To open a feature to a NEW role or an additional permission, add it to the
 * rule's `roles` / `permissions` — no call-site changes required.
 *
 *   const CAN_SEE = { permissions: ['crm:user_log_read'], roles: ['admin'] }
 *   useAccess().hasAccess(CAN_SEE)
 */
export interface AccessRule {
  /** Permission codes — pass if the user holds at least one (OR). */
  permissions?: string | readonly string[];
  /** Role names — pass if the user holds at least one (case-insensitive, OR). */
  roles?: string | readonly string[];
  /** When `true` (default), `is_superuser` bypasses every other check. */
  allowSuperuser?: boolean;
}

/** The identity facts an access check runs against. */
export interface AccessContext {
  isSuperuser: boolean;
  roles: readonly string[];
  permissions: readonly string[];
}

const toList = (v: string | readonly string[] | undefined): string[] =>
  v == null ? [] : Array.isArray(v) ? [...v] : [v as string];

/**
 * Pure access evaluator (no React) — superuser bypass, then OR across the
 * rule's permission codes and role names. Safe to unit-test and to call from
 * non-component code (loaders, guards). The hook form is `useAccess`.
 */
export function hasAccess(ctx: AccessContext, rule: AccessRule): boolean {
  if ((rule.allowSuperuser ?? true) && ctx.isSuperuser) return true;

  const perms = toList(rule.permissions);
  if (perms.length > 0 && can([...ctx.permissions], perms)) return true;

  const wantedRoles = toList(rule.roles).map((r) => r.toLowerCase());
  if (wantedRoles.length > 0) {
    const held = ctx.roles.map((r) => r.toLowerCase());
    if (wantedRoles.some((r) => held.includes(r))) return true;
  }

  return false;
}

/**
 * Hook form: binds {@link hasAccess} to the current user. Returns the raw
 * {@link AccessContext} plus a `hasAccess(rule)` checker.
 */
export function useAccess() {
  const { user } = useAuth();
  const ctx: AccessContext = {
    isSuperuser: !!user?.is_superuser,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
  };
  return {
    ...ctx,
    hasAccess: (rule: AccessRule) => hasAccess(ctx, rule),
  };
}
