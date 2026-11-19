// useQuery wrapper for the entity-detail audit timeline.
//
// Numbered pagination (Coding-guideline §16.7): the audit-trail tab pages
// through the API one page at a time with a 1-indexed `page`, driven by the
// shared `TablePagination` footer — mirroring the Notes / Comments / Tasks
// tabs. `keepPreviousData` keeps the current page visible (no flash to
// skeleton) while the next page loads.
//
// No per-call staleTime/gcTime/retry/refetchOn* (§6.5.1) — global
// API.QUERY_DEFAULTS in src/app/providers.tsx owns those.

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PAGINATION } from "@/shared/constants";

import { fetchAuditTrailPage } from "../api";

export type AuditOrder = "newest" | "oldest";

export type AuditEntityKind =
  | "lead"
  | "deal"
  | "rental_device"
  | "sales_order";

/** Everything the hook can read: the timeline-tab entities plus resources
 *  that only ever render as a plain table (not an `<EntityAuditTrailTab>`),
 *  so the tab and its activity mapper keep their narrower union. */
export type AuditTrailResource = AuditEntityKind | "rental_settings";

// Backend emits these resource_type strings from app/modules/crm/services/
// sales_order_service.py (plural — confirmed at lines 527 / 548). If a new
// entity is added, extend this map alongside the backend audit.record() call.
//
// `rental_device` -> `rental_devices` is written by
// app/modules/rentals/services/device_service.py (hold / un-hold / delivery)
// and so_configure_service.py (one entry per unit at dispatch). Order- and
// account-level rentals events are deliberately NOT under this key: they are
// facts about the contract, and repeating them on every unit would bury the
// unit's own history.
const RESOURCE_TYPE_BY_ENTITY: Record<AuditTrailResource, string> = {
  lead: "leads",
  deal: "deals",
  rental_device: "rental_devices",
  // `sales_order` -> `sales_orders`. The backend's `expand_children`
  // widens this one from three CRM rows into the order's whole working
  // life — line approvals, the rental configuration, every device
  // dispatch / hold / extend / return, the material issue, the dispatch
  // and the invoices — because all of those are facts about THIS order
  // filed under ids nobody could reach from it.
  sales_order: "sales_orders",
  // Every rentals settings save (scheduler, policy, agreement defaults,
  // PO renewal email) is filed under ONE fixed id —
  // `RENTAL_SETTINGS_RESOURCE_ID` in app/modules/rentals/enums.py.
  rental_settings: "rental_settings",
};

/** Query-key prefix for one entity kind's trail, so a module that changes
 *  that entity can invalidate its timeline without restating the key. */
export function auditTrailKey(entity: AuditTrailResource) {
  return ["audit", "trail", entity] as const;
}

export function useEntityAuditTrail(
  entity: AuditTrailResource,
  entityId: string | undefined,
  options?: {
    enabled?: boolean
    page?: number
    pageSize?: number
    /** Timeline direction. Sent to the API, never applied here — the
     *  response is paged, so sorting locally would only reorder the rows
     *  this page happens to hold (§16.7). */
    order?: AuditOrder
  },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const order = options?.order ?? "newest";
  return useQuery({
    queryKey: [...auditTrailKey(entity), entityId, { page, pageSize, order }] as const,
    enabled: (options?.enabled ?? true) && !!entityId,
    queryFn: () =>
      fetchAuditTrailPage({
        page,
        page_size: pageSize,
        resource_type: RESOURCE_TYPE_BY_ENTITY[entity],
        order,
        resource_id: entityId,
      }),
    placeholderData: keepPreviousData,
  });
}
