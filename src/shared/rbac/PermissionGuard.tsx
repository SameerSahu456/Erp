import type { ReactNode } from "react";

import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { usePermission } from "./usePermission";

interface PermissionGuardProps {
  // OR-bundle: user passes if they hold at least one code.
  required?: string | string[];
  // AND-of-OR-bundles — same shape as `RouteGuard.requiredAll`. Useful for
  // composite CTAs (e.g. a "Convert to SO" button that requires both
  // source and destination authority).
  requiredAll?: readonly (string | readonly string[])[];
  fallback?: ReactNode;
  // When true, a denial renders a compact <NoAccess> naming the missing
  // permission instead of `fallback`. Default stays silent (fallback) so the
  // common "hide the button" usage is unchanged — opt in for inline slots
  // (a section, a disabled-action panel) where explaining the denial helps.
  showReason?: boolean;
  children: ReactNode;
}

export function PermissionGuard({
  required,
  requiredAll,
  fallback = null,
  showReason = false,
  children,
}: PermissionGuardProps) {
  const { can, missing, missingAll } = usePermission();

  const deny = (missingPermissions: readonly string[] | readonly string[][]) =>
    showReason ? (
      <NoAccess compact missingPermissions={missingPermissions} />
    ) : (
      <>{fallback}</>
    );

  if (required !== undefined && !can(required)) {
    return deny(missing(required));
  }

  if (requiredAll !== undefined) {
    const missingGroups = missingAll(requiredAll);
    if (missingGroups.length > 0) {
      return deny(missingGroups);
    }
  }

  return <>{children}</>;
}
