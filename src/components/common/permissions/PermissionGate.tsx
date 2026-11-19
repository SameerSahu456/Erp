import type { ReactNode } from "react";

import { useAuth } from "@shared/auth/use-auth";

interface PermissionGateProps {
  children: ReactNode;
  /** Render only if the current user has any of these roles. Falls back otherwise. */
  anyRole?: string[];
  /** Render only if the current user has ALL of these roles. Falls back otherwise. */
  allRoles?: string[];
  /** Rendered when the gate denies access. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Conditional renderer keyed off the authenticated user's role list.
 *
 * Usage:
 *   <PermissionGate anyRole={["admin", "manager"]}>
 *     <DangerousButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  children,
  anyRole,
  allRoles,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];

  if (anyRole && anyRole.length > 0) {
    const matched = anyRole.some((r) => userRoles.includes(r));
    if (!matched) return <>{fallback}</>;
  }

  if (allRoles && allRoles.length > 0) {
    const matched = allRoles.every((r) => userRoles.includes(r));
    if (!matched) return <>{fallback}</>;
  }

  return <>{children}</>;
}
