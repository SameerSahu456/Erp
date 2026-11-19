import type { ReactNode } from "react";

import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { useAccess, type AccessRule } from "./access";

interface AccessGuardProps {
  /**
   * Rule combining superuser bypass + role names + permission codes (OR). The
   * user passes when any avenue matches. See {@link AccessRule}.
   */
  rule: AccessRule;
  /** Rendered on denial when `showReason` is false. Defaults to nothing. */
  fallback?: ReactNode;
  /**
   * Render a compact <NoAccess> on denial instead of `fallback`. Names the
   * permission codes the rule required (role-only avenues aren't listed).
   */
  showReason?: boolean;
  children: ReactNode;
}

/**
 * Declarative gate for a role-OR-permission {@link AccessRule} — the
 * role-aware counterpart to `PermissionGuard` (which is permission-only).
 * Wrap any element that should appear only for users the rule admits.
 */
export function AccessGuard({
  rule,
  fallback = null,
  showReason = false,
  children,
}: AccessGuardProps) {
  const { hasAccess } = useAccess();

  if (!hasAccess(rule)) {
    if (!showReason) return <>{fallback}</>;
    const perms = rule.permissions
      ? Array.isArray(rule.permissions)
        ? [...rule.permissions]
        : [rule.permissions as string]
      : undefined;
    return <NoAccess compact missingPermissions={perms} />;
  }

  return <>{children}</>;
}
