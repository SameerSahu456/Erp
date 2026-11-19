// Tab-badge count helper.
// Calls the same useEntityAuditTrail query as the tab body — TanStack Query
// dedupes by queryKey, so the network call happens once per (entity, entityId)
// regardless of how many call sites mount the hook.

import { useEntityAuditTrail, type AuditEntityKind } from "./useEntityAuditTrail";

/**
 * Returns the audit-trail tab badge count for an entity.
 *
 * Uses server-reported `total` from page 1 (per Coding-guideline.md §16.7 #3),
 * NOT entries.length, plus the count of any locally-injected extraEntries
 * (e.g. the synthetic closed-lost shim on the lead/deal detail pages).
 *
 * Accepts `string | undefined` so call sites can hoist the hook above any
 * early-return / suspense boundary that runs while the parent query is still
 * loading the entity — Rules of Hooks require the call order to be stable
 * across renders. When `entityId` is falsy the underlying query is disabled
 * and this returns just `extraEntriesCount`.
 */
export function useEntityAuditTrailCount(
  entity: AuditEntityKind,
  entityId: string | undefined,
  extraEntriesCount: number,
  /**
   * When false the underlying query is disabled — no network call fires, but
   * the hook still subscribes to the existing cache entry under the same
   * queryKey. Used by the CRM detail pages to defer the audit-trail fetch
   * until the user actually opens the audit-trail tab, then keep the badge
   * stable when they navigate away.
   */
  enabled: boolean = true,
): number {
  // Always reads page 1 (default page/pageSize) so the badge count stays
  // stable regardless of which page the tab body is viewing. TanStack dedupes
  // with the tab body's page-1 query by shared queryKey.
  const q = useEntityAuditTrail(entity, entityId, { enabled });
  const total = q.data?.total ?? 0;
  return total + extraEntriesCount;
}
