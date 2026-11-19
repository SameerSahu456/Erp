import type { QueryClient } from "@tanstack/react-query"

// Single source of truth for the per-entity detail-page relation-count query
// keys (the tab-count badges — notes/comments/tasks/quotes/MIs). The lead and
// deal detail queries and every child-relation mutation reference these so a
// create/delete refreshes the badges. Only leads and deals expose a `/stats`
// endpoint; accounts have `/accounts/{id}/stats` (tab counts).
export const leadEntityStatsKey = (id: string) =>
  ["crm", "leads", id, "entity-stats"] as const

export const accountEntityStatsKey = (id: string) =>
  ["crm", "accounts", "stats", id, "entity-stats"] as const

export const dealEntityStatsKey = (id: string) =>
  ["crm", "deals", "detail", id, "entity-stats"] as const

// Refresh the detail-page count badges after a child relation (note, comment,
// task, quote, material inquiry) is created or deleted. Also covers the account
// detail page, whose stats call counts addresses / contacts / deals / quotes /
// sales orders / notes.
//
// When the caller knows the parent (`entityType` + `entityId` — notes,
// comments, tasks), invalidate just that entity's stats query. When it
// doesn't (quotes / material inquiries are created via a payload without the
// parent in scope, or for a non-lead/deal entity type), fall back to
// invalidating every cached entity-stats query — cheap, because in practice
// only the open detail page has one.
export function invalidateEntityStats(
  qc: QueryClient,
  entity?: { type: string; id: string | null | undefined },
): void {
  if (entity?.id) {
    if (entity.type === "lead") {
      void qc.invalidateQueries({ queryKey: leadEntityStatsKey(entity.id) })
      return
    }
    if (entity.type === "account") {
      void qc.invalidateQueries({ queryKey: accountEntityStatsKey(entity.id) })
      return
    }
    if (entity.type === "deal") {
      void qc.invalidateQueries({ queryKey: dealEntityStatsKey(entity.id) })
      return
    }
  }
  void qc.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey.includes("entity-stats"),
  })
}
