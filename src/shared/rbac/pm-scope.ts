import { useAuth } from "@shared/auth/use-auth";

// Per-line PM scope predicate used by PM-approvals surfaces that list
// items assigned to a specific PM (MI items, SO lines, Demo request
// items). Mirrors the backend gate: superusers see everything; regular
// users see only rows whose assignee_id matches their own user id.
//
// Items with no assignee (null/empty) are treated as out-of-scope for
// regular users — unassigned work shouldn't surface in someone's PM
// queue. Superusers still see them so they can triage.
export function canSeePmScopedItem(params: {
  assigneeId: string | null | undefined;
  currentUserId: string | null | undefined;
  isSuperuser: boolean;
}): boolean {
  if (params.isSuperuser) return true;
  if (!params.currentUserId) return false;
  if (!params.assigneeId) return false;
  return params.assigneeId === params.currentUserId;
}

// Hook flavour that closes over the logged-in user once and returns a
// stable predicate `(assigneeId) => boolean`. Use this inside the three
// PM approval detail surfaces (MI / SO / Demo) when filtering items.
export function useCanSeePmScopedItem(): (
  assigneeId: string | null | undefined,
) => boolean {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const isSuperuser = !!user?.is_superuser;
  return (assigneeId) =>
    canSeePmScopedItem({ assigneeId, currentUserId, isSuperuser });
}
