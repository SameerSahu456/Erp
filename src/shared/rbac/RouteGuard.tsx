import type { ReactNode } from "react";

import { NoAccess } from "@/shared/components/feedback/NoAccess";

import { usePermission } from "./usePermission";

interface RouteGuardProps {
  // OR-bundle: user passes if they hold at least one code in the array.
  required?: string | string[];
  // AND-of-OR-bundles: each inner array is an OR-bundle, and the user
  // must satisfy every bundle. Use when a flow chains multiple resources
  // (e.g. Lead → Account → Quote → Sales Order on close-won) — the page
  // can't function without authority on every step. Cheaper than wrapping
  // with multiple <RouteGuard>s and keeps a single fallback.
  requiredAll?: readonly (string | readonly string[])[];
  // Strict superuser gate — only `is_superuser` users may enter, regardless
  // of any permission codes they hold.
  superuserOnly?: boolean;
  // Plain sentence shown INSTEAD of the per-code "you need one of…" list. For
  // a very wide OR-bundle (e.g. every CRM code) the list is dozens of codes
  // and means nothing to the user.
  deniedMessage?: string;
  children: ReactNode;
}

// Route-level RBAC gate. Renders the `<NoAccess />` panel inline when the
// user lacks the required permission(s) instead of redirecting.
//
// Earlier this bounced to `/` via `<Navigate to="/" replace />`, but the
// Home Dashboard was hidden on 2026-05-23 — `/` now forwards to
// `/crm/leads`. A user without `crm.lead.read` who landed on `/crm/leads`
// would bounce to `/`, which would forward back to `/crm/leads`, looping
// until React Router's "Too many calls to Location or History APIs"
// safeguard threw and the ErrorBoundary caught a DOMException.
//
// Rendering the panel keeps the URL stable, surfaces a clear "Access
// Denied" message, and leaves the AppShell sidebar available so the user
// can navigate to a module they actually have access to.
export function RouteGuard({
  required,
  requiredAll,
  superuserOnly,
  deniedMessage,
  children,
}: RouteGuardProps) {
  const { can, isSuperuser, missing, missingAll } = usePermission();

  if (superuserOnly && !isSuperuser) {
    return <NoAccess />;
  }

  if (required !== undefined && !can(required)) {
    return deniedMessage ? (
      <NoAccess description={deniedMessage} />
    ) : (
      <NoAccess missingPermissions={missing(required)} />
    );
  }

  if (requiredAll !== undefined) {
    const missingGroups = missingAll(requiredAll);
    if (missingGroups.length > 0) {
      return <NoAccess missingPermissions={missingGroups} />;
    }
  }

  return <>{children}</>;
}
